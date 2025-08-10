import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export interface ExtractedArticle {
  title: string;
  author?: string;
  content: string;
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  publishedAt?: Date;
  favicon?: string;
  image?: string;
  originalHtml: string;
}

export class ContentExtractor {
  private assetsPath: string;

  constructor(assetsPath?: string) {
    this.assetsPath = assetsPath || path.join(process.cwd(), 'data', 'assets');
  }

  /**
   * Safely validates if a URL belongs to a specific domain
   * This prevents subdomain attacks and ensures proper domain validation
   */
  private isExactDomain(url: string, domain: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return hostname === domain || hostname.endsWith('.' + domain);
    } catch {
      return false;
    }
  }

  /**
   * Safely sanitizes HTML content by removing all HTML tags and entities
   * This prevents HTML injection vulnerabilities
   */
  private sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }
    
    // Remove HTML tags
    let sanitized = html.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    const htmlEntities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
      '&hellip;': '...',
      '&mdash;': '—',
      '&ndash;': '–',
      '&lsquo;': '\u2018', // Left single quotation mark
      '&rsquo;': '\u2019', // Right single quotation mark
      '&ldquo;': '\u201C', // Left double quotation mark
      '&rdquo;': '\u201D', // Right double quotation mark
    };
    
    // Replace HTML entities
    for (const [entity, replacement] of Object.entries(htmlEntities)) {
      sanitized = sanitized.replace(new RegExp(entity, 'gi'), replacement);
    }
    
    // Remove any remaining HTML entities (catch-all)
    sanitized = sanitized.replace(/&#?[a-zA-Z0-9]+;/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  async extractFromUrl(url: string): Promise<ExtractedArticle> {
    try {
      // Fetch the HTML content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Leelo/1.0; +https://github.com/leelo)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return this.extractFromHtml(html, url);
    } catch (error) {
      console.error('Error extracting from URL:', error);
      throw error;
    }
  }

  async extractFromHtml(html: string, baseUrl?: string): Promise<ExtractedArticle> {
    try {
      // Parse HTML with JSDOM
      const dom = new JSDOM(html, { url: baseUrl });
      const document = dom.window.document;

      // Use Readability to extract main content
      const reader = new Readability(document);
      const article = reader.parse();

      let title: string;
      let author: string | undefined;
      let excerpt: string | undefined;
      let content: string;

      if (article) {
        // Successful extraction
        title = article.title || this.extractTitle(document);
        author = article.byline || this.extractAuthor(document);
        excerpt = article.excerpt || (article.content ? this.extractExcerpt(article.content) : undefined);
        content = article.content || '';
      } else {
        // Fallback when Readability fails (e.g., video pages, single-page apps)
        title = this.extractTitle(document);
        author = this.extractAuthor(document);
        
        // Try to extract description from meta tags
        const description = this.extractDescription(document);
        excerpt = description;
        
        // Create basic content with available metadata
        content = this.createFallbackContent(title, description, baseUrl);
      }

      const publishedAt = this.extractPublishedDate(document);
      const favicon = this.extractFavicon(document, baseUrl);
      const image = await this.extractAndOptimizeImage(document, baseUrl);

      // Calculate reading time (assuming 200 words per minute)
      const wordCount = this.countWords(article?.textContent || this.sanitizeHtml(content));
      const readingTime = Math.ceil(wordCount / 200);

      // Process images in content
      const processedContent = await this.processImagesInContent(content, baseUrl);

      return {
        title,
        author,
        content: processedContent,
        excerpt,
        wordCount,
        readingTime,
        publishedAt,
        favicon,
        image,
        originalHtml: html,
      };
    } catch (error) {
      console.error('Error extracting from HTML:', error);
      throw error;
    }
  }

  private extractTitle(document: Document): string {
    // Try different selectors for title
    const selectors = [
      'h1',
      '[property="og:title"]',
      '[name="twitter:title"]',
      'title',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return 'Untitled Article';
  }

  private extractAuthor(document: Document): string | undefined {
    // Try different selectors for author
    const selectors = [
      '[property="article:author"]',
      '[name="author"]',
      '[property="og:article:author"]',
      '.author',
      '.byline',
      '[rel="author"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  private extractExcerpt(content: string): string | undefined {
    // Safely sanitize HTML content to prevent injection vulnerabilities
    const plainText = this.sanitizeHtml(content);
    
    if (plainText.length > 200) {
      return plainText.substring(0, 200) + '...';
    }
    return plainText || undefined;
  }

  private extractPublishedDate(document: Document): Date | undefined {
    const selectors = [
      '[property="article:published_time"]',
      '[property="og:article:published_time"]',
      '[name="pubdate"]',
      'time[datetime]',
      '.published',
      '.date',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const dateStr = element.getAttribute('content') || 
                       element.getAttribute('datetime') || 
                       element.textContent;
        
        if (dateStr) {
          const date = new Date(dateStr.trim());
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return undefined;
  }

  private extractFavicon(document: Document, baseUrl?: string): string | undefined {
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const href = element.getAttribute('href');
        if (href) {
          return this.resolveUrl(href, baseUrl);
        }
      }
    }

    // Fallback to /favicon.ico
    if (baseUrl) {
      try {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}/favicon.ico`;
      } catch {
        // Invalid base URL
      }
    }

    return undefined;
  }

  private async extractAndOptimizeImage(document: Document, baseUrl?: string): Promise<string | undefined> {
    const selectors = [
      '[property="og:image"]',
      '[name="twitter:image"]',
      'article img',
      '.featured-image img',
      'img',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const src = element.getAttribute('content') || element.getAttribute('src');
        if (src) {
          const imageUrl = this.resolveUrl(src, baseUrl);
          try {
            return await this.downloadAndOptimizeImage(imageUrl);
          } catch (error) {
            console.error('Failed to download image:', error);
            continue;
          }
        }
      }
    }

    return undefined;
  }

  private async processImagesInContent(content: string, baseUrl?: string): Promise<string> {
    // Use regex to find all img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let processedContent = content;
    
    const matches = [...content.matchAll(imgRegex)];
    
    for (const match of matches) {
      const fullImgTag = match[0];
      const src = match[1];
      
      try {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        const optimizedPath = await this.downloadAndOptimizeImage(absoluteUrl);
        
        if (optimizedPath) {
          // Replace the src with the optimized version
          const newImgTag = fullImgTag.replace(src, `/assets/${optimizedPath}`);
          processedContent = processedContent.replace(fullImgTag, newImgTag);
        }
      } catch (error) {
        console.error('Failed to process image in content:', error);
        // Keep original image if optimization fails
      }
    }
    
    return processedContent;
  }

  private async downloadAndOptimizeImage(imageUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Generate a unique filename based on URL hash
      const hash = createHash('md5').update(imageUrl).digest('hex');
      const filename = `${hash}.webp`;
      const filepath = path.join(this.assetsPath, filename);

      // Optimize image with sharp
      await sharp(buffer)
        .resize(800, 600, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .webp({ quality: 80 })
        .toFile(filepath);

      return filename;
    } catch (error) {
      console.error('Failed to download and optimize image:', error);
      return undefined;
    }
  }

  private resolveUrl(url: string, baseUrl?: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (baseUrl) {
      try {
        return new URL(url, baseUrl).href;
      } catch {
        // Invalid URL
      }
    }
    
    return url;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private extractDescription(document: Document): string | undefined {
    // Try different selectors for description
    const selectors = [
      '[property="og:description"]',
      '[name="description"]',
      '[name="twitter:description"]',
      '[property="description"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content');
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  private createFallbackContent(title: string, description?: string, baseUrl?: string): string {
    const domain = baseUrl ? this.extractDomain(baseUrl) : 'this page';
    
    let content = `<div class="fallback-content">`;
    content += `<h1>${title}</h1>`;
    
    if (description) {
      content += `<p class="description">${description}</p>`;
    }
    
    // Add a note about the content type
    if (baseUrl && (this.isExactDomain(baseUrl, 'youtube.com') || this.isExactDomain(baseUrl, 'youtu.be'))) {
      content += `<p class="content-note"><strong>This is a YouTube video.</strong> Visit the link to watch the video.</p>`;
    } else if (baseUrl && (this.isExactDomain(baseUrl, 'twitter.com') || this.isExactDomain(baseUrl, 'x.com'))) {
      content += `<p class="content-note"><strong>This is a social media post.</strong> Visit the link to see the full post and comments.</p>`;
    } else {
      content += `<p class="content-note"><strong>Content could not be extracted automatically.</strong> This might be a dynamic page, video, or other media. Visit the link to view the full content.</p>`;
    }
    
    content += `<p class="source">Source: <a href="${baseUrl}" target="_blank" rel="noopener noreferrer">${domain}</a></p>`;
    content += `</div>`;
    
    return content;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}