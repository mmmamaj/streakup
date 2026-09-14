const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const key = () => process.env.DATABASE_API_KEY;
const normalize = (value) => String(value || "").trim().toLowerCase();
const chatKey = (a, b) => `chat_${[normalize(a), normalize(b)].sort().join("__")}`;

async function request(path, options = {}) {
  return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${key()}`, Accept: "application/json", ...(options.headers || {}) } });
}

export default async function handler(req, res) {
  if (!key()) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  const sender = normalize(req.query?.me || req.body?.me);
  const recipient = normalize(req.query?.with || req.body?.with);
  if (!sender || !recipient || sender === recipient) return res.status(400).json({ error: "Informe os dois participantes da conversa." });
  const recordKey = chatKey(sender, recipient);

  try {
    if (req.method === "GET") {
      const response = await request(`/records/${encodeURIComponent(recordKey)}`);
      if (response.status === 404) return res.status(200).json({ messages: [] });
      const payload = await response.json();
      return res.status(response.status).json({ messages: payload.registro?.data?.messages || [] });
    }

    if (req.method === "POST") {
      const text = String(req.body?.text || "").trim();
      if (!text) return res.status(400).json({ error: "A mensagem não pode ficar vazia." });
      const current = await request(`/records/${encodeURIComponent(recordKey)}`);
      let messages = [];
      if (current.ok) {
        const payload = await current.json();
        messages = payload.registro?.data?.messages || [];
      }
      const message = { id: crypto.randomUUID(), from: sender, to: recipient, text, createdAt: new Date().toISOString() };
      messages = [...messages, message].slice(-500);
      const response = await request(`/records/${encodeURIComponent(recordKey)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "chat", data: { participants: [sender, recipient], messages } }) });
      const payload = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: payload.error || "Não foi possível salvar a mensagem." });
      return res.status(200).json({ message });
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao conectar com a database." });
  }
}
