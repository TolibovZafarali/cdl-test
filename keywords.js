export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function highlightKeyword(text, keyword, enabled) {
  if (!enabled || typeof keyword !== 'string' || !keyword || /\s/.test(keyword)) return escapeText(text);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').exec(text);
  if (!match) return escapeText(text);
  return `${escapeText(text.slice(0, match.index))}<mark class="memory-keyword">${escapeText(match[0])}</mark>${escapeText(text.slice(match.index + match[0].length))}`;
}
