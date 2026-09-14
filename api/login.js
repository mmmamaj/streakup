function extractRecord(payload) {
  if (!payload) return null;
  if (payload.registro) return payload.registro;
  if (payload.record) return payload.record;
  if (Array.isArray(payload.records)) return payload.records[0] || null;
  if (Array.isArray(payload.data)) return payload.data[0] || null;
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    const apiKey = process.env.DATABASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
    }

    const chave = `login_${String(email).trim().toLowerCase()}`;
    const response = await fetch(
      `https://databasen3t.lovable.app/api/public/v1/records?chave=${encodeURIComponent(chave)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } }
    );
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = null; }

    if (!response.ok) {
      return res.status(response.status === 404 ? 401 : response.status).json({ error: "E-mail ou senha inválidos." });
    }

    const record = extractRecord(payload);
    const data = record?.data || record;
    if (!data || data.usuario?.toLowerCase() !== String(email).trim().toLowerCase() || data.senha !== password) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    return res.status(200).json({
      success: true,
      user: { name: data.nome || "Usuário", email: data.usuario }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao conectar com a database." });
  }
}
