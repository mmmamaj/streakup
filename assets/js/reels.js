const user = JSON.parse(localStorage.getItem("riseup_user") || "null");
if (!user) window.location.replace("/login");

const feed = document.getElementById("reelsFeed");
const profilePanel = document.getElementById("profilePanel");
const postForm = document.getElementById("postForm");
const mediaInput = document.getElementById("postMedia");
const mediaPreview = document.getElementById("mediaPreview");
const postStatus = document.getElementById("postStatus");
const currentEmail = String(user?.email || "").trim().toLowerCase();
const viewingProfile = new URLSearchParams(location.search).has("u");
if (viewingProfile) {
  document.getElementById("postComposer").hidden = true;
  document.getElementById("recommendations").hidden = true;
  document.getElementById("storiesBar").hidden = true;
}
const esc = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const avatarHtml = (name, image, className = "avatar") => image ? `<div class="${className}" style="background-image:url('${esc(image)}');background-size:cover;background-position:center"></div>` : `<div class="${className}">${esc((name || "U").charAt(0).toUpperCase())}</div>`;
let posts = [];
let feedType = "feed";
const actionState = JSON.parse(localStorage.getItem("riseup_actions") || "{}");

function render() {
  if (!posts.length) {
    const followingMessage = feedType === "following" ? "Siga pessoas para ver os vídeos delas aqui." : "O For You mostra vídeos publicados por pessoas reais. Seja a primeira pessoa a publicar.";
    feed.innerHTML = `<div class="empty-feed"><h2>${feedType === "following" ? "Nada no seu seguindo" : "Ainda não há vídeos"}</h2><p class="muted" style="margin-top:8px">${followingMessage}</p><button class="botao" style="margin-top:18px" type="button" id="emptyPostButton">Publicar um vídeo</button></div>`;
    return;
  }
  feed.innerHTML = posts.map((post) => {
    const key = post.id;
    const state = actionState[key] || {};
    return `<article class="reel-card" data-id="${esc(key)}">${post.mediaType === "image" ? `<img class="reel-media-image" src="${esc(post.mediaUrl)}" alt="Publicação de ${esc(post.authorName || "Usuário")}">` : `<video src="${esc(post.mediaUrl)}" controls loop playsinline preload="metadata"></video>`}<div class="reel-gradient"></div><div class="reel-copy"><div class="reel-author">${avatarHtml(post.authorName, post.authorAvatar)}<div><strong>${esc(post.authorName || "Usuário")}</strong><div class="muted">@${esc(post.authorUsername || "usuario")}</div></div></div><p>${esc(post.text)}</p>${post.mentions ? `<small class="muted">Marcados: ${esc(post.mentions)}</small>` : ""}</div><div class="reel-actions"><button class="reel-action ${state.like ? "active" : ""}" data-action="like">♥<span>${Number(post.likes || 0) + (state.like ? 1 : 0)}</span></button><button class="reel-action" data-action="comment">💬<span>Comentar</span></button><button class="reel-action ${state.repost ? "active" : ""}" data-action="repost">↻<span>${state.repost ? "Repostado" : "Repostar"}</span></button><button class="reel-action ${state.save ? "active" : ""}" data-action="save">🔖<span>${state.save ? "Salvo" : "Salvar"}</span></button><button class="reel-action" data-action="share">↗<span>Compartilhar</span></button></div></article>`;
  }).join("");
  feed.querySelectorAll("video").forEach((video) => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) video.play().catch(() => {}); else video.pause(); }, { threshold: .6 });
    observer.observe(video);
  });
}

async function loadFeed() {
  if (new URLSearchParams(location.search).has("u")) return;
  try {
    const response = await fetch(`/api/social?type=${feedType}&me=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    posts = data.posts || [];
    render();
  } catch {
    feed.innerHTML = `<div class="empty-feed"><h2>Não foi possível carregar o For You</h2><p class="muted" style="margin-top:8px">Verifique a conexão com a database e tente novamente.</p><button class="botao" style="margin-top:18px" type="button" id="retryFeed">Tentar novamente</button></div>`;
  }
}

async function searchGlobal(query) {
  const box = document.getElementById("searchResults"); if (!box) return;
  if (!query || query.length < 2) { box.hidden = true; box.innerHTML = ""; return; }
  try {
    const response = await fetch(`/api/social?type=search&q=${encodeURIComponent(query)}&me=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw Error();
    box.hidden = false;
    const users = (data.users || []).map((person) => `<button class="search-result-row" type="button" data-profile-search="${esc(person.username)}">${avatarHtml(person.name, person.avatarUrl)}<span><strong>${esc(person.name)}</strong><small>@${esc(person.username)} · perfil</small></span><b aria-hidden="true">›</b></button>`).join("");
    const posts = (data.posts || []).map((post) => `<button class="search-result-row" data-post-search="${esc(post.id)}"><video class="search-video" src="${esc(post.mediaUrl)}" muted></video><span><strong>${esc(post.authorName)}</strong><small>${esc(post.text || "Vídeo")}</small></span></button>`).join("");
    box.innerHTML = `<h3>Usuários</h3>${users || `<div class="search-empty">Nenhum usuário encontrado.</div>`}<h3>Vídeos</h3>${posts || `<div class="search-empty">Nenhum vídeo encontrado.</div>`}`;
  } catch { box.hidden = false; box.innerHTML = `<div class="search-empty">Busca indisponível agora.</div>`; }
}
document.getElementById("globalSearchForm")?.addEventListener("submit", (event) => { event.preventDefault(); searchGlobal(document.getElementById("globalSearchInput").value.trim()); });
document.getElementById("globalSearchInput")?.addEventListener("input", (event) => searchGlobal(event.target.value.trim()));
document.getElementById("searchResults")?.addEventListener("click", (event) => {
  const profile = event.target.closest("[data-profile-search]");
  if (profile) {
    const username = profile.dataset.profileSearch;
    history.pushState({ profile: username }, "", `/perfil?u=${encodeURIComponent(username)}`);
    profilePanel.classList.add("open");
    const results = document.getElementById("searchResults");
    if (results) results.hidden = true;
    clearProfilePanel();
    loadProfile();
    profilePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const post = event.target.closest("[data-post-search]");
  if (post) document.querySelector(`[data-id="${CSS.escape(post.dataset.postSearch)}"]`)?.scrollIntoView({ behavior: "smooth" });
});

async function loadRecommendations() {
  const list = document.getElementById("recommendationList"); if (!list) return;
  try {
    const response = await fetch(`/api/social?type=recommendations&me=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw Error();
    list.innerHTML = (data.users || []).map((person) => `<div class="recommendation">${avatarHtml(person.name, person.avatarUrl)}<span class="recommendation-copy"><strong>${esc(person.name)}</strong><small>@${esc(person.username)}</small></span><button type="button" data-recommend-follow="${esc(person.email)}">Seguir</button></div>`).join("") || `<div class="recommendation-empty">Você já conhece todo mundo por aqui.</div>`;
  } catch { list.innerHTML = `<div class="recommendation-empty">Recomendações indisponíveis agora.</div>`; }
}
document.getElementById("recommendationList")?.addEventListener("click", async (event) => { const button = event.target.closest("[data-recommend-follow]"); if (!button) return; button.disabled = true; const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow", me: currentEmail, target: button.dataset.recommendFollow, following: true }) }); if (response.ok) { button.textContent = "Seguindo"; loadRecommendations(); } else button.disabled = false; });
document.getElementById("refreshRecommendations")?.addEventListener("click", loadRecommendations);

function clearProfilePanel() {
  document.getElementById("profileName").textContent = "Carregando...";
  document.getElementById("profileUsername").textContent = "";
  document.getElementById("profileBio").textContent = "";
  document.getElementById("postsCount").textContent = "—";
  document.getElementById("followersCount").textContent = "—";
  document.getElementById("followingCount").textContent = "—";
  const avatar = document.getElementById("profileAvatar");
  avatar.textContent = "";
  avatar.style.backgroundImage = "";
}

async function loadProfile() {
  const params = new URLSearchParams(location.search);
  const target = params.get("u") || currentEmail;
  const isOwnRoute = !params.has("u");
  clearProfilePanel();
  try {
    const query = isOwnRoute
      ? `email=${encodeURIComponent(currentEmail)}`
      : `identifier=${encodeURIComponent(target)}`;
    const response = await fetch(`/api/social?type=profile&${query}&viewer=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Perfil não encontrado.");
    const p = data.profile;
    const isOwnProfile = String(p.email).toLowerCase() === currentEmail;
    document.getElementById("postComposer").hidden = !isOwnProfile;
    document.getElementById("recommendations").hidden = !isOwnProfile;
    document.getElementById("storiesBar").hidden = !isOwnProfile;
    if (!isOwnProfile) {
      posts = data.posts || [];
      feedType = "profile";
      render();
    } else if (isOwnRoute) {
      posts = [];
      feedType = "feed";
      loadFeed();
    }
    document.getElementById("profileName").textContent = p.name;
    document.getElementById("profileUsername").textContent = `@${p.username}`;
    document.getElementById("profileBio").textContent = p.bio || "";
    const privacyNote = document.getElementById("profilePrivacyNote");
    if (privacyNote) { privacyNote.hidden = isOwnProfile || p.publicProfile; privacyNote.textContent = p.followingMe ? "🔒 Você segue este perfil e pode ver todas as publicações." : "🔒 Este perfil é privado. Foto, usuário e bio são públicos; siga para solicitar acesso."; }
    document.getElementById("followersCount").textContent = p.followers;
    document.getElementById("followingCount").textContent = p.following;
    document.getElementById("postsCount").textContent = p.posts;
    const avatar = document.getElementById("profileAvatar");
    avatar.textContent = p.avatarUrl ? "" : (p.name || "U").charAt(0).toUpperCase();
    avatar.style.backgroundImage = p.avatarUrl ? `url("${p.avatarUrl.replace(/"/g, '%22')}")` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    const followButton = document.getElementById("followButton");
    const editButton = document.getElementById("profileEditButton");
    const storyButton = document.getElementById("storyFromProfile");
    if (isOwnProfile) {
      followButton.hidden = true;
      editButton.hidden = false;
      storyButton.hidden = false;
    } else {
      followButton.hidden = false;
      editButton.hidden = true;
      storyButton.hidden = true;
      followButton.textContent = p.followingMe ? "Seguindo" : (p.followRequestPending ? "Solicitado" : (p.isPrivate ? "Solicitar para seguir" : "Seguir"));
      followButton.classList.toggle("is-following", Boolean(p.followingMe));
      followButton.classList.toggle("is-pending", Boolean(p.followRequestPending));
      followButton.onclick = () => toggleFollow(p.email, followButton);
    }
    if (params.has("u")) profilePanel.classList.add("open");
  } catch (error) {
    document.getElementById("profileName").textContent = "Perfil indisponível";
    document.getElementById("profileUsername").textContent = "";
    document.getElementById("profileBio").textContent = error.message || "Não foi possível carregar este perfil.";
    document.getElementById("followButton").hidden = true;
    document.getElementById("profileEditButton").hidden = true;
  }
}
async function toggleFollow(target, button) {
  button.disabled = true;
  const following = !button.classList.contains("is-following") && !button.classList.contains("is-pending");
  try {
    const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow", me: currentEmail, target, following }) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Falha ao seguir.");
    if (following && data.status === "pending") button.textContent = "Solicitado";
    else button.textContent = following ? "Seguindo" : "Seguir";
    await loadProfile();
loadRecommendations();
  } catch { postStatus.textContent = "Não foi possível atualizar o seguindo."; }
  finally { button.disabled = false; }
}

async function publishVideo(file, text) {
  if (!file || !["video/","image/"].some((x) => file.type.startsWith(x))) throw Error("Escolha uma foto ou vídeo.");
  if (file.size > 50 * 1024 * 1024) throw Error("O arquivo deve ter até 50 MB.");
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error("Não foi possível ler o vídeo.")); reader.readAsDataURL(file); });
  const uploadResponse = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, filename: file.name }) });
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok) throw Error(upload.error || "Falha no upload do vídeo.");
  const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post", me: currentEmail, authorName: user.name, authorUsername: user.username || currentEmail.split("@")[0], authorAvatar: user.avatarUrl || "", text, mentions: document.getElementById("postMentions")?.value.trim() || "", mediaUrl: upload.url, mediaType: file.type.startsWith("image/") ? "image" : "video" }) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Não foi possível publicar o vídeo.");
}

mediaInput?.addEventListener("change", () => {
  const file = mediaInput.files?.[0];
  if (!file) { mediaPreview.innerHTML = ""; return; }
  mediaPreview.innerHTML = `<video class="composer-media" controls src="${URL.createObjectURL(file)}"></video><small class="muted">${esc(file.name)}</small>`;
});
postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = mediaInput?.files?.[0];
  const text = document.getElementById("postText").value.trim();
  const button = postForm.querySelector("button[type=submit]");
  postStatus.className = "";
  postStatus.textContent = "Publicando...";
  button.disabled = true;
  try {
    await publishVideo(file, text);
    postForm.reset();
    mediaPreview.innerHTML = "";
    postStatus.className = "success";
    postStatus.textContent = "Vídeo publicado com sucesso.";
    feedType = "feed";
    document.querySelectorAll(".feed-switch a").forEach((item) => item.classList.toggle("active", item.id !== "followingTab"));
    await loadFeed();
  } catch (error) { postStatus.className = "error"; postStatus.textContent = error.message || "Não foi possível publicar."; }
  finally { button.disabled = false; }
});

async function openComments(postId){
  const sheet=document.getElementById("commentSheet"); if(!sheet)return;
  sheet.hidden=false; sheet.innerHTML=`<div class="comment-sheet-inner"><button class="comment-close" type="button" aria-label="Fechar"></button><h3>Comentários</h3><div class="comment-list">Carregando...</div><div class="replying-bar" hidden></div><form class="comment-form"><input maxlength="500" placeholder="Adicione um comentário..." autocomplete="off"><button>Enviar</button></form></div>`;
  sheet.classList.add("show");
  const list=sheet.querySelector('.comment-list'), form=sheet.querySelector('.comment-form'), input=form.querySelector('input'), replying=sheet.querySelector('.replying-bar');
  let comments=[]; let replyTo=null;
  const renderComments=()=>{
    const byParent=new Map(); comments.forEach(c=>{const key=c.parentId||'root';if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(c);});
    const avatar=c=>c.avatarUrl?`<div class="comment-avatar" style="background-image:url('${esc(c.avatarUrl)}');background-size:cover;background-position:center"></div>`:`<div class="comment-avatar">${esc((c.name||'U').charAt(0).toUpperCase())}</div>`;
    const draw=(parent='root',depth=0)=> (byParent.get(parent)||[]).map(c=>`<div class="comment-wrap" data-comment-id="${esc(c.id)}"><div class="comment-item"><div>${avatar(c)}</div><div class="comment-body"><div><strong>${esc(c.name)}</strong><span class="comment-time">@${esc(c.username)}</span></div><p>${esc(c.text)}</p><div class="comment-actions"><button type="button" data-reply-comment="${esc(c.id)}">Responder</button><button type="button" data-like-comment="${esc(c.id)}">♡</button></div>${draw(c.id,depth+1)?`<div class="comment-replies">${draw(c.id,depth+1)}</div>`:''}</div></div></div>`).join('');
    list.innerHTML=draw()||'<div class="muted">Ainda não há comentários.</div>';
  };
  try{ const r=await fetch(`/api/social?type=comments&postId=${encodeURIComponent(postId)}`,{cache:'no-store'}); const d=await r.json(); comments=d.comments||[]; renderComments(); }catch{list.innerHTML='<div class="muted">Não foi possível carregar os comentários.</div>'}
  list.addEventListener('click',e=>{const b=e.target.closest('[data-reply-comment]');if(!b)return;replyTo=comments.find(c=>c.id===b.dataset.replyComment)||null;if(!replyTo)return;replying.hidden=false;replying.innerHTML=`Respondendo a <strong>@${esc(replyTo.username)}</strong><button type="button" data-cancel-reply>Cancelar</button>`;input.placeholder=`Responder @${replyTo.username}...`;input.focus();});
  replying.addEventListener('click',e=>{if(e.target.closest('[data-cancel-reply]')){replyTo=null;replying.hidden=true;input.placeholder='Adicione um comentário...';}});
  form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;const r=await fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'comment',me:currentEmail,postId,text,parentId:replyTo?.id||null})});if(r.ok){input.value='';replyTo=null;replying.hidden=true;input.placeholder='Adicione um comentário...';const d=await r.json();comments.push(d.comment);renderComments();}};
  sheet.querySelector('.comment-close').onclick=()=>{sheet.classList.remove('show');setTimeout(()=>sheet.hidden=true,220)}; sheet.onclick=e=>{if(e.target===sheet)sheet.querySelector('.comment-close').click()};
}

feed.addEventListener("click", async (event) => {
  const emptyPost = event.target.closest("#emptyPostButton");
  if (emptyPost) { postForm?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("postMedia")?.focus(); return; }
  if (event.target.closest("#retryFeed")) { loadFeed(); return; }
  const button = event.target.closest("[data-action]");
  const card = event.target.closest("[data-id]");
  if (!button || !card) return;
  const id = card.dataset.id;
  const kind = button.dataset.action;
  if (kind === "comment") { openComments(id); return; }
  if (kind === "share") {
    const url = `${location.origin}/perfil?post=${encodeURIComponent(id)}`;
    try { if (navigator.share) await navigator.share({ title: "RiseUp", url }); else { await navigator.clipboard?.writeText(url); button.querySelector("span").textContent = "Copiado"; } } catch { /* usuário cancelou o compartilhamento */ }
    return;
  }
  const current = actionState[id] || {};
  current[kind] = !current[kind];
  actionState[id] = current;
  localStorage.setItem("riseup_actions", JSON.stringify(actionState));
  render();
  fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "interaction", me: currentEmail, postId: id, kind, active: current[kind] }) }).catch(() => {});
});

function updatePostNavVisibility(){
  const plus=document.getElementById('postToggle');
  if(!plus)return;
  const params=new URLSearchParams(location.search);
  const isForYou=!params.has('u') && (location.hash==='' || location.hash==='#foryou');
  plus.classList.toggle('is-hidden',!isForYou);
}
updatePostNavVisibility();
window.addEventListener('hashchange',updatePostNavVisibility);
document.getElementById("profileToggle")?.addEventListener("click", (event) => {
  event.preventDefault();
  history.pushState({}, "", "/perfil");
  profilePanel.classList.add("open");
  loadProfile();
  profilePanel.scrollIntoView({ behavior: "smooth", block: "start" });
});
window.addEventListener("popstate", () => {
  if (new URLSearchParams(location.search).has("u")) {
    profilePanel.classList.add("open");
    loadProfile();
  } else {
    profilePanel.classList.remove("open");
    document.getElementById("postComposer").hidden = false;
    document.getElementById("recommendations").hidden = false;
    document.getElementById("storiesBar").hidden = false;
    loadFeed();
  }
});
document.getElementById("postToggle")?.addEventListener("click", (event) => { if (new URLSearchParams(location.search).has("u")) { event.preventDefault(); window.location.href = "/perfil#postComposer"; return; } event.preventDefault(); postForm?.scrollIntoView({ behavior: "smooth", block: "center" }); });
document.getElementById("searchNav")?.addEventListener("click", () => setTimeout(() => document.getElementById("globalSearchInput")?.focus(), 100));
document.getElementById("profileEditButton")?.addEventListener("click", () => { window.location.href = "/configuracoes"; });
document.getElementById("shareProfile")?.addEventListener("click", async () => { const url = location.href; try { await navigator.clipboard?.writeText(url); alert("Link do perfil copiado."); } catch { /* compartilhamento cancelado */ } });
document.getElementById("storyFromProfile")?.addEventListener("click", () => document.getElementById("newStoryButton")?.click());
document.getElementById("newHighlight")?.addEventListener("click", () => document.getElementById("newStoryButton")?.click());
document.getElementById("followingTab")?.addEventListener("click", (event) => { event.preventDefault(); feedType = "following"; document.querySelectorAll(".feed-switch a").forEach((item) => item.classList.toggle("active", item.id === "followingTab")); loadFeed(); });
document.querySelector(".feed-switch a.active")?.addEventListener("click", (event) => { if (event.currentTarget.id === "followingTab") return; event.preventDefault(); feedType = "feed"; document.querySelectorAll(".feed-switch a").forEach((item) => item.classList.toggle("active", item.id !== "followingTab")); loadFeed(); });
loadFeed();
loadProfile();
if (location.hash === "#searchResults") setTimeout(() => document.getElementById("globalSearchInput")?.focus(), 150);

async function uploadStoryImage(file) {
  if (!file || !file.type.startsWith("image/")) throw Error("Escolha uma imagem para o story.");
  if (file.size > 8 * 1024 * 1024) throw Error("A imagem deve ter até 8 MB.");
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error("Não foi possível ler a imagem.")); reader.readAsDataURL(file); });
  const uploadResponse = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, filename: file.name }) });
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok) throw Error(upload.error || "Falha no upload da imagem.");
  return { url: upload.url, type: file.type };
}
function storyAvatar(story) { return story.mediaUrl ? `<img src="${esc(story.mediaUrl)}" alt="">` : `<span>${esc((story.authorName || "U").charAt(0).toUpperCase())}</span>`; }
async function loadStories() {
  const bar = document.getElementById("storiesBar"); if (!bar) return;
  try {
    const response = await fetch(`/api/stories?me=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw Error();
    allStories = data.stories || []; const grouped = [...new Map(allStories.map((story) => [story.authorEmail, story])).values()];
    const ownStory = (data.stories || []).find((story) => String(story.authorEmail).toLowerCase() === currentEmail);
    const highlight = document.getElementById("selfHighlight");
    if (highlight && ownStory?.mediaUrl) highlight.innerHTML = `<span class="highlight-ring"><img src="${esc(ownStory.mediaUrl)}" alt=""></span><small>Destaques</small>`;
    bar.innerHTML = `<button class="story-trigger" id="newStoryButton" type="button"><span class="story-ring"><span class="story-plus">＋</span></span><span>Seu story</span></button>${grouped.map((story) => `<button class="story-trigger" data-story-url="${esc(story.mediaUrl)}" data-story-author="${esc(story.authorEmail)}" type="button"><span class="story-ring">${storyAvatar(story)}</span><span>${esc(story.authorName || story.authorUsername)}</span></button>`).join("")}`;
  } catch { bar.innerHTML = `<button class="story-trigger" id="newStoryButton" type="button"><span class="story-ring"><span class="story-plus">＋</span></span><span>Seu story</span></button>`; }
}
async function createStory(file) {
  const media = await uploadStoryImage(file);
  const response = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ me: currentEmail, authorName: user.name, authorUsername: user.username || currentEmail.split("@")[0], mediaUrl: media.url, mediaType: media.type }) });
  const data = await response.json(); if (!response.ok) throw Error(data.error || "Não foi possível publicar o story.");
  
async function loadMentionUsers() {
  try { const r=await fetch(`/api/social?type=followingUsers&me=${encodeURIComponent(currentEmail)}`,{cache:"no-store"}); const d=await r.json(); return d.users||[]; } catch { return []; }
}
function setupMentionPicker(inputId, menuId) {
  const input=document.getElementById(inputId), menu=document.getElementById(menuId); if(!input||!menu)return;
  let users=[];
  const close=()=>{menu.hidden=true;menu.innerHTML="";};
  input.addEventListener("input",async()=>{
    const value=input.value, match=value.match(/@([a-zA-Z0-9_.-]*)$/); if(!match){close();return;}
    users=await loadMentionUsers(); const q=match[1].toLowerCase(); const list=users.filter(u=>!q||u.username.toLowerCase().startsWith(q)).slice(0,7);
    menu.innerHTML=list.map(u=>`<button type="button" class="mention-option" data-mention="${esc(u.username)}">${avatarHtml(u.name,u.avatarUrl,"avatar")}<span><strong>${esc(u.name)}</strong><small>@${esc(u.username)}</small></span></button>`).join("")||`<div class="muted" style="padding:10px">Nenhuma pessoa seguida encontrada.</div>`;menu.hidden=!list.length;
  });
  menu.addEventListener("click",e=>{const b=e.target.closest("[data-mention]");if(!b)return;const username=b.dataset.mention;input.value=input.value.replace(/@([a-zA-Z0-9_.-]*)$/,`@${username} `);close();input.focus();});
  document.addEventListener("click",e=>{if(!e.target.closest(`#${inputId}`)&&!e.target.closest(`#${menuId}`))close();});
}
setupMentionPicker("postText","mentionMenu");setupMentionPicker("postMentions","mentionMenu");
setupMentionPicker("storyText","storyMentionMenu");setupMentionPicker("storyMentions","storyMentionMenu");

// Short-video fullscreen: tap the media; double tap likes it.
feed.addEventListener("click",async e=>{const media=e.target.closest("video,.reel-media-image");if(!media||e.target.closest("button"))return;const card=media.closest(".reel-card");if(!card)return;try{if(card.requestFullscreen)await card.requestFullscreen();}catch{}});
let lastTap=0;feed.addEventListener("dblclick",e=>{const media=e.target.closest("video,.reel-media-image");if(!media)return;const b=media.closest(".reel-card")?.querySelector('[data-action="like"]');if(b&&!b.classList.contains("active"))b.click();});

function openStoryComposer(){const m=document.getElementById("storyComposer");if(m)m.hidden=false;}
function closeStoryComposer(){const m=document.getElementById("storyComposer");if(m)m.hidden=true;}
function resetStoryComposer(){document.getElementById("storyMedia").value="";document.getElementById("storyText").value="";document.getElementById("storyMentions").value="";document.getElementById("storyPreview").innerHTML="";document.getElementById("storyStatus").textContent="";}
document.getElementById("newStoryButton")?.addEventListener("click",openStoryComposer);
document.getElementById("storyComposerClose")?.addEventListener("click",()=>{closeStoryComposer();resetStoryComposer();});
document.getElementById("storyComposerCancel")?.addEventListener("click",()=>{closeStoryComposer();resetStoryComposer();});
document.getElementById("storyMedia")?.addEventListener("change",e=>{const f=e.target.files?.[0];const box=document.getElementById("storyPreview");box.innerHTML=f?`<img src="${URL.createObjectURL(f)}" alt="Prévia do story">`:"";});
document.getElementById("storyComposerPublish")?.addEventListener("click",async()=>{const f=document.getElementById("storyMedia")?.files?.[0],status=document.getElementById("storyStatus");if(!f){status.textContent="Escolha uma foto.";return;}status.textContent="Publicando...";try{const media=await uploadStoryImage(f);const response=await fetch("/api/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({me:currentEmail,authorName:user.name,authorUsername:user.username||currentEmail.split("@")[0],mediaUrl:media.url,mediaType:media.type,text:document.getElementById("storyText").value.trim(),mentions:document.getElementById("storyMentions").value.trim()})});const data=await response.json();if(!response.ok)throw Error(data.error||"Não foi possível publicar o story.");status.textContent="Publicado!";await loadStories();setTimeout(()=>{closeStoryComposer();resetStoryComposer();},400);}catch(err){status.textContent=err.message;}});

document.getElementById("storyPrev")?.addEventListener("click",()=>showStoryAt(storyIndex-1));document.getElementById("storyNext")?.addEventListener("click",()=>showStoryAt(storyIndex+1));

loadStories();
}
let storyQueue=[]; let storyIndex=0; let storyTimer=null; let allStories=[];
function closeStoryViewer(){clearTimeout(storyTimer);document.getElementById("storyViewer")?.classList.remove("open");}
function showStoryAt(index){ if(!storyQueue.length)return closeStoryViewer(); if(index>=storyQueue.length)return closeStoryViewer(); storyIndex=index; const story=storyQueue[index]; document.getElementById("storyImage").src=story.mediaUrl; document.getElementById("storyCaption").textContent=story.text||""; document.getElementById("storyViewer").classList.add("open"); const progress=document.getElementById('storyProgress'); if(progress){progress.style.transition='none';progress.style.width='0%';requestAnimationFrame(()=>{progress.style.transition='width 5s linear';progress.style.width='100%';});} clearTimeout(storyTimer);storyTimer=setTimeout(()=>showStoryAt(index+1),5000);}
const storiesBar = document.getElementById("storiesBar");
storiesBar?.addEventListener("click", async (event) => {
  const trigger = event.target.closest("#newStoryButton");
  if (trigger) { openStoryComposer(); return; }
  const story = event.target.closest("[data-story-url]"); if (story) { const author=story.dataset.storyAuthor; storyQueue=allStories.filter(x=>!author||x.authorEmail===author); showStoryAt(0); }
});
document.getElementById("closeStory")?.addEventListener("click", closeStoryViewer); document.getElementById("storyViewer")?.addEventListener("click", e=>{if(e.target.id==="storyImage")showStoryAt(storyIndex+1)});
loadStories();
