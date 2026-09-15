const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const key = () => process.env.DATABASE_API_KEY;
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");
const chatKey = (a, b) => `chat_${[normalize(a), normalize(b)].sort().join("__")}`;
async function request(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${key()}`, Accept: "application/json", ...(options.headers || {}) } }); }
async function getRecords() { const response = await request("/records?limite=2000"); const payload = await response.json(); if (!response.ok) throw Error(payload.error || "Não foi possível verificar os seguidores."); return payload.registros || []; }
function follows(records, follower, following) { const a = normalize(follower), b = normalize(following); return records.some((record) => record.tipo === "follow" && normalize(record.data?.follower) === a && (normalize(record.data?.following) === b || normalize(record.data?.followingUsername) === b)); }
async function notify(to, from, text) { const payload={to:normalize(to),kind:"message",source:normalize(from),sourceName:normalize(from).split("@")[0],text,createdAt:new Date().toISOString(),read:false}; const id=`notification_${normalize(to)}__message__${normalize(from)}__${Date.now()}`; await request(`/records/${encodeURIComponent(id)}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({tipo:"notification",data:payload}) }); try{const mod=await import("./push-send.js");await mod.sendPushToUser(to,{title:"Nova mensagem · RiseUp",body:text,icon:"/assets/images/icon.svg",url:"/chat"});}catch(e){console.warn("Push indisponível:",e.message);} }
export default async function handler(req, res) {
  if (!key()) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  const sender = normalize(req.query?.me || req.body?.me), recipient = normalize(req.query?.with || req.body?.with);
  if (!sender || !recipient || sender === recipient) return res.status(400).json({ error: "Informe os dois participantes da conversa." });
  try {
    const records = await getRecords();
    if (!follows(records, recipient, sender)) return res.status(403).json({ error: "Só é possível enviar mensagem para quem segue você." });
    const recordKey = chatKey(sender, recipient);
    if (req.method === "GET") { const response = await request(`/records/${encodeURIComponent(recordKey)}`); if (response.status === 404) return res.status(200).json({ messages: [] }); const payload = await response.json(); return res.status(response.status).json({ messages: payload.registro?.data?.messages || [] }); }
    if (req.method === "POST") {
      const text = String(req.body?.text || "").trim(); if (!text) return res.status(400).json({ error: "A mensagem não pode ficar vazia." });
      const current = await request(`/records/${encodeURIComponent(recordKey)}`); let messages = [];
      if (current.ok) { const payload = await current.json(); messages = payload.registro?.data?.messages || []; }
      const message = { id: crypto.randomUUID(), from: sender, to: recipient, text, createdAt: new Date().toISOString() };
      messages = [...messages, message].slice(-500);
      const response = await request(`/records/${encodeURIComponent(recordKey)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "chat", data: { participants: [sender, recipient], messages } }) });
      const payload = await response.json(); if (!response.ok) return res.status(response.status).json({ error: payload.error || "Não foi possível salvar a mensagem." });
      await notify(recipient, sender, "Você recebeu uma nova mensagem.");
      return res.status(200).json({ message });
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) { console.error(error); return res.status(500).json({ error: "Erro ao conectar com a database." }); }
}
