/**
 * Vector similarity functions
 *
 * Pure TypeScript implementations for cosine similarity, distance,
 * k-nearest-neighbors search, and centroid calculation.
 *
 * Extracted from wisp's embeddings package.
 */

import type { SimilarityResult } from './types'

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

/**
 * Calculate cosine distance between two vectors.
 * Returns a value between 0 and 2, where 0 means identical.
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b)
}

/**
 * Find k nearest neighbors by cosine similarity.
 *
 * @example
 * ```ts
 * const query = await embed('search query')
 * const results = findNearest(query, allVectors, 10, 0.5)
 * // results: [{ index: 3, similarity: 0.92 }, { index: 7, similarity: 0.88 }, ...]
 * ```
 */
export function findNearest(
  query: number[],
  vectors: number[][],
  k: number = 10,
  minSimilarity: number = 0
): SimilarityResult[] {
  const similarities = vectors.map((vec, index) => ({
    index,
    similarity: cosineSimilarity(query, vec),
  }))

  return similarities
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
}

/**
 * Calculate the centroid (average) of a set of vectors.
 * The result is L2-normalized.
 */
export function centroid(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null

  const dim = vectors[0].length
  const result = new Array(dim).fill(0)

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i]
    }
  }

  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length
  }

  // L2 normalize
  let norm = 0
  for (let i = 0; i < dim; i++) {
    norm += result[i] * result[i]
  }
  norm = Math.sqrt(norm)

  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      result[i] /= norm
    }
  }

  return result
}

/**
 * Jaccard similarity between two strings (word-level).
 * Useful for comparing reasoning steps or short texts.
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean))
  const set2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean))

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  if (union.size === 0) return 0
  return intersection.size / union.size
}
