const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const key = process.env.DATABASE_API_KEY, email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim(), bio = String(req.body?.bio || "").trim().slice(0, 160), username = String(req.body?.username || "").trim().replace(/^@/, ""), avatarUrl = String(req.body?.avatarUrl || "").trim();
  const publicProfile = req.body?.publicProfile !== false;
  const language = String(req.body?.language || "").trim();
  const productivityLevel = String(req.body?.productivityLevel || "").trim();
  const dailyVideoLimitMinutes = Number(req.body?.dailyVideoLimitMinutes || 0);
  const videoUntil = String(req.body?.videoUntil || "").trim();
  const interests = Array.isArray(req.body?.interests) ? req.body.interests.slice(0, 12) : null;
  if (!key) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  if (!email || !name || !username) return res.status(400).json({ error: "Nome e nome de usuário são obrigatórios." });
  try {
    const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" }, recordKey = `login_${email}`;
    const found = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { headers });
    if (!found.ok) return res.status(404).json({ error: "Conta não encontrada." });
    const payload = await found.json(), data = payload.registro?.data || {};
    const updated = await fetch(`${API_BASE}/records/${encodeURIComponent(recordKey)}`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "login", data: { ...data, usuario: email, nome: name, name, username, bio, avatarUrl, publicProfile,
          ...(language ? { language } : {}),
          ...(productivityLevel ? { productivityLevel } : {}),
          ...(dailyVideoLimitMinutes > 0 ? { dailyVideoLimitMinutes } : {}),
          ...(videoUntil ? { videoUntil } : {}),
          ...(interests ? { interests } : {}) } }) });
    if (!updated.ok) return res.status(updated.status).json({ error: "Não foi possível atualizar o perfil." });
    return res.status(200).json({ success: true, user: { name, username, bio, avatarUrl, publicProfile, email } });
  } catch { return res.status(500).json({ error: "Erro ao conectar com a database." }); }
}
