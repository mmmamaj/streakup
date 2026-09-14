const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const apiKey = () => process.env.DATABASE_API_KEY;
const norm = (v) => String(v || "").trim().toLowerCase();
const safe = (v) => String(v || "").trim();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json", ...(options.headers || {}) } }); }
async function allRecords() { const response = await db("/records?limite=1000"); if (!response.ok) throw Error("Não foi possível ler a database."); const json = await response.json(); return json.registros || []; }
async function getRecord(key) { const response = await db(`/records/${encodeURIComponent(key)}`); if (response.status === 404) return null; if (!response.ok) throw Error("Não foi possível ler o registro."); const json = await response.json(); return json.registro || null; }
async function putRecord(key, tipo, data) { const response = await db(`/records/${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, data }) }); if (!response.ok) throw Error("Não foi possível salvar na database."); return response.json(); }
function profileFromRecord(record) { return record ? ({ email: record.data?.email || record.data?.usuario || record.chave?.replace(/^profile_/, ""), name: record.data?.name || record.data?.nome || "Usuário", username: record.data?.username || record.data?.usuario || "usuario", avatarUrl: record.data?.avatarUrl || "", bio: record.data?.bio || "", followers: Number(record.data?.followers || 0), following: Number(record.data?.following || 0), posts: Number(record.data?.posts || 0) }) : null; }

export default async function handler(req, res) {
  if (!apiKey()) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  try {
    if (req.method === "GET") {
      const records = await allRecords();
      const type = safe(req.query?.type || "feed");
      if (type === "feed") {
        const posts = records.filter((r) => r.tipo === "post" && r.data?.mediaType === "video").map((r) => ({ id: r.chave, ...r.data })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return res.status(200).json({ posts });
      }
      if (type === "profile") {
        const username = norm(req.query?.username); const email = norm(req.query?.email);
        const found = records.find((r) => r.tipo === "profile" && (norm(r.data?.username) === username || norm(r.data?.email) === email)) || records.find((r) => r.tipo === "login" && (norm(r.data?.usuario) === email));
        const profile = profileFromRecord(found); if (!profile) return res.status(404).json({ error: "Perfil não encontrado." });
        const follows = records.filter((r) => r.tipo === "follow");
        profile.followers = follows.filter((r) => norm(r.data?.following) === norm(profile.email) || norm(r.data?.following) === norm(profile.username)).length;
        profile.following = follows.filter((r) => norm(r.data?.follower) === norm(profile.email)).length;
        const posts = records.filter((r) => r.tipo === "post" && norm(r.data?.authorEmail) === norm(profile.email)).map((r) => ({ id: r.chave, ...r.data })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        profile.posts = posts.length;
        return res.status(200).json({ profile, posts });
      }
      return res.status(400).json({ error: "Tipo de consulta inválido." });
    }
    if (req.method === "POST") {
      const action = safe(req.body?.action); const me = norm(req.body?.me); if (!me) return res.status(400).json({ error: "Usuário não informado." });
      if (action === "post") {
        if (!req.body.mediaUrl || req.body.mediaType !== "video") return res.status(400).json({ error: "O For You aceita apenas vídeos curtos." });
        const id = `post_${crypto.randomUUID()}`; const post = { authorEmail: me, authorName: safe(req.body.authorName), authorUsername: safe(req.body.authorUsername), authorAvatar: safe(req.body.authorAvatar), text: safe(req.body.text), mediaUrl: safe(req.body.mediaUrl), mediaType: "video", createdAt: new Date().toISOString(), likes: 0, reposts: 0, views: 0 };
        await putRecord(id, "post", post); return res.status(201).json({ post: { id, ...post } });
      }
      if (action === "follow") {
        const target = norm(req.body.target); if (!target || target === me) return res.status(400).json({ error: "Perfil inválido." });
        const key = `follow_${me}__${target}`; const existing = await getRecord(key); const following = Boolean(req.body.following);
        if (following && !existing) await putRecord(key, "follow", { follower: me, following: target, createdAt: new Date().toISOString() });
        if (!following && existing) await db(`/records/${encodeURIComponent(key)}`, { method: "DELETE" });
        return res.status(200).json({ following });
      }
      if (action === "interaction") {
        const postId = safe(req.body.postId); const kind = safe(req.body.kind); if (!postId || !["like", "save", "repost"].includes(kind)) return res.status(400).json({ error: "Ação inválida." });
        const key = `${kind}_${me}__${postId}`; const existing = await getRecord(key); const active = Boolean(req.body.active);
        if (active && !existing) await putRecord(key, kind, { user: me, postId, createdAt: new Date().toISOString() });
        if (!active && existing) await db(`/records/${encodeURIComponent(key)}`, { method: "DELETE" });
        return res.status(200).json({ active });
      }
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) { console.error(error); return res.status(500).json({ error: error.message || "Erro na rede social." }); }
}
