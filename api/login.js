const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

  try {
    const { email, password } = req.body || {};
    const usuario = String(email || "").trim().toLowerCase();
    if (!usuario || !password) return res.status(400).json({ error: "Informe e-mail e senha." });

    const apiKey = process.env.DATABASE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DATABASE_API_KEY não configurada na Vercel." });

    const response = await fetch(`${API_BASE}/records/${encodeURIComponent(`login_${usuario}`)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
    });
    if (response.status === 404) return res.status(401).json({ error: "E-mail ou senha inválidos." });

    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { return res.status(502).json({ error: "A database retornou uma resposta inválida." }); }
    if (!response.ok) return res.status(response.status).json({ error: payload.error || payload.message || "Erro ao consultar a database." });

    const data = payload.registro?.data || payload.registro || {};
    const savedEmail = String(data.usuario || data.email || "").trim().toLowerCase();
    if (savedEmail !== usuario || String(data.senha || "") !== String(password)) return res.status(401).json({ error: "E-mail ou senha inválidos." });

    return res.status(200).json({
      success: true,
      user: {
        name: data.nome || data.name || "Usuário",
        email: savedEmail,
        username: data.username || savedEmail.split("@")[0],
        avatarUrl: data.avatarUrl || "",
        publicProfile: data.publicProfile !== false,
        bio: data.bio || "",
        language: data.language || "pt-BR",
        productivityLevel: data.productivityLevel || "flex",
        dailyVideoLimitMinutes: Number(data.dailyVideoLimitMinutes || 60),
        videoUntil: data.videoUntil || "22:00",
        interests: Array.isArray(data.interests) ? data.interests : []
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao conectar com a database." });
  }
}
