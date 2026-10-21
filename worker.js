const ALLOWED_ORIGINS = ["https://ianmcgo.github.io"];
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function reply(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, cors)
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST" || !allowed) return reply({ error: "forbidden" }, 403, cors);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return reply({ error: "bad json" }, 400, cors);
    }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && typeof m.content === "string" && ["system", "user", "assistant"].includes(m.role))
      .map(m => ({ role: m.role, content: m.content.slice(0, m.role === "system" ? 9000 : 1500) }))
      .slice(-14);
    if (!messages.length) return reply({ error: "no messages" }, 400, cors);

    const ai = env.AI || Object.values(env || {}).find(v => v && typeof v.run === "function");
    if (!ai) return reply({ error: "ai failed", detail: "No Workers AI binding found. Add one under Settings, then Bindings." }, 502, cors);

    try {
      const out = await ai.run(MODEL, { messages: messages, max_tokens: 300, temperature: 0.8 });
      return reply({ reply: String(out.response || "").trim() }, 200, cors);
    } catch (e) {
      return reply({ error: "ai failed", detail: String((e && e.message) || e).slice(0, 300) }, 502, cors);
    }
  }
};
