import Queue from 'better-queue';
import { PrismaClient } from '@prisma/client';
import { ContentExtractor } from './extractor.js';
import path from 'path';

interface ArticleExtractionJob {
  type: 'extract-article';
  data: {
    articleId: string;
    url: string;
    userId: string;
  };
}

type JobData = ArticleExtractionJob;

let queue: Queue<JobData>;
let prisma: PrismaClient;

export async function setupQueue(prismaClient: PrismaClient) {
  prisma = prismaClient;
  
  const assetsPath = process.env.ASSETS_PATH || path.join(process.cwd(), 'data', 'assets');
  const extractor = new ContentExtractor(assetsPath);

  queue = new Queue<JobData>(async (job: JobData, cb) => {
    try {
      console.log(`Processing job: ${job.type}`, job.data);
      
      switch (job.type) {
        case 'extract-article':
          await processArticleExtraction(job.data, extractor);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      cb(null, 'completed');
    } catch (error) {
      console.error('Job failed:', error);
      cb(error);
    }
  }, {
    concurrent: 2,
    maxRetries: 3,
    retryDelay: 5000,
  });

  // Handle job events
  queue.on('task_finish', (taskId, result) => {
    console.log(`Job ${taskId} completed:`, result);
  });

  queue.on('task_failed', (taskId, error) => {
    console.error(`Job ${taskId} failed:`, error);
  });

  console.log('✅ Queue setup completed');
}

async function processArticleExtraction(
  jobData: ArticleExtractionJob['data'],
  extractor: ContentExtractor
) {
  const { articleId, url, userId } = jobData;

  try {
    // Update article status to extracting
    await prisma.article.update({
      where: { id: articleId },
      data: { 
        extractionStatus: 'extracting',
        extractionError: null,
        updatedAt: new Date() 
      },
    });

    // Extract content
    const extracted = await extractor.extractFromUrl(url);

    // Update article with extracted content
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title: extracted.title,
        author: extracted.author,
        content: extracted.content,
        excerpt: extracted.excerpt,
        wordCount: extracted.wordCount,
        readingTime: extracted.readingTime,
        publishedAt: extracted.publishedAt,
        favicon: extracted.favicon,
        image: extracted.image,
        originalHtml: extracted.originalHtml,
        extractionStatus: 'completed',
        extractionError: null,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Successfully extracted article: ${extracted.title}`);
  } catch (error) {
    console.error(`❌ Failed to extract article ${articleId}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update article with error status
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title: 'Failed to extract',
        content: `<p>Failed to extract content from URL: ${url}</p><p>Error: ${errorMessage}</p>`,
        extractionStatus: 'failed',
        extractionError: errorMessage,
        updatedAt: new Date(),
      },
    });
    
    throw error;
  }
}

export function addJob(jobData: JobData): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!queue) {
      reject(new Error('Queue not initialized'));
      return;
    }

    queue.push(jobData, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function getQueueStats() {
  if (!queue) {
    return null;
  }

  return {
    length: (queue as any).length || 0,
    running: (queue as any).running || 0,
  };
}

export async function retryExtractionJob(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error('Article not found');
  }

  // Queue a new extraction job
  await addJob({
    type: 'extract-article',
    data: {
      articleId: article.id,
      url: article.url,
      userId: article.userId,
    },
  });
}

export async function cleanupStuckExtractions(): Promise<{ cleaned: number }> {
  // Find articles that have been "extracting" for more than 10 minutes
  const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  
  const stuckArticles = await prisma.article.findMany({
    where: {
      extractionStatus: 'extracting',
      updatedAt: {
        lt: stuckThreshold,
      },
    },
  });

  console.log(`Found ${stuckArticles.length} stuck extractions to cleanup`);

  // Reset them to failed status and reschedule
  for (const article of stuckArticles) {
    try {
      // Mark as failed first
      await prisma.article.update({
        where: { id: article.id },
        data: {
          extractionStatus: 'failed',
          extractionError: 'Extraction timeout - job was stuck',
          updatedAt: new Date(),
        },
      });

      // Reschedule extraction
      await retryExtractionJob(article.id);
      console.log(`Rescheduled stuck extraction for article ${article.id}`);
    } catch (error) {
      console.error(`Failed to reschedule article ${article.id}:`, error);
    }
  }

  return { cleaned: stuckArticles.length };
}