const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const norm = (value) => String(value || "").trim().toLowerCase();
const safe = (value) => String(value || "").trim();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${process.env.DATABASE_API_KEY}`, Accept: "application/json", ...(options.headers || {}) } }); }
async function records() { const response = await db("/records?limite=2000"); const payload = await response.json(); if (!response.ok) throw Error(payload.error || "Não foi possível carregar stories."); return payload.registros || []; }
function follows(all, follower, following) { return all.some((r) => r.tipo === "follow" && norm(r.data?.follower) === norm(follower) && (norm(r.data?.following) === norm(following) || norm(r.data?.followingUsername) === norm(following))); }
export default async function handler(req, res) {
  if (!process.env.DATABASE_API_KEY) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  const me = norm(req.query?.me || req.body?.me); if (!me) return res.status(400).json({ error: "Usuário não informado." });
  try {
    const all = await records();
    if (req.method === "GET") {
      const now = Date.now();
      const stories = all.filter((r) => r.tipo === "story" && new Date(r.data?.expiresAt).getTime() > now).filter((r) => norm(r.data?.authorEmail) === me || follows(all, me, r.data?.authorEmail) || r.data?.publicProfile !== false).map((r) => ({ id: r.chave, ...r.data })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ stories });
    }
    if (req.method === "POST") {
      if (!req.body.mediaUrl || !String(req.body.mediaType || "").startsWith("image/")) return res.status(400).json({ error: "Story precisa ser uma imagem." });
      const all = await records();
      const id = `story_${crypto.randomUUID()}`, createdAt = new Date(), story = { authorEmail: me, authorName: safe(req.body.authorName) || me.split("@")[0], authorUsername: safe(req.body.authorUsername) || me.split("@")[0], mediaUrl: safe(req.body.mediaUrl), mediaType: safe(req.body.mediaType), text: safe(req.body.text), mentions: safe(req.body.mentions), createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString() };
      const response = await db(`/records/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "story", data: story }) });
      if (!response.ok) return res.status(response.status).json({ error: "Não foi possível publicar o story." });
      await notifyStoryMentions(all, story, id);
      return res.status(201).json({ story: { id, ...story } });
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) { console.error(error); return res.status(500).json({ error: error.message || "Erro nos stories." }); }
}

async function notifyStoryMentions(all, story, id) {
  const mentions=[...String(story.mentions||story.text||"").matchAll(/@([a-zA-Z0-9_.-]+)/g)].map(m=>m[1].toLowerCase());
  if(!mentions.length)return;
  const profiles=new Map();
  for(const r of all.filter(x=>["login","profile"].includes(x.tipo))){const d=r.data||{},email=norm(d.email||d.usuario||r.chave?.replace(/^login_/,"")||"");if(email)profiles.set(email,{email,username:safe(d.username)||email.split("@")[0]});}
  for(const p of profiles.values()) if(mentions.includes(p.username.toLowerCase())&&p.email!==story.authorEmail) { const key=`notification_${p.email}__mention__${story.authorEmail}__${id}`; await db(`/records/${encodeURIComponent(key)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo:"notification",data:{to:p.email,kind:"mention",source:story.authorEmail,sourceName:story.authorName,objectId:id,text:`${story.authorName} marcou você em um story.`,createdAt:new Date().toISOString(),read:false}})}); }
}
