// Paragraph-aware fixed-size chunking. No token counting, no library —
// character length is a good enough proxy at this scale.
export function chunkText(text, { size = 1000, overlap = 100 } = {}) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > size) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      current = tail ? `${tail}\n\n${para}` : para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }

    // A single paragraph longer than `size` still needs splitting on its own.
    while (current.length > size) {
      chunks.push(current.slice(0, size));
      current = current.slice(size - overlap);
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
