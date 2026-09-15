const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const apiKey = () => process.env.DATABASE_API_KEY;
const norm = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");
const safe = (value) => String(value || "").trim();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${apiKey()}`, Accept: "application/json", ...(options.headers || {}) } }); }
async function allRecords() { const r = await db("/records?limite=4000"); const p = await r.json(); if (!r.ok) throw Error(p.error || "Não foi possível ler a database."); return p.registros || []; }
async function getRecord(key) { const r = await db(`/records/${encodeURIComponent(key)}`); if (r.status === 404) return null; if (!r.ok) throw Error("Não foi possível ler o registro."); const p = await r.json(); return p.registro || null; }
async function putRecord(key, tipo, data) { const r = await db(`/records/${encodeURIComponent(key)}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({tipo,data}) }); if(!r.ok) throw Error("Não foi possível salvar na database."); return r.json(); }
async function deleteRecord(key) { return db(`/records/${encodeURIComponent(key)}`, {method:"DELETE"}); }
function profileFromRecords(records, target) {
  const wanted=norm(target);
  const login=records.filter(r=>r.tipo==="login").find(r=>{const d=r.data||{};return [d.email,d.usuario,d.username,r.chave?.replace(/^login_/,'')].some(v=>norm(v)===wanted);});
  const loginEmail=norm(login?.data?.email||login?.data?.usuario);
  const profile=records.filter(r=>r.tipo==="profile").find(r=>{const d=r.data||{};return (loginEmail&&norm(d.email)===loginEmail)||[d.email,d.username,r.chave?.replace(/^profile_/,'')].some(v=>norm(v)===wanted);});
  const record=profile||login; if(!record)return null;
  const data={...(login?.data||{}),...(profile?.data||{})}; const email=norm(data.email||data.usuario||record.chave?.replace(/^profile_/,'').replace(/^login_/,'')||"");
  return {email,name:safe(data.name||data.nome)||"Usuário",username:safe(data.username||email.split("@")[0])||"usuario",avatarUrl:safe(data.avatarUrl),bio:safe(data.bio),publicProfile:data.publicProfile!==false};
}
function isFollowing(records,follower,following){const a=norm(follower),b=norm(following);return records.some(r=>r.tipo==="follow"&&norm(r.data?.follower)===a&&norm(r.data?.following)===b&&r.data?.status!=="pending");}
function pendingFollow(records,follower,following){const a=norm(follower),b=norm(following);return records.some(r=>r.tipo==="follow_request"&&norm(r.data?.follower)===a&&norm(r.data?.following)===b&&r.data?.status==="pending");}
function sortNewest(items){return items.sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));}
function postFromRecord(record,records){const b=record.data||{},id=record.chave;return{id,...b,likes:Number(b.likes||0)+records.filter(r=>r.tipo==="like"&&r.data?.postId===id).length,reposts:Number(b.reposts||0)+records.filter(r=>r.tipo==="repost"&&r.data?.postId===id).length,views:Number(b.views||0)};}
function notifyKey(to,kind,source,objectId){return `notification_${norm(to)}__${kind}__${norm(source)}__${safe(objectId)}`;}
async function createNotification(to,kind,source,sourceName,objectId,text){const recipient=norm(to);if(!recipient||recipient===norm(source))return;const payload={to:recipient,kind,source:norm(source),sourceName:safe(sourceName)||"Alguém",objectId:safe(objectId),text:safe(text),createdAt:new Date().toISOString(),read:false};await putRecord(notifyKey(recipient,kind,source,objectId),"notification",payload);try{const mod=await import("./push-send.js");await mod.sendPushToUser(recipient,{title:"RiseUp",body:payload.text,icon:"/assets/images/icon.svg",url:"/perfil"});}catch(e){console.warn("Push indisponível:",e.message);}}

export default async function handler(req,res){
 if(!apiKey())return res.status(500).json({error:"DATABASE_API_KEY não configurada."});
 try{
  const records=await allRecords();
  if(req.method==="GET"){
   const type=safe(req.query?.type||"feed"),viewer=norm(req.query?.me||req.query?.viewer);
   if(type==="feed"||type==="following"){
    const posts=records.filter(r=>r.tipo==="post"&&["video","image"].includes(r.data?.mediaType)).filter(r=>{const author=profileFromRecords(records,r.data?.authorEmail);const visible=!author||author.publicProfile||author.email===viewer||isFollowing(records,viewer,author.email);return visible&&(type!=="following"||isFollowing(records,viewer,r.data?.authorEmail));}).map(r=>postFromRecord(r,records));
    return res.status(200).json({posts:sortNewest(posts)});
   }
   if(type==="profile"){
    const profile=profileFromRecords(records,req.query?.identifier||req.query?.username||req.query?.email);if(!profile)return res.status(404).json({error:"Perfil não encontrado."});
    const follows=records.filter(r=>r.tipo==="follow"&&r.data?.status!=="pending"),canView=profile.publicProfile||profile.email===viewer||isFollowing(records,viewer,profile.email);
    const names=new Set([norm(profile.email),norm(profile.username)]);profile.followers=follows.filter(r=>names.has(norm(r.data?.following))||names.has(norm(r.data?.followingUsername))).length;profile.following=follows.filter(r=>names.has(norm(r.data?.follower))||names.has(norm(r.data?.followerUsername))).length;
    profile.followingMe=isFollowing(records,viewer,profile.email);profile.followRequestPending=pendingFollow(records,viewer,profile.email);profile.isPrivate=!profile.publicProfile;
    const posts=canView?sortNewest(records.filter(r=>r.tipo==="post"&&["video","image"].includes(r.data?.mediaType)&&norm(r.data?.authorEmail)===profile.email).map(r=>postFromRecord(r,records))):[];profile.posts=posts.length;
    return res.status(200).json({profile,posts,canView});
   }
   if(type==="followingUsers"){
    const emails=records.filter(r=>r.tipo==="follow"&&r.data?.status!=="pending"&&norm(r.data?.follower)===viewer).map(r=>norm(r.data?.following));
    const users=[...new Map(emails.map(e=>{const p=profileFromRecords(records,e);return p?[p.email,p]:[e,null];}).filter(x=>x[1])).values()];return res.status(200).json({users});
   }
   if(type==="followRequests"){
    const requests=records.filter(r=>r.tipo==="follow_request"&&r.data?.status==="pending"&&norm(r.data?.following)===viewer).map(r=>{const p=profileFromRecords(records,r.data?.follower);return{id:r.chave,...r.data,profile:p};});return res.status(200).json({requests:sortNewest(requests)});
   }
   if(type==="comments"){
    const postId=safe(req.query?.postId);if(!postId)return res.status(400).json({error:"Post não informado."});
    const comments=sortNewest(records.filter(r=>r.tipo==="comment"&&r.data?.postId===postId).map(r=>({id:r.chave,...r.data})));return res.status(200).json({comments});
   }
   if(type==="recommendations"){
    const users=new Map();records.filter(r=>["login","profile"].includes(r.tipo)).forEach(r=>{const d=r.data||{},email=norm(d.email||d.usuario||r.chave?.replace(/^login_/,'')||"");if(!email||email===viewer)return;const old=users.get(email)||{email,name:"Usuário",username:email.split("@")[0],avatarUrl:"",bio:"",createdAt:r.createdAt||""};old.name=safe(d.name||d.nome)||old.name;old.username=safe(d.username)||old.username;old.avatarUrl=safe(d.avatarUrl)||old.avatarUrl;old.bio=safe(d.bio)||old.bio;users.set(email,old);});
    return res.status(200).json({users:[...users.values()].filter(p=>!isFollowing(records,viewer,p.email)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,8)});
   }
   if(type==="search"){
    const q=norm(req.query?.q);if(q.length<2)return res.status(200).json({users:[],posts:[]});
    const users=records.filter(r=>["login","profile"].includes(r.tipo)).map(r=>profileFromRecords(records,r.data?.email||r.data?.usuario||r.chave)).filter(Boolean).filter((p,i,a)=>a.findIndex(x=>x.email===p.email)===i).filter(p=>[p.name,p.username,p.email].some(v=>norm(v).includes(q))).slice(0,12);
    const posts=records.filter(r=>r.tipo==="post"&&["video","image"].includes(r.data?.mediaType)&&[r.data?.text,r.data?.authorName,r.data?.authorUsername].some(v=>norm(v).includes(q))).filter(r=>{const p=profileFromRecords(records,r.data?.authorEmail);return !p||p.publicProfile||p.email===viewer||isFollowing(records,viewer,p.email)}).map(r=>postFromRecord(r,records)).slice(0,12);return res.status(200).json({users,posts});
   }
   return res.status(400).json({error:"Tipo de consulta inválido."});
  }
  if(req.method==="POST"){
   const action=safe(req.body?.action),me=norm(req.body?.me);if(!me)return res.status(400).json({error:"Usuário não informado."});const actor=profileFromRecords(records,me);
   if(action==="post"){
    if(!req.body.mediaUrl||!["video","image"].includes(req.body.mediaType))return res.status(400).json({error:"Mídia inválida."});
    const id=`post_${crypto.randomUUID()}`,post={authorEmail:me,authorName:safe(req.body.authorName)||actor?.name||"Usuário",authorUsername:safe(req.body.authorUsername)||actor?.username||me.split("@")[0],authorAvatar:safe(req.body.authorAvatar)||actor?.avatarUrl||"",text:safe(req.body.text),mentions:safe(req.body.mentions),mediaUrl:safe(req.body.mediaUrl),mediaType:req.body.mediaType==="image"?"image":"video",createdAt:new Date().toISOString(),likes:0,reposts:0,views:0};await putRecord(id,"post",post);await notifyMentions(records,post,actor,id);return res.status(201).json({post:{id,...post}});
   }
   if(action==="follow"){
    const target=norm(req.body.target);if(!target||target===me)return res.status(400).json({error:"Perfil inválido."});const tp=profileFromRecords(records,target);if(!tp)return res.status(404).json({error:"Perfil não encontrado."});
    const key=`follow_${me}__${tp.email}`,reqKey=`follow_request_${me}__${tp.email}`,following=Boolean(req.body.following),existing=await getRecord(key),pending=await getRecord(reqKey);
    if(following){if(tp.publicProfile){if(!existing)await putRecord(key,"follow",{follower:me,following:tp.email,followingUsername:tp.username,status:"accepted",createdAt:new Date().toISOString()});if(pending)await deleteRecord(reqKey);await createNotification(tp.email,"follow",me,actor?.name,key,`${actor?.name||"Alguém"} começou a seguir você.`);return res.status(200).json({following:true,status:"accepted"});}
      if(existing)return res.status(200).json({following:true,status:"accepted"});if(pending)return res.status(200).json({following:false,status:"pending"});await putRecord(reqKey,"follow_request",{follower:me,following:tp.email,followingUsername:tp.username,status:"pending",createdAt:new Date().toISOString()});await createNotification(tp.email,"follow_request",me,actor?.name,reqKey,`${actor?.name||"Alguém"} quer seguir você.`);return res.status(200).json({following:false,status:"pending"});
    }
    if(existing)await deleteRecord(key);if(pending)await deleteRecord(reqKey);return res.status(200).json({following:false,status:"none"});
   }
   if(action==="followRequest"){
    const requestId=safe(req.body.requestId),accept=Boolean(req.body.accept),request=records.find(r=>r.chave===requestId&&r.tipo==="follow_request");if(!request||norm(request.data?.following)!==me)return res.status(404).json({error:"Solicitação não encontrada."});const follower=norm(request.data.follower),fp=profileFromRecords(records,follower),key=`follow_${follower}__${me}`;
    if(accept){await putRecord(key,"follow",{follower,following:me,followingUsername:actor?.username||"",status:"accepted",createdAt:new Date().toISOString()});await deleteRecord(requestId);await createNotification(follower,"follow_accepted",me,actor?.name,key,`${actor?.name||"Alguém"} aceitou sua solicitação para seguir.`);return res.status(200).json({accepted:true});}
    await deleteRecord(requestId);return res.status(200).json({accepted:false});
   }
   if(action==="comment"){
    const postId=safe(req.body?.postId),text=safe(req.body?.text),parentId=safe(req.body?.parentId);if(!postId||!text)return res.status(400).json({error:"Comentário inválido."});const post=records.find(r=>r.chave===postId&&r.tipo==="post")?.data;if(!post)return res.status(404).json({error:"Publicação não encontrada."});let parent=null;if(parentId){parent=records.find(r=>r.chave===parentId&&r.tipo==="comment")?.data;if(!parent||parent.postId!==postId)return res.status(400).json({error:"Comentário pai inválido."});}const id=`comment_${crypto.randomUUID()}`,comment={postId,parentId:parentId||null,user:me,name:actor?.name||"Usuário",username:actor?.username||me.split("@")[0],avatarUrl:actor?.avatarUrl||"",text:text.slice(0,500),createdAt:new Date().toISOString()};await putRecord(id,"comment",comment);if(parent)await createNotification(parent.user,"reply",me,actor?.name,id,`${actor?.name||"Alguém"} respondeu ao seu comentário.`);else await createNotification(post.authorEmail,"comment",me,actor?.name,id,`${actor?.name||"Alguém"} comentou em sua publicação.`);return res.status(201).json({comment:{id,...comment}});
   }
   if(action==="interaction"){
    const postId=safe(req.body.postId),kind=safe(req.body.kind),active=Boolean(req.body.active);if(!postId||!["like","save","repost"].includes(kind))return res.status(400).json({error:"Ação inválida."});const key=`${kind}_${me}__${postId}`,existing=await getRecord(key);if(active&&!existing){await putRecord(key,kind,{user:me,postId,createdAt:new Date().toISOString()});const post=records.find(r=>r.chave===postId)?.data;if(post)await createNotification(post.authorEmail,kind,me,actor?.name,postId,`${actor?.name||"Alguém"} ${kind==="like"?"curtiu":kind==="repost"?"republicou":"salvou"} sua publicação.`);}if(!active&&existing)await deleteRecord(key);return res.status(200).json({active});
   }
  }
  return res.status(405).json({error:"Método não permitido."});
 }catch(error){console.error(error);return res.status(500).json({error:error.message||"Erro na rede social."});}
}
async function notifyMentions(records,post,actor,id){const mentions=[...String(post.mentions||post.text||"").matchAll(/@([a-zA-Z0-9_.-]+)/g)].map(m=>m[1].toLowerCase());if(!mentions.length)return;for(const r of records.filter(x=>["login","profile"].includes(x.tipo))){const p=profileFromRecords(records,r.data?.email||r.data?.usuario||r.chave);if(p&&mentions.includes(p.username.toLowerCase())&&p.email!==post.authorEmail)await createNotification(p.email,"mention",post.authorEmail,actor?.name,id,`${actor?.name||"Alguém"} marcou você em uma publicação.`);}}
export const config={api:{bodyParser:true}};
