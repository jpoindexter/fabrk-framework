export function generateHexFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  return (
    '0x' +
    Math.abs(hash % 256)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0')
  );
}
