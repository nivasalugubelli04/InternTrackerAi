import { Injectable } from '@nestjs/common';

@Injectable()
export class NlpPreprocessingService {
  /**
   * Cleans text by normalizing whitespace, lowercasing, and removing basic punctuation.
   */
  normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Replace punctuation (except hyphens) with space
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Generates a hash for a given text to check if content changed.
   */
  generateInputHash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(this.normalizeText(text)).digest('hex');
  }

  /**
   * Very basic stopword removal. 
   * CAUTION: We don't want to remove technical terms that happen to be stopwords in some contexts (like "Go" or "C").
   */
  removeStopwords(text: string): string {
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'of', 'for', 'to', 'with', 'as', 'by'
    ]);
    
    return text
      .split(' ')
      .filter((word) => !stopwords.has(word))
      .join(' ');
  }
}
