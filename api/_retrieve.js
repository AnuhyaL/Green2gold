// Keyword (BM25) retrieval over the knowledge base built by _build/kb.js.
const chunks = require('./_kb.json');

const STOP = new Set('a an and are as at be by can do does for from has have how i in is it its me my of on or our so that the their this to us was we what when where which who why will with you your about tell more there any some get'.split(' '));

// Short names visitors use, expanded so they match page text (applied to page text too).
const ALIASES = {
  g2g: 'green2gold',
  hfe: 'harm free emporium',
  eeg: 'environmental education group',
  wri: 'world responsible industries',
  coventure: 'co venture',
  coventuring: 'co venture',
};

// Question words that page text rarely uses, mapped to words it does (query only).
const SYNONYMS = [
  [/\b(found|founded|founder|founders|started|start|establish|established|origin|history|old)\b/, 'history since 1970 founded'],
  [/\b(where|located|location|address|office|based|headquarter|headquarters)\b/, 'address lahaina hawaii contact'],
  [/\b(cost|costs|price|prices|pricing|fee|fees|pay|expensive|cheap|much)\b/, 'price cost membership compare'],
  [/\b(donate|donation|donations|give|giving|contribute|sponsor|fund)\b/, 'donation support'],
  [/\b(contact|phone|call|email|reach|talk|speak|number)\b/, 'contact phone email'],
  [/\b(join|signup|sign|register|enroll|member|membership)\b/, 'member membership join'],
  [/\b(program|programs|offer|offers|services|service|help)\b/, 'program pathway'],
  [/\b(leader|leaders|leadership|director|team|staff|run|runs|chairman|ceo)\b/, 'leadership director'],
  [/\b(vendor|vendors|sell|seller|marketplace|shop|products)\b/, 'harm free emporium marketplace'],
];

// Lowercase, expand aliases, drop stop words, and add a 5-letter stem for longer words
// so donate/donation, member/membership and invent/inventor/invention all match, while
// the full word still gives exact names like PatentSaver or TikaKnows the extra weight.
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .flatMap(w => (ALIASES[w] || w).split(' '))
    .filter(w => w.length > 1 && !STOP.has(w))
    .flatMap(w => w.length > 5 ? [w.slice(0, 5), w] : [w]);
}

function expandQuery(q) {
  const lower = q.toLowerCase();
  return q + ' ' + SYNONYMS.filter(([re]) => re.test(lower)).map(([, extra]) => extra).join(' ');
}

const K1 = 1.4, B = 0.75;
// The section title counts three times so a heading match outranks a passing mention.
const docs = chunks.map(c => tokenize(`${c.source} ${c.source} ${c.source} ${c.text}`));
const avgLen = docs.reduce((n, d) => n + d.length, 0) / docs.length;
const df = new Map();
for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
const tfs = docs.map(d => {
  const m = new Map();
  for (const t of d) m.set(t, (m.get(t) || 0) + 1);
  return m;
});

function retrieve(query, k = 8) {
  const terms = [...new Set(tokenize(expandQuery(query)))];
  const scored = tfs.map((tf, i) => {
    let s = 0;
    for (const t of terms) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * docs[i].length / avgLen));
    }
    return [s, i];
  }).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
  // Skip near-duplicate sections (same page section) so the slots cover more ground.
  const seen = new Set(), out = [];
  for (const [, i] of scored) {
    const key = chunks[i].url + '|' + chunks[i].text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunks[i]);
    if (out.length === k) break;
  }
  return out;
}

module.exports = { retrieve };
