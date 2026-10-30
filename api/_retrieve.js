// Keyword (BM25) retrieval over the knowledge base built by _build/kb.js.
const chunks = require('./_kb.json');

const STOP = new Set('a an and are as at be by can do does for from has have how i in is it its me my of on or our so that the their this to us was we what when where which who why will with you your about tell more'.split(' '));

// Visitors often use the short names; expand them so they match page text.
const ALIASES = {
  g2g: 'green2gold',
  hfe: 'harm free emporium',
  eeg: 'environmental education group',
  regen: 'regen regenerative',
};

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .flatMap(w => (ALIASES[w] || w).split(' '))
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(w => w.length > 4 ? w.replace(/(ing|ers|ies|es|s)$/, '') : w);
}

const K1 = 1.4, B = 0.75;
const docs = chunks.map(c => tokenize(c.source + ' ' + c.text));
const avgLen = docs.reduce((n, d) => n + d.length, 0) / docs.length;
const df = new Map();
for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
const tfs = docs.map(d => {
  const m = new Map();
  for (const t of d) m.set(t, (m.get(t) || 0) + 1);
  return m;
});

function retrieve(query, k = 6) {
  const terms = [...new Set(tokenize(query))];
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
  return scored.slice(0, k).map(([, i]) => chunks[i]);
}

module.exports = { retrieve };
