export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function highlightKeyword(text, keyword, enabled) {
  text = String(text ?? '');
  if (!enabled) return escapeText(text);
  const cues = Array.isArray(keyword) ? keyword : [keyword];
  const matches = cues.filter(cue => typeof cue === 'string' && cue.trim()).map(cue => {
    const escaped = cue.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').exec(text);
  }).filter(Boolean);
  // Prefer the full phrase when cues overlap; never nest markup or repeat a cue.
  const ranges = [];
  for (const match of matches.sort((a, b) => b[0].length - a[0].length || a.index - b.index)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!ranges.some(range => start < range.end && end > range.start)) ranges.push({ start, end });
  }
  let cursor = 0;
  let html = '';
  for (const { start, end } of ranges.sort((a, b) => a.start - b.start)) {
    html += `${escapeText(text.slice(cursor, start))}<mark class="memory-keyword">${escapeText(text.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + escapeText(text.slice(cursor));
}
