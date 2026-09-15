const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const apiKey = () => process.env.DATABASE_API_KEY;
const norm = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");
const safe = (value) => String(value || "").trim();

async function db(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(options.headers || {})
    }
  });
}

async function allRecords() {
  const response = await db("/records?limite=1000");
  const text = await response.text();
  let payload = {};
  try { payload = JSON.parse(text); } catch { /* handled below */ }
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
  const response = await db(`/records/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, data })
  });
  if (!response.ok) throw Error("Não foi possível salvar na database.");
  return response.json();
}

function profileFromRecords(records, target) {
  const wanted = norm(target);
  const logins = records.filter((record) => record.tipo === "login");
  const profiles = records.filter((record) => record.tipo === "profile");
  const matches = (record) => {
    const data = record.data || {};
    return [data.email, data.usuario, data.username, record.chave?.replace(/^profile_/, "")].some((value) => norm(value) === wanted);
  };
  const login = logins.find(matches);
  const loginEmail = norm(login?.data?.email || login?.data?.usuario);
  const profile = profiles.find((record) => {
    const data = record.data || {};
    return (loginEmail && norm(data.email) === loginEmail) || matches(record);
  });
  const record = profile || login;
  if (!record) return null;

  const data = { ...(login?.data || {}), ...(profile?.data || {}) };
  const email = norm(data.email || data.usuario || record.chave?.replace(/^profile_/, ""));
  const username = safe(data.username || email.split("@")[0]) || "usuario";
  return {
    email,
    name: safe(data.name || data.nome) || "Usuário",
    username,
    avatarUrl: safe(data.avatarUrl),
    bio: safe(data.bio),
    followers: 0,
    following: 0,
    posts: 0
  };
}

function postFromRecord(record, records) {
  const base = record.data || {};
  const postId = record.chave;
  const likes = records.filter((item) => item.tipo === "like" && item.data?.postId === postId).length;
  const reposts = records.filter((item) => item.tipo === "repost" && item.data?.postId === postId).length;
  return {
    id: postId,
    ...base,
    likes: Number(base.likes || 0) + likes,
    reposts: Number(base.reposts || 0) + reposts,
    views: Number(base.views || 0)
  };
}

function sortNewest(items) {
  return items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export default async function handler(req, res) {
  if (!apiKey()) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });

  try {
    const records = await allRecords();

    if (req.method === "GET") {
      const type = safe(req.query?.type || "feed");
      if (type === "feed" || type === "following") {
        const viewer = norm(req.query?.me);
        const followed = new Set(records
          .filter((record) => record.tipo === "follow" && norm(record.data?.follower) === viewer)
          .flatMap((record) => [norm(record.data?.following), norm(record.data?.followingUsername)])
          .filter(Boolean));
        const posts = records
          .filter((record) => record.tipo === "post" && record.data?.mediaType === "video")
          .filter((record) => type === "feed" || (viewer && (followed.has(norm(record.data?.authorEmail)) || followed.has(norm(record.data?.authorUsername)))))
          .map((record) => postFromRecord(record, records));
        return res.status(200).json({ posts: sortNewest(posts) });
      }

      if (type === "profile") {
        const target = safe(req.query?.email || req.query?.username);
        const profile = profileFromRecords(records, target);
        if (!profile) return res.status(404).json({ error: "Perfil não encontrado." });
        const profileNames = new Set([norm(profile.email), norm(profile.username)]);
        const follows = records.filter((record) => record.tipo === "follow");
        profile.followers = follows.filter((record) => profileNames.has(norm(record.data?.following)) || profileNames.has(norm(record.data?.followingUsername))).length;
        profile.following = follows.filter((record) => profileNames.has(norm(record.data?.follower)) || profileNames.has(norm(record.data?.followerUsername))).length;
        const posts = sortNewest(records
          .filter((record) => record.tipo === "post" && record.data?.mediaType === "video" && norm(record.data?.authorEmail) === norm(profile.email))
          .map((record) => postFromRecord(record, records)));
        profile.posts = posts.length;
        const viewer = norm(req.query?.viewer);
        profile.followingMe = Boolean(viewer && follows.some((record) => norm(record.data?.follower) === viewer && (norm(record.data?.following) === norm(profile.email) || norm(record.data?.followingUsername) === norm(profile.username))));
        return res.status(200).json({ profile, posts });
      }

      return res.status(400).json({ error: "Tipo de consulta inválido." });
    }

    if (req.method === "POST") {
      const action = safe(req.body?.action);
      const me = norm(req.body?.me);
      if (!me) return res.status(400).json({ error: "Usuário não informado." });

      if (action === "post") {
        if (!req.body.mediaUrl || req.body.mediaType !== "video") return res.status(400).json({ error: "O For You aceita apenas vídeos curtos." });
        const id = `post_${crypto.randomUUID()}`;
        const post = {
          authorEmail: me,
          authorName: safe(req.body.authorName) || "Usuário",
          authorUsername: safe(req.body.authorUsername) || me.split("@")[0],
          authorAvatar: safe(req.body.authorAvatar),
          text: safe(req.body.text),
          mediaUrl: safe(req.body.mediaUrl),
          mediaType: "video",
          createdAt: new Date().toISOString(),
          likes: 0,
          reposts: 0,
          views: 0
        };
        await putRecord(id, "post", post);
        return res.status(201).json({ post: { id, ...post } });
      }

      if (action === "follow") {
        const target = norm(req.body.target);
        if (!target || target === me) return res.status(400).json({ error: "Perfil inválido." });
        const key = `follow_${me}__${target}`;
        const existing = await getRecord(key);
        const following = Boolean(req.body.following);
        if (following && !existing) await putRecord(key, "follow", { follower: me, following: target, createdAt: new Date().toISOString() });
        if (!following && existing) await db(`/records/${encodeURIComponent(key)}`, { method: "DELETE" });
        return res.status(200).json({ following });
      }

      if (action === "interaction") {
        const postId = safe(req.body.postId);
        const kind = safe(req.body.kind);
        if (!postId || !["like", "save", "repost"].includes(kind)) return res.status(400).json({ error: "Ação inválida." });
        const key = `${kind}_${me}__${postId}`;
        const existing = await getRecord(key);
        const active = Boolean(req.body.active);
        if (active && !existing) await putRecord(key, kind, { user: me, postId, createdAt: new Date().toISOString() });
        if (!active && existing) await db(`/records/${encodeURIComponent(key)}`, { method: "DELETE" });
        return res.status(200).json({ active });
      }
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erro na rede social." });
  }
}

export const config = { api: { bodyParser: true } };
