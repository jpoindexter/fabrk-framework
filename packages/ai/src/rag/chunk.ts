export interface ChunkOptions {
  size?: number;
  overlap?: number;
  separator?: string;
}

export interface TextChunk {
  text: string;
  index: number;
  start: number;
  end: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): TextChunk[] {
  const { size = 512, overlap = 64, separator = "\n\n" } = opts;

  if (!text || !text.trim()) return [];
  if (text.length <= size) return [{ text, index: 0, start: 0, end: text.length }];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let splitAt = end;

    if (end < text.length) {
      const window = text.slice(start, end);
      const sepIdx = window.lastIndexOf(separator);
      if (sepIdx > overlap) {
        splitAt = start + sepIdx + separator.length;
      }
    }

    chunks.push({ text: text.slice(start, splitAt), index, start, end: splitAt });
    index++;

    const next = splitAt - overlap;
    start = next > start ? next : start + 1;
  }

  return chunks;
}
