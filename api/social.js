const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const apiKey = () => process.env.DATABASE_API_KEY;
const norm = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");
const safe = (value) => String(value || "").trim();

async function db(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json", ...(options.headers || {}) }
  });
}
async function allRecords() {
  const response = await db("/records?limite=2000");
  const payload = await response.json();
  if (!response.ok) throw Error(payload.error || "Não foi possível ler a database.");
  return payload.registros || [];
}
async function getRecord(key) {
  const response = await db(`/records/${encodeURIComponent(key)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw Error("Não foi possível ler o registro.");
  const payload = await response.json();
  return payload.registro || null;
}
async function putRecord(key, tipo, data) {
  const response = await db(`/records/${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, data }) });
  if (!response.ok) throw Error("Não foi possível salvar na database.");
  return response.json();
}
async function deleteRecord(key) { return db(`/records/${encodeURIComponent(key)}`, { method: "DELETE" }); }
function isFollowing(records, follower, following) {
  const a = norm(follower), b = norm(following);
  return records.some((record) => record.tipo === "follow" && norm(record.data?.follower) === a && (norm(record.data?.following) === b || norm(record.data?.followingUsername) === b));
}
function profileFromRecords(records, target) {
  const wanted = norm(target);
  const login = records.filter((record) => record.tipo === "login").find((record) => {
    const data = record.data || {};
    return [data.email, data.usuario, data.username, record.chave?.replace(/^login_/, "")].some((value) => norm(value) === wanted);
  });
  const loginEmail = norm(login?.data?.email || login?.data?.usuario);
  const profile = records.filter((record) => record.tipo === "profile").find((record) => {
    const data = record.data || {};
    return (loginEmail && norm(data.email) === loginEmail) || [data.email, data.username, record.chave?.replace(/^profile_/, "")].some((value) => norm(value) === wanted);
  });
  const record = profile || login;
  if (!record) return null;
  const data = { ...(login?.data || {}), ...(profile?.data || {}) };
  const email = norm(data.email || data.usuario || record.chave?.replace(/^profile_/, "").replace(/^login_/, ""));
  return { email, name: safe(data.name || data.nome) || "Usuário", username: safe(data.username || email.split("@")[0]) || "usuario", avatarUrl: safe(data.avatarUrl), bio: safe(data.bio), publicProfile: data.publicProfile !== false };
}
function postFromRecord(record, records) {
  const base = record.data || {}, id = record.chave;
  return { id, ...base, likes: Number(base.likes || 0) + records.filter((item) => item.tipo === "like" && item.data?.postId === id).length, reposts: Number(base.reposts || 0) + records.filter((item) => item.tipo === "repost" && item.data?.postId === id).length, views: Number(base.views || 0) };
}
function notifyKey(to, kind, source, objectId) { return `notification_${norm(to)}__${kind}__${norm(source)}__${safe(objectId)}`; }
async function createNotification(to, kind, source, sourceName, objectId, text) {
  const recipient = norm(to);
  if (!recipient || recipient === norm(source)) return;
  await putRecord(notifyKey(recipient, kind, source, objectId), "notification", { to: recipient, kind, source: norm(source), sourceName: safe(sourceName) || "Alguém", objectId: safe(objectId), text: safe(text), createdAt: new Date().toISOString(), read: false });
}
function sortNewest(items) { return items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))); }

export default async function handler(req, res) {
  if (!apiKey()) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  try {
    const records = await allRecords();
    if (req.method === "GET") {
      const type = safe(req.query?.type || "feed"), viewer = norm(req.query?.me || req.query?.viewer);
      if (type === "feed" || type === "following") {
        const posts = records.filter((record) => record.tipo === "post" && record.data?.mediaType === "video").filter((record) => {
          const author = profileFromRecords(records, record.data?.authorEmail);
          const visible = !author || author.publicProfile || author.email === viewer || isFollowing(records, viewer, author.email);
          const followed = isFollowing(records, viewer, record.data?.authorEmail) || isFollowing(records, viewer, record.data?.authorUsername);
          return visible && (type === "feed" || followed);
        }).map((record) => postFromRecord(record, records));
        return res.status(200).json({ posts: sortNewest(posts) });
      }
      if (type === "profile") {
        const profile = profileFromRecords(records, req.query?.identifier || req.query?.username || req.query?.email);
        if (!profile) return res.status(404).json({ error: "Perfil não encontrado." });
        const follows = records.filter((record) => record.tipo === "follow");
        const canView = profile.publicProfile || profile.email === viewer || isFollowing(records, viewer, profile.email);
        const profileNames = new Set([norm(profile.email), norm(profile.username)]);
        profile.followers = follows.filter((record) => profileNames.has(norm(record.data?.following)) || profileNames.has(norm(record.data?.followingUsername))).length;
        profile.following = follows.filter((record) => profileNames.has(norm(record.data?.follower)) || profileNames.has(norm(record.data?.followerUsername))).length;
        profile.followingMe = isFollowing(records, viewer, profile.email);
        const posts = canView ? sortNewest(records.filter((record) => record.tipo === "post" && record.data?.mediaType === "video" && norm(record.data?.authorEmail) === profile.email).map((record) => postFromRecord(record, records))) : [];
        profile.posts = posts.length;
        return res.status(200).json({ profile, posts, canView });
      }
      if (type === "recommendations") {
        const users = new Map();
        records.filter((record) => ["login", "profile"].includes(record.tipo)).forEach((record) => {
          const data = record.data || {}, email = norm(data.email || data.usuario || record.chave?.replace(/^login_/, "").replace(/^profile_/, ""));
          if (!email || email === viewer) return;
          const existing = users.get(email) || { email, name: "Usuário", username: email.split("@")[0], avatarUrl: "", bio: "", createdAt: record.createdAt || "" };
          existing.name = safe(data.name || data.nome) || existing.name; existing.username = safe(data.username) || existing.username; existing.avatarUrl = safe(data.avatarUrl) || existing.avatarUrl; existing.bio = safe(data.bio) || existing.bio;
          users.set(email, existing);
        });
        const result = [...users.values()].filter((person) => !isFollowing(records, viewer, person.email)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);
        return res.status(200).json({ users: result });
      }
      if (type === "search") {
        const query = norm(req.query?.q);
        if (query.length < 2) return res.status(200).json({ users: [], posts: [] });
        const users = records.filter((record) => ["login", "profile"].includes(record.tipo)).map((record) => profileFromRecords(records, record.data?.email || record.data?.usuario || record.chave)).filter(Boolean).filter((profile, index, list) => list.findIndex((item) => item.email === profile.email) === index).filter((profile) => [profile.name, profile.username, profile.email].some((value) => norm(value).includes(query))).slice(0, 12);
        const posts = records.filter((record) => record.tipo === "post" && record.data?.mediaType === "video" && [record.data?.text, record.data?.authorName, record.data?.authorUsername].some((value) => norm(value).includes(query))).map((record) => postFromRecord(record, records)).slice(0, 12);
        return res.status(200).json({ users, posts });
      }
      return res.status(400).json({ error: "Tipo de consulta inválido." });
    }
    if (req.method === "POST") {
      const action = safe(req.body?.action), me = norm(req.body?.me);
      if (!me) return res.status(400).json({ error: "Usuário não informado." });
      const actor = profileFromRecords(records, me);
      if (action === "post") {
        if (!req.body.mediaUrl || req.body.mediaType !== "video") return res.status(400).json({ error: "O For You aceita apenas vídeos curtos." });
        const id = `post_${crypto.randomUUID()}`, post = { authorEmail: me, authorName: safe(req.body.authorName) || actor?.name || "Usuário", authorUsername: safe(req.body.authorUsername) || actor?.username || me.split("@")[0], authorAvatar: safe(req.body.authorAvatar), text: safe(req.body.text), mentions: safe(req.body.mentions), mediaUrl: safe(req.body.mediaUrl), mediaType: "video", createdAt: new Date().toISOString(), likes: 0, reposts: 0, views: 0 };
        await putRecord(id, "post", post);
        const mentions = [...String(post.mentions || "").matchAll(/@([a-zA-Z0-9_.-]+)/g)].map((match) => match[1].toLowerCase());
        for (const record of records.filter((item) => ["login", "profile"].includes(item.tipo))) {
          const mentioned = profileFromRecords(records, record.data?.email || record.data?.usuario || record.chave);
          if (mentioned && mentions.includes(String(mentioned.username).toLowerCase()) && mentioned.email !== me) await createNotification(mentioned.email, "mention", me, actor?.name, id, `${actor?.name || "Alguém"} marcou você em um vídeo.`);
        }
        return res.status(201).json({ post: { id, ...post } });
      }
      if (action === "follow") {
        const target = norm(req.body.target); if (!target || target === me) return res.status(400).json({ error: "Perfil inválido." });
        const targetProfile = profileFromRecords(records, target); if (!targetProfile) return res.status(404).json({ error: "Perfil não encontrado." });
        const key = `follow_${me}__${targetProfile.email}`, following = Boolean(req.body.following), existing = await getRecord(key);
        if (following && !existing) { await putRecord(key, "follow", { follower: me, following: targetProfile.email, followingUsername: targetProfile.username, createdAt: new Date().toISOString() }); await createNotification(targetProfile.email, "follow", me, actor?.name, key, `${actor?.name || "Alguém"} começou a seguir você.`); }
        if (!following && existing) await deleteRecord(key);
        return res.status(200).json({ following });
      }
      if (action === "interaction") {
        const postId = safe(req.body.postId), kind = safe(req.body.kind), active = Boolean(req.body.active);
        if (!postId || !["like", "save", "repost"].includes(kind)) return res.status(400).json({ error: "Ação inválida." });
        const key = `${kind}_${me}__${postId}`, existing = await getRecord(key);
        if (active && !existing) { await putRecord(key, kind, { user: me, postId, createdAt: new Date().toISOString() }); const post = records.find((record) => record.chave === postId)?.data; if (post) await createNotification(post.authorEmail, kind, me, actor?.name, postId, `${actor?.name || "Alguém"} ${kind === "like" ? "curtiu" : "repostou"} seu vídeo.`); }
        if (!active && existing) await deleteRecord(key);
        return res.status(200).json({ active });
      }
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) { console.error(error); return res.status(500).json({ error: error.message || "Erro na rede social." }); }
}
export const config = { api: { bodyParser: true } };
