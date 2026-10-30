// Ollie — Green2Gold chat assistant widget. Talks to /api/chat (api/chat.js).
(function () {
  var WELCOME = "Hi! I'm Ollie, your Green2Gold AI assistant.\n\n" +
    'I can help you explore Green2Gold, discover Harm-Free Emporium, learn about the Environmental Education Group, and find information about our programs and initiatives.\n\n' +
    'What would you like to know?';
  var SUGGESTIONS = ['What is Green2Gold?', 'How can I become a member?', 'What is Harm-Free Emporium?', 'What is EEG?'];
  var STORE = 'ollie-chat';

  // The conversation follows the visitor from page to page within the tab.
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { history = []; }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (e) { /* storage unavailable */ } }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Small Markdown subset: paragraphs, bullet/numbered lists, bold, italics, and safe links.
  function fmt(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  }
  function link(url, html) {
    var ext = /^https?:\/\//.test(url);
    if (!ext && !/^(mailto:|tel:|[\w-]+\.html(#[\w-]+)?$)/.test(url)) return html;
    return '<a href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + html + '</a>';
  }
  var TOKENS = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)<]*[^\s)<.,;:!?])|\b([\w-]+\.html(?:#[\w-]+)?)/g;
  function inline(s) {
    // Page links sometimes come back with the old domain in front; keep them on this site.
    s = s.replace(/https?:\/\/(www\.)?green2gold\.org\/([\w-]+\.html(#[\w-]+)?)/g, '$2');
    // Some models cite as 【page.html#id】 or 【Source: …】; show those as a short link or plain note.
    s = s.replace(/\s*【([^】]+)】/g, function (m, x) {
      return /^[\w-]+\.html(#[\w-]+)?$/.test(x) ? ' ([source](' + x + '))' : ' (' + x + ')';
    });
    var out = '', last = 0, m;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(s))) {
      out += fmt(s.slice(last, m.index));
      out += m[1] ? link(m[2], fmt(m[1])) : link(m[3] || m[4], esc(m[3] || m[4]));
      last = TOKENS.lastIndex;
    }
    return out + fmt(s.slice(last));
  }
  function render(md) {
    var out = [], list = null;
    md.split('\n').forEach(function (line) {
      var b = line.match(/^\s*[-*•]\s+(.*)/), n = line.match(/^\s*\d+[.)]\s+(.*)/);
      var item = b || n;
      if (item) {
        var tag = b ? 'ul' : 'ol';
        if (list !== tag) { if (list) out.push('</' + list + '>'); out.push('<' + tag + '>'); list = tag; }
        out.push('<li>' + inline(item[1]) + '</li>');
        return;
      }
      if (list) { out.push('</' + list + '>'); list = null; }
      line = line.replace(/^#+\s*/, '');
      if (line.trim()) out.push('<p>' + inline(line) + '</p>');
    });
    if (list) out.push('</' + list + '>');
    return out.join('');
  }

  var root = document.createElement('div');
  root.className = 'ollie';
  root.innerHTML =
    '<button class="ollie-launch" type="button" aria-expanded="false" aria-controls="ollie-panel">' +
      '<img src="assets/img/ollie.png" alt="" width="44" height="44">' +
      '<span>Ask Ollie</span></button>' +
    '<section class="ollie-panel" id="ollie-panel" role="dialog" aria-label="Chat with Ollie" hidden>' +
      '<header class="ollie-head"><div><strong>Ollie</strong><small>Green2Gold assistant</small></div>' +
        '<div class="ollie-actions"><button type="button" class="ollie-reset" title="Start a new chat">New chat</button>' +
        '<button type="button" class="ollie-close" aria-label="Close chat">×</button></div></header>' +
      '<div class="ollie-log" aria-live="polite"></div>' +
      '<form class="ollie-form"><label class="ollie-sr" for="ollie-input">Message Ollie</label>' +
        '<textarea id="ollie-input" rows="1" maxlength="2000" placeholder="Ask about Green2Gold…" required></textarea>' +
        '<button type="submit" aria-label="Send">➤</button></form>' +
      '<p class="ollie-note">Ollie answers from the Green2Gold website and can make mistakes. Please don\'t share personal or payment details.</p>' +
    '</section>';
  document.body.appendChild(root);

  var launch = root.querySelector('.ollie-launch');
  var panel = root.querySelector('.ollie-panel');
  var log = root.querySelector('.ollie-log');
  var form = root.querySelector('.ollie-form');
  var input = root.querySelector('textarea');
  var busy = false;

  function bubble(role, md) {
    var el = document.createElement('div');
    el.className = 'ollie-msg ollie-' + role;
    el.innerHTML = role === 'user' ? '<p>' + esc(md) + '</p>' : render(md);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function draw() {
    log.innerHTML = '';
    bubble('assistant', WELCOME);
    history.forEach(function (m) { bubble(m.role, m.content); });
    if (!history.length) {
      var chips = document.createElement('div');
      chips.className = 'ollie-chips';
      SUGGESTIONS.forEach(function (q) {
        var c = document.createElement('button');
        c.type = 'button';
        c.textContent = q;
        c.addEventListener('click', function () { send(q); });
        chips.appendChild(c);
      });
      log.appendChild(chips);
    }
  }

  function toggle(open) {
    panel.hidden = !open;
    launch.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('is-open', open);
    if (open) { draw(); input.focus(); }
  }

  function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    var chips = log.querySelector('.ollie-chips');
    if (chips) chips.remove();
    history.push({ role: 'user', content: text });
    save();
    bubble('user', text);
    var reply = bubble('assistant', '');
    reply.classList.add('ollie-typing');
    reply.innerHTML = '<span></span><span></span><span></span>';
    var answer = '';

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          answer += decoder.decode(r.value, { stream: true });
          reply.classList.remove('ollie-typing');
          reply.innerHTML = render(answer);
          log.scrollTop = log.scrollHeight;
          return pump();
        });
      }
      return pump();
    }).catch(function () {
      if (!answer) answer = "Sorry, I can't reach the assistant right now. Please try again later, or contact the Green2Gold team through the [Contact page](contact.html).";
    }).then(function () {
      reply.classList.remove('ollie-typing');
      reply.innerHTML = render(answer);
      history.push({ role: 'assistant', content: answer });
      save();
      busy = false;
      input.focus();
    });
  }

  launch.addEventListener('click', function () { toggle(panel.hidden); });
  root.querySelector('.ollie-close').addEventListener('click', function () { toggle(false); launch.focus(); });
  root.querySelector('.ollie-reset').addEventListener('click', function () { history = []; save(); draw(); input.focus(); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); launch.focus(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); input.value = ''; });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
})();
