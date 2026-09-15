const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const norm = (value) => String(value || "").trim().toLowerCase();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${process.env.DATABASE_API_KEY}`, Accept: "application/json", ...(options.headers || {}) } }); }
async function records() { const response = await db("/records?limite=2000"); const payload = await response.json(); if (!response.ok) throw Error(payload.error || "Não foi possível carregar notificações."); return payload.registros || []; }
export default async function handler(req, res) {
  if (!process.env.DATABASE_API_KEY) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  const me = norm(req.query?.me || req.body?.me);
  if (!me) return res.status(400).json({ error: "Usuário não informado." });
  try {
    if (req.method === "GET") {
      const all = await records();
      const notifications = all.filter((record) => record.tipo === "notification" && norm(record.data?.to) === me).map((record) => ({ id: record.chave, ...record.data })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ notifications, unread: notifications.filter((item) => !item.read).length });
    }
    if (req.method === "POST") {
      const id = String(req.body?.id || "");
      if (req.body?.action !== "read" || !id) return res.status(400).json({ error: "Ação inválida." });
      const response = await db(`/records/${encodeURIComponent(id)}`); if (!response.ok) return res.status(response.status).json({ error: "Notificação não encontrada." });
      const payload = await response.json(), notification = payload.registro;
      if (norm(notification?.data?.to) !== me) return res.status(403).json({ error: "Notificação não pertence a este usuário." });
      notification.data.read = true;
      const update = await db(`/records/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "notification", data: notification.data }) });
      return res.status(update.ok ? 200 : update.status).json({ success: update.ok });
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) { console.error(error); return res.status(500).json({ error: error.message || "Erro nas notificações." }); }
}
