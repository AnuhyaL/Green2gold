// Local preview: serves the static site and runs api/chat.js the way Vercel does.
// Usage: npm run dev   (reads GROQ_API_KEY from .env if that file exists)
const http = require('http');
const fs = require('fs');
const path = require('path');
const chat = require('./api/chat');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/chat') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { req.body = JSON.parse(raw || 'null'); } catch { req.body = null; }
      chat(req, res);
    });
    return;
  }
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || /[\\/](_build|api|node_modules)([\\/]|$)|[\\/]\./.test(file.slice(ROOT.length))) {
    res.statusCode = 404;
    return res.end('Not found');
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Green2Gold site: http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) console.log('Note: GROQ_API_KEY is not set, so Ollie will not be able to answer. Add it to the .env file.');
});
