const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");
const clean = (value) => String(value || "").trim();

async function getRecords() {
  const response = await fetch(`${API_BASE}/records?limite=1000`, {
    headers: { Authorization: `Bearer ${process.env.DATABASE_API_KEY}`, Accept: "application/json" }
  });
  const payload = await response.json();
  if (!response.ok) throw Error(payload.error || "Não foi possível carregar os usuários.");
  return payload.registros || [];
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido." });
  if (!process.env.DATABASE_API_KEY) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });

  try {
    const me = normalize(req.query?.me);
    const query = normalize(req.query?.q);
    const records = await getRecords();
    const users = new Map();

    for (const record of records) {
      if (record.tipo !== "login" && record.tipo !== "profile") continue;
      const data = record.data || {};
      const email = normalize(data.email || data.usuario || record.chave?.replace(/^login_/, "").replace(/^profile_/, ""));
      if (!email) continue;
      const existing = users.get(email) || { email, name: "Usuário", username: email.split("@")[0], avatarUrl: "", bio: "" };
      existing.name = clean(data.name || data.nome) || existing.name;
      existing.username = clean(data.username) || existing.username;
      existing.avatarUrl = clean(data.avatarUrl) || existing.avatarUrl;
      existing.bio = clean(data.bio) || existing.bio;
      users.set(email, existing);
    }

    const result = [...users.values()]
      .filter((user) => user.email !== me)
      .filter((user) => !query || [user.email, user.name, user.username].some((value) => normalize(value).includes(query)))
      .map((user) => ({ ...user, canMessage: records.some((record) => record.tipo === "follow" && normalize(record.data?.follower) === user.email && (normalize(record.data?.following) === me || normalize(record.data?.followingUsername) === me)) }))
      .filter((user) => user.canMessage)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return res.status(200).json({ users: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erro ao carregar usuários." });
  }
}
