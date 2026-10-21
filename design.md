# Avatar chat: design notes

## What it is
A single `index.html` for GitHub Pages. It shows an avatar of Ian and a chat box. No build step, no server.

## Files
- `index.html`: the whole app
- `avatar.jpg`: the cartoon portrait of Ian taken from the Patreon image on his website. It replaces the fallback SVG face. Replace the file to change it; the filename is set in `CONFIG.photo`.

## How replies work (three modes, picked automatically)
1. **Endpoint mode**: if `CONFIG.endpoint` is set, messages are POSTed as `{messages}` and the server returns `{reply}`. Use this for a real hosted model (Claude API, OpenAI, or your own fine-tune) behind a Cloudflare Worker or similar. Never put an API key in `index.html`, because anyone can read it.
2. **Local mode**: if no endpoint and the browser has WebGPU, an "Enable smart mode" button appears. Only when the visitor clicks it, WebLLM downloads a small open model (about 700 MB, cached afterward) and runs it in the visitor's browser. Free and keyless, but quality is modest and the first load is slow.
3. **Simple mode**: the default. Chat works immediately, before or without the model download, and it is the fallback on no WebGPU or load failure. Keyword matching against `CONFIG.facts`.

## Making it sound like you
- Edit `CONFIG.persona`. Write who you are, what you make, how you talk, and what to say when unsure.
- Paste real writing samples or transcripts of your videos into the persona for style. Small local models have short memory, so keep it tight.
- Add exact answers to `CONFIG.facts` for things that must never be wrong (links, schedule, prices).
- For a true copy of your style, fine-tune a model on your writing and serve it behind the endpoint.

## Avatar
- The portrait is drawn on a canvas. While the avatar is replying or speaking, the jaw and goatee shift down with a feathered edge and a dark mouth opening (with teeth and tongue) is drawn under the upper lip line. Openness changes every 70 to 180 ms at random with short pauses, and each spoken word boundary triggers a new beat. Browsers do not expose the speech audio, so the movement is simulated rather than true lip sync. The mouth position and jaw region are constants (`MOUTH`, `JAW`) tuned to avatar.jpg; if the picture is replaced they must be re-tuned. If the image fails to load, a simple SVG face with an animated mouth is shown.
- "Speak replies" uses the browser's built-in speech synthesis. It automatically picks a male English voice by matching known male voice names, with no visitor choice, and lowers the pitch if only a non-male voice exists. Available voices depend on the visitor's device, and browsers do not report voice gender, so name matching is a best guess. For your own cloned voice, generate audio from a service like ElevenLabs on the server side and play it in the page.
- Lip-synced video avatars (HeyGen, Synthesia) need a server or paid API and are not possible in a pure static page.

## Deploy
1. Put `index.html` (and `avatar.png`) in the repo root.
2. Repo Settings, Pages, deploy from the main branch root.
3. Visit `https://<user>.github.io/<repo>/`.

## Known limits
- Local mode needs a recent Chrome or Edge (WebGPU). Phones are often unsupported.
- Chat history lives only in the page and resets on reload.
- The avatar always says it is an AI, by design in the persona.

## Admin interview
- The "Interview me" button in the admin panel walks through a bank of common visitor questions (the `INTERVIEW` array in `index.html`), one at a time.
- Questions already answered in the Q&A list are skipped. "Save and next" adds the answer as a Q&A entry, "Skip" moves on, and "Finish" saves everything to GitHub automatically if any answers were added.
- Answers become ordinary Q&A entries, so they can be edited or deleted afterwards. Add more questions by editing the `INTERVIEW` array.
- Matching is keyword-based, so a visitor's wording does not need to match the question exactly, but similar words help.

## Answer database (admin)
- Each Q&A is a record in `knowledge.json` with `id`, `q`, `a`, `tag` (category) and `updated` (ISO date). Older entries without these fields are upgraded automatically when the admin panel loads, and saved with them.
- Entries are collapsed by default and show the question, category and a one-line answer preview. Click to fold or unfold. "Expand all" and "Collapse all" apply to what is currently shown.
- Search matches question, answer and category text. The category dropdown filters by category and the sort menu orders by newest, oldest, question A to Z, or category. The counter shows how many entries match and how many are open.
- Delete asks for a second click within three seconds. Nothing is written to GitHub until "Save to GitHub" is pressed.
- Import accepts JSON (a list of entries, or a full knowledge file) or CSV with question and answer columns and an optional category column. Questions already in the database are skipped. Export gives JSON or CSV.
- Interview answers are tagged "Interview" and answers added with "Teach a better answer" are tagged "Taught".
- If the database ever outgrows a single JSON file or needs several editors at once, move the records to a hosted database such as Supabase and keep this panel as the front end.

## Foldable database section
- The whole "Answer database" section in the admin panel folds under one header that shows the entry count. It starts collapsed. Adding an entry or using "Teach a better answer" opens it automatically; interview answers are added without opening it.
- The Save to GitHub and Close buttons stay outside the fold so they are always visible.

## Project docs (design.md sync)
- The admin panel has a foldable "Project docs (design.md)" section. "Sync from GitHub" lists the owner's repos (the owner comes from `CONFIG.repo`), looks for `design.md`, `DESIGN.md` or `docs/design.md` in each, and stores the text in the `docs` list of `knowledge.json`. The avatar's own repo is skipped. Docs for repos that no longer have a design file are dropped on the next sync.
- Public repos only by default. `knowledge.json` is served publicly by GitHub Pages, so anything synced from a private repo becomes publicly readable. The "Include private repos" checkbox is off by default and warns about this. The token must also be given access to those private repos (Contents read) for them to be found.
- The docs are not edited in the panel. Edit the design.md in the source repo and sync again. Each entry can be unfolded to preview the text, or removed.
- Nothing is written until "Save to GitHub" is pressed.
- On the public page each doc is split into chunks at markdown headings, long sections into pieces of about 1100 characters. Simple mode answers with the best matching chunk when at least two meaningful words match, after the Q&A, built-in answers and notes. Smart mode adds a list of project names and descriptions plus the three best chunks to the model's instructions, so a small model is not overloaded.
- Q&A answers always win over doc chunks, so a hand-written answer is the way to correct anything the docs get wrong.

## Smart mode safeguards
- The model library is pinned to a specific version (`@mlc-ai/web-llm@0.2.86`) so a future release cannot break the page.
- The 1B model has a 4096 token context window shared by the instructions, the conversation and the reply. Retrieved context is capped at 2400 characters, only the last six messages of history are sent, and replies are limited to 256 tokens.
- If a reply fails or comes back empty, the engine's chat state is reset and the question is retried once with only the persona and the question. If that also fails, the avatar answers in simple mode and the status line shows the actual error text, so a failure is never a silent "...".
- Errors are also written to the browser console.

## AI server (free Cloudflare Worker)
- `worker.js` is a small Cloudflare Worker that runs a hosted Llama 3.1 8B model through Workers AI, so replies do not depend on the visitor's phone. Cloudflare's free plan includes a daily allowance for Workers AI. When it runs out, requests fail and the page falls back to simple answers.
- The page sends the conversation to the Worker as `{messages}` and expects `{reply}`. The Worker only accepts requests from `https://ianmcgo.github.io`, keeps at most the last 14 messages, limits message length, and caps replies at 300 tokens. The origin check stops other websites from using it from a browser but does not stop someone calling it directly, so the free daily allowance is the real cost ceiling.
- The Worker address is stored in `knowledge.json` as `endpoint` and edited in the admin panel under "AI server URL", with a Test server button. `CONFIG.endpoint` in `index.html` overrides it if set. No code edit is needed to connect it.
- Setup: Cloudflare dashboard, Workers and Pages, Create, Worker, deploy the starter, Edit code, paste `worker.js`, deploy. Then Settings, Bindings, Add, Workers AI, variable name `AI`, and deploy again. Copy the `workers.dev` address into the admin panel.
- With a server connected the prompt is richer: up to 5 matching Q&A answers, 5 notes, 4 doc chunks, up to 6500 characters of context, 8 recent answers as voice examples, and the last 10 messages of history.
- If the server errors, the status line shows the error and the avatar answers in simple mode.
- To use Claude instead of Workers AI, replace the `env.AI.run` call with a request to the Anthropic Messages API using a key stored as a Worker secret. This is pay per use on a separate API account and is not covered by a Claude subscription.

## Phones and smart mode
- The in-browser model button is hidden on phones, because phone graphics memory often cannot run it ("Object has already been disposed"). After a smart mode failure the page stops retrying the model and uses simple answers or the AI server.
- The persona now asks for casual, short, human replies without lists or "as an AI" language.
