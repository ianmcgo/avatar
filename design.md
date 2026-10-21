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
