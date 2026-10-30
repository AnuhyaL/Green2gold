# Green2Gold website (restructured)

Static rebuild of https://green2gold.org/ in the new 9-section structure. All original text, testimonials, people, membership grid, blog posts, FAQs, legal pages, videos, newsletters and PDFs have been carried over.

## Structure

| Page | File |
|---|---|
| Home | `index.html` |
| About Green2Gold | `about.html` |
| Programs & Pathways | `programs.html` |
| Our Initiatives | `initiatives.html` + `initiative-*.html` |
| Research & Resources (searchable) | `resources.html` |
| Media & Stories | `media.html` |
| Our Impact & Community | `impact.html` |
| Get Involved | `get-involved.html` |
| Contact | `contact.html`, `privacy-policy.html`, `terms-of-use.html` |

The Environmental Education Group links to https://environmental-education-group.vercel.app/ and the Harm-Free Emporium links to https://harm-free-emporium.vercel.app/. Both URLs are set once in `_build/build.js` (`EEG_URL`, `HFE_URL`).

## Editing

Edit page content in `_build/pages/*.html`. The shared header, navigation and footer are in `_build/build.js`. Then rebuild:

```
node _build/build.js
```

This writes the final HTML files to the project root. Deploy the root folder (without `_build/`) to any static host, such as Vercel.

## Notes

- PDFs are still linked from `green2gold.org/wp-content/uploads/…`. Copy them into `assets/` before the old WordPress site is shut down.
- The contact and newsletter forms open the visitor's email app, because the site has no backend. To collect submissions directly, connect a form service such as Formspree.
- Pages marked `TODO` need content from Green2Gold: the GreenTech Micro-Manufacturing Hub details and the YouTube ID for video Episode 2.

## Ollie chat assistant

Ollie is the "Ask Ollie" chat button on every page. It answers questions from the site's own content, using a Groq-hosted model.

- `node _build/build.js` also writes `api/_kb.json`, Ollie's knowledge base. Every page is split into sections, and each section keeps its page title and link.
- `api/chat.js` is the chat endpoint (a Vercel serverless function). It picks the six sections that best match each question and sends them to Groq (default model `openai/gpt-oss-120b`; set `GROQ_MODEL` in `.env` to change it) with Ollie's system prompt (`api/_prompt.js`).
- `assets/js/ollie.js` is the chat window.

**Run locally:** run `npm install`, then put `GROQ_API_KEY=gsk_...` in the `.env` file (get a key at https://console.groq.com/keys), then run `npm run dev` and open http://localhost:8080.

**Deploy:** in Vercel, add `GROQ_API_KEY` under Project → Settings → Environment Variables. Deploy `api/` and `package.json` along with the site files.

**Knowledge-base limit:** Ollie only knows what is on this website. To let it answer in more detail about Harm-Free Emporium or the Environmental Education Group, add their content to the site pages, or extend `_build/kb.js` to include their pages.
