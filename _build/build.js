// Builds the static Green2Gold site.
// Each file in _build/pages/ starts with a JSON header comment:
//   <!--{"title": "...", "description": "...", "nav": "about"}-->
// and is wrapped in the shared layout below, then written to the site root.
// Usage: node _build/build.js
const fs = require('fs');
const path = require('path');
const { buildKb } = require('./kb');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(__dirname, 'pages');
const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'content.json'), 'utf8'));

const EEG_URL = 'https://environmental-education-group.vercel.app/';
const HFE_URL = 'https://harm-free-emporium.vercel.app/';
const PHONE = '805.735.7261';
const EMAIL = 'alan@green2gold.org';
const MAP_URL = 'https://www.google.com/maps/place/6095+Napilihau+St+109b+383,+Lahaina,+HI+96761/@20.9854504,-156.6689734,17z/data=!3m1!4b1!4m5!3m4!1s0x7eaad454b8b1f777:0x71135ce4fd9b2f61!8m2!3d20.9854504!4d-156.6663985';

// Links on the original site that now 404 (or pointed at old WordPress paths) -> new homes
const LINK_FIXES = [
  [/https?:\/\/(www\.)?green2gold\.org\/invent-the-future\/new-q-a-about-green2gold-and-world-responsible-industries/g, 'resources.html#faq-green2gold'],
  [/https?:\/\/(www\.)?green2gold\.org\/invent-the-future\/faq-about/g, 'resources.html#faq-coventure'],
  [/https?:\/\/(www\.)?green2gold\.org\/world-responsible-industries(-overview)?/g, 'resources.html#faq-coventure'],
  [/http:\/\/join\.green2gold\.org\/?/g, 'programs.html'],
];

const initiatives = [
  ['Environmental Education Group (EEG)', EEG_URL, true],
  ['Harm-Free Emporium', HFE_URL, true],
  ['Regen Global Alliance', 'initiative-regen-global.html'],
  ['Regenerative Media', 'initiative-regenerative-media.html'],
  ['Build Back Green', 'initiative-build-back-green.html'],
  ['GreenTech Micro-Manufacturing Hub', 'initiative-greentech-hub.html'],
  ['Global Transition to Sustainability Center', 'initiative-transition-center.html'],
  ['Lifecube Emergency Shelter', 'initiative-lifecube.html'],
  ['EarthCoin & Capstone', 'initiative-earthcoin.html'],
];

const navItems = [
  ['home', 'Home', 'index.html'],
  ['about', 'About', 'about.html'],
  ['programs', 'Programs & Pathways', 'programs.html'],
  ['initiatives', 'Our Initiatives', 'initiatives.html', initiatives],
  ['resources', 'Research & Resources', 'resources.html'],
  ['media', 'Media & Stories', 'media.html'],
  ['impact', 'Impact & Community', 'impact.html'],
  ['involved', 'Get Involved', 'get-involved.html'],
  ['contact', 'Contact', 'contact.html'],
];

const extAttrs = 'target="_blank" rel="noopener"';

function nav(active) {
  const li = navItems.map(([key, label, href, sub]) => {
    const cur = key === active ? ' aria-current="page"' : '';
    const cls = key === 'involved' ? ' class="cta-link"' : '';
    if (!sub) return `<li><a href="${href}"${cur}${cls}>${label}</a></li>`;
    const subLi = [`<li><a href="${href}">All initiatives</a></li>`]
      .concat(sub.map(([l, h, ext]) => `<li><a href="${h}"${ext ? ` class="ext" ${extAttrs}` : ''}>${l}</a></li>`))
      .join('');
    return `<li class="has-sub"><a href="${href}"${cur}>${label}</a><ul>${subLi}</ul></li>`;
  });
  return `<ul>${li.join('')}</ul>`;
}

const icons = {
  facebook: '<path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/>',
  x: '<path d="M17.5 3h3.3l-7.2 8.2L22 21h-6.6l-5.2-6.7L4.3 21H1l7.7-8.8L1 3h6.8l4.7 6.2L17.5 3zm-1.2 16h1.8L7.2 4.9H5.3L16.3 19z"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5z"/>',
  youtube: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9l5.7 3.1-5.7 3.1z"/>',
};
const social = [
  ['Facebook', 'https://www.facebook.com/GOGREEN2GOLD/?ref=aymt_homepage_panel', 'facebook'],
  ['Twitter / X', 'https://twitter.com/GOGREEN2GOLD', 'x'],
  ['LinkedIn', 'https://www.linkedin.com/in/alan-tratner-1848a12', 'linkedin'],
  ['YouTube', 'https://www.youtube.com/channel/UCCOxHf89Bd1WFrh7qAF0TWg', 'youtube'],
];
const socialHtml = '<div class="social">' + social.map(([l, h, i]) =>
  `<a href="${h}" ${extAttrs} aria-label="${l}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[i]}</svg></a>`).join('') + '</div>';

function layout(meta, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}${meta.nav === 'home' ? '' : ' | Green2Gold'}</title>
<meta name="description" content="${meta.description}">
<link rel="icon" href="assets/img/GREEN2GOLD_NEWLOGO-1.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="container">
  <span>A 501(c)(3) nonprofit impact incubator since 1970</span>
  <span>Questions? Call <a href="tel:8057357261">${PHONE}</a> · <a href="mailto:${EMAIL}">${EMAIL}</a></span>
</div></div>
<header class="site-header"><div class="container">
  <a class="logo" href="index.html" aria-label="Green2Gold home"><img src="assets/img/GREEN2GOLD_NEWLOGO-1.png" alt="Green2Gold Logo" width="200" height="52"></a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav">☰ Menu</button>
  <nav class="main-nav" id="main-nav" aria-label="Main">${nav(meta.nav)}</nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-footer"><div class="container">
  <div class="footer-grid">
    <div>
      <a class="footer-logo" href="index.html"><img src="assets/img/GREEN2GOLD_NEWLOGO-1.png" alt="Green2Gold Logo"></a>
      <p>Green2Gold is a pioneering impact incubator since 1970 and a 501(c)(3) nonprofit, helping inventors, entrepreneurs and nonprofits turn great ideas into world-helping success.</p>
      ${socialHtml}
    </div>
    <div>
      <h4>Organization</h4>
      <ul>
        <li><a href="about.html">About Green2Gold</a></li>
        <li><a href="about.html#history">History</a></li>
        <li><a href="programs.html">Join Here</a></li>
        <li><a href="impact.html#testimonials">Testimonials</a></li>
        <li><a href="resources.html#blog">Blog</a></li>
        <li><a href="media.html#newsletters">Newsletters</a></li>
      </ul>
    </div>
    <div>
      <h4>Initiatives</h4>
      <ul>
        <li><a href="${EEG_URL}" ${extAttrs}>Environmental Education Group</a></li>
        <li><a href="${HFE_URL}" ${extAttrs}>Harm-Free Emporium</a></li>
        <li><a href="initiative-regen-global.html">Regen Global Alliance</a></li>
        <li><a href="initiative-regenerative-media.html">Regenerative Media</a></li>
        <li><a href="initiative-build-back-green.html">Build Back Green</a></li>
        <li><a href="initiatives.html">All initiatives</a></li>
      </ul>
    </div>
    <div>
      <h4>Contact</h4>
      <ul>
        <li><a href="${MAP_URL}" ${extAttrs}>Green2Gold, 5095 Napilihau St 109b 383, Lahaina, HI 96761</a></li>
        <li><a href="tel:8057357261">${PHONE}</a></li>
        <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
        <li><a href="contact.html">Contact form</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${new Date().getFullYear()} GREEN2GOLD. All Rights Reserved.</span>
    <span><a href="privacy-policy.html">Privacy Policy</a> · <a href="terms-of-use.html">Terms of Use</a></span>
  </div>
</div></footer>
<script src="assets/js/main.js"></script>
<script src="assets/js/ollie.js" defer></script>
</body>
</html>
`;
}

function fill(body) {
  body = body.replace(/\{\{content:([\w.-]+)\}\}/g, (_, key) => {
    if (!(key in content)) throw new Error('Missing content key: ' + key);
    return content[key];
  });
  body = body.replace(/\{\{EEG_URL\}\}/g, EEG_URL).replace(/\{\{HFE_URL\}\}/g, HFE_URL)
    .replace(/\{\{EXT\}\}/g, extAttrs).replace(/\{\{MAP_URL\}\}/g, MAP_URL);
  for (const [re, to] of LINK_FIXES) body = body.replace(re, to);
  return body;
}

let count = 0;
const built = [];
for (const file of fs.readdirSync(PAGES).filter(f => f.endsWith('.html'))) {
  const raw = fs.readFileSync(path.join(PAGES, file), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error('Missing JSON header in ' + file);
  const meta = JSON.parse(m[1]);
  fs.writeFileSync(path.join(ROOT, file), layout(meta, fill(raw.slice(m[0].length))));
  built.push(file);
  count++;
}
console.log(`Built ${count} pages.`);

// Knowledge base for Ollie, the site chatbot (api/chat.js)
console.log(`Knowledge base: ${buildKb(ROOT, built, path.join(ROOT, 'api', '_kb.json'))} chunks.`);
