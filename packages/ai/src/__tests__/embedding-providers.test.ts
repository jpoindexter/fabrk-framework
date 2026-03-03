import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AzureEmbeddingProvider } from '../embeddings/azure-embeddings'
import { CohereEmbeddingProvider } from '../embeddings/cohere-embeddings'
import { OllamaEmbeddingProvider } from '../embeddings/ollama-embeddings'
import { VoyageEmbeddingProvider } from '../embeddings/voyage-embeddings'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockError(status: number): Response {
  return new Response('error', { status })
}

// ---------------------------------------------------------------------------
// AzureEmbeddingProvider
// ---------------------------------------------------------------------------

describe('AzureEmbeddingProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('throws when baseUrl is absent', () => {
    expect(() => new AzureEmbeddingProvider()).toThrow(
      'AzureEmbeddingProvider requires baseUrl'
    )
  })

  it('does not throw when baseUrl is provided', () => {
    expect(
      () => new AzureEmbeddingProvider({ baseUrl: 'https://my.openai.azure.com' })
    ).not.toThrow()
  })

  it('embedBatch([]) returns []', async () => {
    const provider = new AzureEmbeddingProvider({ baseUrl: 'https://my.openai.azure.com' })
    const result = await provider.embedBatch([])
    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('embedBatch returns embeddings on success', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.1, 0.2] }] })
    )

    const provider = new AzureEmbeddingProvider({ baseUrl: 'https://my.openai.azure.com' })
    const result = await provider.embedBatch(['hello'])

    expect(result).toEqual([[0.1, 0.2]])
  })

  it('embed delegates to embedBatch and returns first element', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.1, 0.2] }] })
    )

    const provider = new AzureEmbeddingProvider({ baseUrl: 'https://my.openai.azure.com' })
    const result = await provider.embed('hello')

    expect(result).toEqual([0.1, 0.2])
  })

  it('throws on non-OK response with status code', async () => {
    fetchSpy.mockResolvedValueOnce(mockError(401))

    const provider = new AzureEmbeddingProvider({ baseUrl: 'https://my.openai.azure.com' })

    await expect(provider.embedBatch(['hello'])).rejects.toThrow(
      'Azure OpenAI embed error: 401'
    )
  })

  it('URL contains deployment path and api-version', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.5] }] })
    )

    const provider = new AzureEmbeddingProvider({
      baseUrl: 'https://my.openai.azure.com',
      model: 'text-embedding-3-small',
    })
    await provider.embedBatch(['test'])

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('/openai/deployments/text-embedding-3-small/embeddings')
    expect(calledUrl).toContain('api-version=2024-02-01')
  })
})

// ---------------------------------------------------------------------------
// CohereEmbeddingProvider
// ---------------------------------------------------------------------------

describe('CohereEmbeddingProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('embedBatch([]) returns []', async () => {
    const provider = new CohereEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embedBatch([])
    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('embedBatch returns embeddings on success', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ embeddings: { float: [[0.1], [0.2]] } })
    )

    const provider = new CohereEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embedBatch(['hello', 'world'])

    expect(result).toEqual([[0.1], [0.2]])
  })

  it('embed returns first element from embedBatch', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ embeddings: { float: [[0.9, 0.8]] } })
    )

    const provider = new CohereEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embed('hi')

    expect(result).toEqual([0.9, 0.8])
  })

  it('throws on non-OK response with status code', async () => {
    fetchSpy.mockResolvedValueOnce(mockError(429))

    const provider = new CohereEmbeddingProvider({ apiKey: 'test-key' })

    await expect(provider.embedBatch(['hello'])).rejects.toThrow(
      'Cohere embed error: 429'
    )
  })

  it('request body includes embedding_types: ["float"]', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ embeddings: { float: [[0.1]] } })
    )

    const provider = new CohereEmbeddingProvider({ apiKey: 'test-key' })
    await provider.embedBatch(['test'])

    const callInit = fetchSpy.mock.calls[0][1] as RequestInit
    const body = JSON.parse(callInit.body as string)
    expect(body.embedding_types).toEqual(['float'])
  })
})

// ---------------------------------------------------------------------------
// OllamaEmbeddingProvider
// ---------------------------------------------------------------------------

describe('OllamaEmbeddingProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('accepts localhost URL without throwing', () => {
    expect(
      () => new OllamaEmbeddingProvider({ baseUrl: 'http://localhost:11434' })
    ).not.toThrow()
  })

  it('throws on non-localhost IP URL (SSRF guard)', () => {
    expect(
      () => new OllamaEmbeddingProvider({ baseUrl: 'http://192.168.1.1:11434' })
    ).toThrow()
  })

  it('embed returns embeddings from embeddings[0] field', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ embeddings: [[0.5, 0.6]] })
    )

    const provider = new OllamaEmbeddingProvider()
    const result = await provider.embed('hello')

    expect(result).toEqual([0.5, 0.6])
  })

  it('embed falls back to embedding field when embeddings absent', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ embedding: [0.7] })
    )

    const provider = new OllamaEmbeddingProvider()
    const result = await provider.embed('hello')

    expect(result).toEqual([0.7])
  })

  it('throws on non-OK response with status and statusText', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('unavailable', { status: 503, statusText: 'Service Unavailable' })
    )

    const provider = new OllamaEmbeddingProvider()

    await expect(provider.embed('hello')).rejects.toThrow(
      'Ollama embedding error: 503 Service Unavailable'
    )
  })

  it('embedBatch processes 7 items with 2 batches of concurrency-5', async () => {
    // embedBatch loops in slices of 5, calling embed (fetch) for each item.
    // Each call must get a fresh Response — a single Response can only be
    // consumed once, so use mockImplementation instead of mockResolvedValue.
    fetchSpy.mockImplementation(() =>
      Promise.resolve(mockOk({ embeddings: [[0.1]] }))
    )

    const provider = new OllamaEmbeddingProvider()
    const texts = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const results = await provider.embedBatch(texts)

    // 7 items total → 7 fetch calls
    expect(fetchSpy).toHaveBeenCalledTimes(7)
    expect(results).toHaveLength(7)
  })
})

// ---------------------------------------------------------------------------
// VoyageEmbeddingProvider
// ---------------------------------------------------------------------------

describe('VoyageEmbeddingProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('embedBatch([]) returns []', async () => {
    const provider = new VoyageEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embedBatch([])
    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('embedBatch returns embeddings on success', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.3, 0.4] }] })
    )

    const provider = new VoyageEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embedBatch(['text'])

    expect(result).toEqual([[0.3, 0.4]])
  })

  it('embed returns first element from embedBatch', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.3, 0.4] }] })
    )

    const provider = new VoyageEmbeddingProvider({ apiKey: 'test-key' })
    const result = await provider.embed('hello')

    expect(result).toEqual([0.3, 0.4])
  })

  it('throws on non-OK response with status code', async () => {
    fetchSpy.mockResolvedValueOnce(mockError(403))

    const provider = new VoyageEmbeddingProvider({ apiKey: 'test-key' })

    await expect(provider.embedBatch(['hello'])).rejects.toThrow(
      'Voyage embed error: 403'
    )
  })

  it('request body includes input_type: "document"', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ data: [{ embedding: [0.1] }] })
    )

    const provider = new VoyageEmbeddingProvider({ apiKey: 'test-key' })
    await provider.embedBatch(['test'])

    const callInit = fetchSpy.mock.calls[0][1] as RequestInit
    const body = JSON.parse(callInit.body as string)
    expect(body.input_type).toBe('document')
  })
})
