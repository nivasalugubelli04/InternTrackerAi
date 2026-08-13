export interface IEmbeddingProvider {
  /**
   * The name of the model being used (e.g., 'text-embedding-3-small')
   */
  readonly modelName: string;

  /**
   * The dimension of the embeddings produced (e.g., 1536)
   */
  readonly dimension: number;

  /**
   * Generates an embedding vector for the given text
   * @param text The input text to embed
   * @returns An array of numbers representing the embedding
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates embedding vectors for multiple texts efficiently
   * @param texts Array of input texts
   * @returns Array of embedding vectors in the same order
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
