# Avatar chat: design notes

## What it is
A single `index.html` for GitHub Pages. It shows an avatar of Ian and a chat box. No build step, no server.

## Files
- `index.html`: the whole app
- `avatar.png`: optional photo or portrait. If present it replaces the cartoon SVG. Put it next to `index.html`.

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
- Cartoon SVG with a mouth that animates while the avatar is replying or speaking.
- "Speak replies" uses the browser's built-in speech synthesis. For your own cloned voice, generate audio from a service like ElevenLabs on the server side and play it in the page.
- Lip-synced video avatars (HeyGen, Synthesia) need a server or paid API and are not possible in a pure static page.

## Deploy
1. Put `index.html` (and `avatar.png`) in the repo root.
2. Repo Settings, Pages, deploy from the main branch root.
3. Visit `https://<user>.github.io/<repo>/`.

## Known limits
- Local mode needs a recent Chrome or Edge (WebGPU). Phones are often unsupported.
- Chat history lives only in the page and resets on reload.
- The avatar always says it is an AI, by design in the persona.
