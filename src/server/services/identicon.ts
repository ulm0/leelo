import { minidenticon } from 'minidenticons';

export class IdenticonGenerator {
  /**
   * Generate a data URI for an identicon based on user ID
   * Uses minidenticons library for lightweight, consistent generation
   */
  generateIdenticonDataUri(userId: string, saturation: number = 90, lightness: number = 50): string {
    // Generate SVG using minidenticons
    const svg = minidenticon(userId, saturation, lightness);
    
    // Convert to data URI
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate just the SVG string (useful for inline embedding)
   */
  generateIdenticonSvg(userId: string, saturation: number = 90, lightness: number = 50): string {
    return minidenticon(userId, saturation, lightness);
  }

  /**
   * Legacy method - now returns data URI instead of file path
   * Maintains compatibility with existing code
   */
  async generateIdenticon(userId: string): Promise<string> {
    return this.generateIdenticonDataUri(userId);
  }

  /**
   * Legacy method - no-op since we don't store files anymore
   */
  async deleteIdenticon(userId: string): Promise<void> {
    // No-op: identicons are generated on-demand, no files to delete
    console.log(`Identicon for ${userId} - no file to delete (generated on-demand)`);
  }

  /**
   * Legacy method - just generates a new data URI
   */
  async regenerateIdenticon(userId: string): Promise<string> {
    return this.generateIdenticonDataUri(userId);
  }
}

// Export singleton instance
export const identiconGenerator = new IdenticonGenerator();