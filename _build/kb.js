// Builds the knowledge base Ollie (the site chatbot) retrieves from.
// Splits the <main> content of each built page into sections at headings and
// FAQ <details>, strips the markup, and records the page title and the nearest
// anchor so every chunk can be cited with a real page link.
const fs = require('fs');
const path = require('path');

const MAX_CHARS = 1500;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', middot: '·' };

function toText(html) {
  return html
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\s[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(p|li|h\d|summary|div|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|\w+);/g, (m, e) => e[0] === '#' ? String.fromCharCode(+e.slice(1)) : (ENTITIES[e] ?? m))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

// Split long sections on paragraph breaks so each chunk stays retrievable.
function splitLong(text) {
  if (text.length <= MAX_CHARS) return [text];
  const out = [];
  let cur = '';
  for (const para of text.split('\n')) {
    if (cur && cur.length + para.length > MAX_CHARS) { out.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + para;
  }
  if (cur) out.push(cur);
  return out;
}

function chunkPage(file, html) {
  const title = file === 'index.html' ? 'Home' : (html.match(/<title>([^<]*)<\/title>/) || [, file])[1].replace(/ \| Green2Gold$/, '');
  // Drop inline SVG first so icon and symbol ids are never mistaken for page anchors.
  const main = (html.match(/<main[^>]*>([\s\S]*)<\/main>/) || [, ''])[1].replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // Cut before every h2/h3 and FAQ item; remember the last id seen before each cut.
  const cuts = [...main.matchAll(/<(h2|h3|details)\b/gi)].map(m => m.index);
  const bounds = [0, ...cuts, main.length];
  const chunks = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const part = main.slice(bounds[i], bounds[i + 1]);
    const ids = [...main.slice(0, bounds[i] + 200).matchAll(/\sid="([^"]+)"/g)];
    const anchor = ids.length ? ids[ids.length - 1][1] : '';
    const heading = toText((part.match(/<(h2|h3|summary)[^>]*>([\s\S]*?)<\/\1>/i) || [, , ''])[2]);
    const text = toText(part);
    if (text.length < 40) continue;
    for (const piece of splitLong(text)) {
      chunks.push({
        source: heading ? `Green2Gold — ${title} — ${heading}` : `Green2Gold — ${title}`,
        url: anchor && anchor !== 'main' ? `${file}#${anchor}` : file,
        text: piece,
      });
    }
  }
  return chunks;
}

function buildKb(root, files, outFile) {
  const chunks = files.flatMap(f => chunkPage(f, fs.readFileSync(path.join(root, f), 'utf8')));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(chunks));
  return chunks.length;
}

module.exports = { buildKb };
