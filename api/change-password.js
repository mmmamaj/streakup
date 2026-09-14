const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const key = process.env.DATABASE_API_KEY;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!key) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  if (!email || !currentPassword || newPassword.length < 8) return res.status(400).json({ error: "Preencha os campos; a nova senha deve ter pelo menos 8 caracteres." });
  try {
    const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
    const recordKey = `login_${email}`;
    const found = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { headers });
    if (!found.ok) return res.status(401).json({ error: "Conta não encontrada." });
    const payload = await found.json(); const data = payload.registro?.data || {};
    if (data.senha !== currentPassword) return res.status(401).json({ error: "A senha atual está incorreta." });
    const updated = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "login", data: { ...data, senha: newPassword } }) });
    if (!updated.ok) return res.status(updated.status).json({ error: "Não foi possível atualizar a senha." });
    return res.status(200).json({ success: true });
  } catch { return res.status(500).json({ error: "Erro ao conectar com a database." }); }
}
