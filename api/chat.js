// POST /api/chat — Ollie, the Green2Gold site assistant.
// Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
// Streams the reply back as plain text. Needs GROQ_API_KEY in the environment;
// GROQ_MODEL optionally picks a different Groq model.
const Groq = require('groq-sdk').default;
const SYSTEM_PROMPT = require('./_prompt');
const { retrieve } = require('./_retrieve');

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const MAX_TURNS = 12;
const MAX_CHARS = 2000;

let client;
function getClient() {
  // Created on first use so a missing key shows Ollie's error message instead of crashing the server.
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function cleanHistory(body) {
  const list = Array.isArray(body && body.messages) ? body.messages : [];
  const msgs = list
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs.length && msgs[msgs.length - 1].role === 'user' ? msgs : null;
}

function withRetrieval(msgs) {
  const question = msgs[msgs.length - 1].content;
  // Include the previous visitor message so follow-ups like "how do I join it?" still find the topic.
  const prev = msgs.slice(0, -1).filter(m => m.role === 'user').slice(-1).map(m => m.content).join(' ');
  const found = retrieve(question + ' ' + question + ' ' + prev);
  const docs = found.length
    ? found.map(d => `<document source="${escapeAttr(d.source)}" url="${escapeAttr(d.url)}">\n${d.text}\n</document>`).join('\n')
    : '(No matching sections were found in the knowledge base.)';
  const reminder = 'Answer only with facts stated in these documents. Do not add steps, emails, logins, approvals, dates, prices or other details they do not state; if something is not covered, say so.';
  const last = { role: 'user', content: `<retrieved_documents>\n${docs}\n</retrieved_documents>\n\n${reminder}\n\nVisitor's message:\n${question}` };
  return [...msgs.slice(0, -1), last];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method not allowed');
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const msgs = cleanHistory(body);
  if (!msgs) {
    res.statusCode = 400;
    return res.end('Expected { messages: [...] } ending with a user message.');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const stream = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4096,
      temperature: 0.2,
      // gpt-oss models think before answering; medium effort checks answers against the documents, and the thinking stays out of the reply.
      ...(MODEL.startsWith('openai/gpt-oss') && { reasoning_effort: 'medium', include_reasoning: false }),
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...withRetrieval(msgs)],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0] && chunk.choices[0].delta.content;
      if (text) res.write(text);
    }
  } catch (error) {
    if (error instanceof Groq.AuthenticationError) console.error('Ollie: invalid or missing GROQ_API_KEY');
    else if (error instanceof Groq.RateLimitError) console.error('Ollie: Groq rate limit reached');
    else if (error instanceof Groq.APIError) console.error(`Ollie: Groq API error ${error.status}:`, error.message);
    else console.error('Ollie:', error.message || error);
    res.write("\n\nSorry, I'm having trouble answering right now. Please try again in a moment, or reach the Green2Gold team through the [Contact page](contact.html).");
  }
  res.end();
};
