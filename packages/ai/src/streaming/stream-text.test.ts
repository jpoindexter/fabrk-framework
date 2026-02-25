import { describe, it, expect, vi } from 'vitest'
import {
  streamToString,
  parseStreamChunks,
  createTextStream,
  concatStreams,
  transformStream,
} from './stream-text'

describe('streamToString', () => {
  it('should collect all chunks into a string', async () => {
    const stream = createTextStream('Hello, world!', { chunkSize: 5 })
    const result = await streamToString(stream)
    expect(result).toBe('Hello, world!')
  })

  it('should handle empty text', async () => {
    const stream = createTextStream('')
    const result = await streamToString(stream)
    expect(result).toBe('')
  })
})

describe('parseStreamChunks', () => {
  it('should call onChunk for each chunk', async () => {
    const onChunk = vi.fn()
    const stream = createTextStream('abcdef', { chunkSize: 2 })

    await parseStreamChunks(stream, { onChunk })

    expect(onChunk).toHaveBeenCalledTimes(3)
    expect(onChunk).toHaveBeenCalledWith('ab', 'ab')
    expect(onChunk).toHaveBeenCalledWith('cd', 'abcd')
    expect(onChunk).toHaveBeenCalledWith('ef', 'abcdef')
  })

  it('should call onDone with full text', async () => {
    const onDone = vi.fn()
    const stream = createTextStream('Hello', { chunkSize: 5 })

    await parseStreamChunks(stream, { onDone })

    expect(onDone).toHaveBeenCalledWith('Hello')
  })

  it('should return accumulated text', async () => {
    const stream = createTextStream('Result', { chunkSize: 3 })
    const result = await parseStreamChunks(stream, {})
    expect(result).toBe('Result')
  })

  it('should call onError and rethrow on stream error', async () => {
    const onError = vi.fn()
    async function* failingStream() {
      yield 'ok'
      throw new Error('stream broke')
    }

    await expect(
      parseStreamChunks(failingStream(), { onError })
    ).rejects.toThrow('stream broke')

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('createTextStream', () => {
  it('should create a stream with specified chunk size', async () => {
    const chunks: string[] = []
    const stream = createTextStream('1234567890', { chunkSize: 3 })

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['123', '456', '789', '0'])
  })

  it('should support delay between chunks', async () => {
    const start = Date.now()
    const stream = createTextStream('ab', { chunkSize: 1, delayMs: 50 })

    for await (const _ of stream) {
      // consume
    }

    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(80) // ~2 chunks * 50ms
  })
})

describe('concatStreams', () => {
  it('should concatenate multiple streams sequentially', async () => {
    const s1 = createTextStream('Hello', { chunkSize: 5 })
    const s2 = createTextStream(' World', { chunkSize: 6 })

    let result = ''
    for await (const chunk of concatStreams(s1, s2)) {
      result += chunk
    }

    expect(result).toBe('Hello World')
  })
})

describe('transformStream', () => {
  it('should transform each chunk', async () => {
    const stream = createTextStream('abc', { chunkSize: 1 })
    const transformed = transformStream(stream, (c) => c.toUpperCase())

    let result = ''
    for await (const chunk of transformed) {
      result += chunk
    }

    expect(result).toBe('ABC')
  })
})
