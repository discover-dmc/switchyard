// ponytail: rule-based entity extraction. No NLP dependency — multi-word
// capitalized phrases and inline `code` spans as candidates. Upgrade path is
// LLM-assisted extraction if this proves too noisy on real content.
const CAPITALIZED_PHRASE = /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)+)\b/g;
const INLINE_CODE = /`([^`\n]+)`/g;
// Sentence-initial articles/determiners get swept into a match when they
// directly precede a real proper noun (e.g. "The Redis TCP Proxy") — strip
// them rather than mis-tag "The" as part of the entity name.
const LEADING_STOPWORD = /^(The|A|An|This|That|These|Those|It|Its)\s+/;

export function extractEntities(text) {
  const seen = new Map();

  for (const match of text.matchAll(CAPITALIZED_PHRASE)) {
    let name = match[1].trim();
    name = name.replace(LEADING_STOPWORD, '');
    if (name.includes(' ') && !seen.has(name)) seen.set(name, { name, entity_type: 'concept' });
  }

  for (const match of text.matchAll(INLINE_CODE)) {
    const name = match[1].trim();
    if (name && !seen.has(name)) seen.set(name, { name, entity_type: 'tool' });
  }

  return [...seen.values()];
}
