/**
 * Tests for vector similarity functions
 */
 

import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  cosineDistance,
  findNearest,
  centroid,
  jaccardSimilarity,
} from './similarity'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0)
  })

  it('handles zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
  })

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('dimension mismatch')
  })

  it('computes correct similarity for arbitrary vectors', () => {
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    // dot = 32, normA = sqrt(14), normB = sqrt(77)
    const expected = 32 / (Math.sqrt(14) * Math.sqrt(77))
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected)
  })
})

describe('cosineDistance', () => {
  it('returns 0 for identical vectors', () => {
    expect(cosineDistance([1, 2, 3], [1, 2, 3])).toBeCloseTo(0.0)
  })

  it('returns 1 for orthogonal vectors', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1.0)
  })
})

describe('findNearest', () => {
  it('returns top-k most similar vectors', () => {
    const query = [1, 0, 0]
    const vectors = [
      [1, 0, 0],    // identical
      [0, 1, 0],    // orthogonal
      [0.9, 0.1, 0], // very similar
      [-1, 0, 0],   // opposite
    ]

    const results = findNearest(query, vectors, 2)
    expect(results).toHaveLength(2)
    expect(results[0].index).toBe(0) // identical
    expect(results[1].index).toBe(2) // very similar
  })

  it('filters by minimum similarity', () => {
    const query = [1, 0]
    const vectors = [[1, 0], [0, 1], [-1, 0]]

    const results = findNearest(query, vectors, 10, 0.5)
    expect(results).toHaveLength(1)
    expect(results[0].index).toBe(0)
  })

  it('returns empty for no matches above threshold', () => {
    const query = [1, 0]
    const vectors = [[0, 1], [-1, 0]]

    const results = findNearest(query, vectors, 10, 0.9)
    expect(results).toHaveLength(0)
  })
})

describe('centroid', () => {
  it('returns null for empty array', () => {
    expect(centroid([])).toBeNull()
  })

  it('returns normalized single vector', () => {
    const result = centroid([[3, 4]])!
    const norm = Math.sqrt(3 * 3 + 4 * 4) // 5
    expect(result[0]).toBeCloseTo(3 / norm)
    expect(result[1]).toBeCloseTo(4 / norm)
  })

  it('computes average and normalizes', () => {
    const result = centroid([[1, 0], [0, 1]])!
    // Average: [0.5, 0.5], norm = sqrt(0.5), normalized: [0.707, 0.707]
    const norm = Math.sqrt(0.5)
    expect(result[0]).toBeCloseTo(0.5 / norm)
    expect(result[1]).toBeCloseTo(0.5 / norm)
  })
})

describe('jaccardSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBeCloseTo(1.0)
  })

  it('returns 0 for completely different strings', () => {
    expect(jaccardSimilarity('foo bar', 'baz qux')).toBeCloseTo(0.0)
  })

  it('handles partial overlap', () => {
    const result = jaccardSimilarity('hello world foo', 'hello world bar')
    // set1: {hello, world, foo}, set2: {hello, world, bar}
    // intersection: {hello, world} = 2, union: {hello, world, foo, bar} = 4
    expect(result).toBeCloseTo(0.5)
  })

  it('is case-insensitive', () => {
    expect(jaccardSimilarity('Hello World', 'hello world')).toBeCloseTo(1.0)
  })

  it('returns 0 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(0)
  })
})
