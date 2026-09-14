const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const key = process.env.DATABASE_API_KEY; const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim(); const username = String(req.body?.username || "").trim().replace(/^@/, ""); const avatarUrl = String(req.body?.avatarUrl || "").trim();
  if (!key) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  if (!email || !name || !username) return res.status(400).json({ error: "Nome e nome de usuário são obrigatórios." });
  try {
    const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" }; const recordKey = `login_${email}`;
    const found = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { headers });
    if (!found.ok) return res.status(404).json({ error: "Conta não encontrada." });
    const payload = await found.json(); const data = payload.registro?.data || {};
    const updated = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "login", data: { ...data, usuario: email, nome: name, username, avatarUrl } }) });
    if (!updated.ok) return res.status(updated.status).json({ error: "Não foi possível atualizar o perfil." });
    return res.status(200).json({ success: true, user: { name, username, avatarUrl, email } });
  } catch { return res.status(500).json({ error: "Erro ao conectar com a database." }); }
}
