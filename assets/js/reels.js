const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
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
const actionState = JSON.parse(localStorage.getItem("streakup_actions") || "{}");

function render() {
  if (!posts.length) {
    const followingMessage = feedType === "following" ? "Siga pessoas para ver os vídeos delas aqui." : "O For You mostra vídeos publicados por pessoas reais. Seja a primeira pessoa a publicar.";
    feed.innerHTML = `<div class="empty-feed"><h2>${feedType === "following" ? "Nada no seu seguindo" : "Ainda não há vídeos"}</h2><p class="muted" style="margin-top:8px">${followingMessage}</p><button class="botao" style="margin-top:18px" type="button" id="emptyPostButton">Publicar um vídeo</button></div>`;
    return;
  }
  feed.innerHTML = posts.map((post) => {
    const key = post.id;
    const state = actionState[key] || {};
    return `<article class="reel-card" data-id="${esc(key)}"><video src="${esc(post.mediaUrl)}" controls loop playsinline preload="metadata"></video><div class="reel-gradient"></div><div class="reel-copy"><div class="reel-author">${avatarHtml(post.authorName, post.authorAvatar)}<div><strong>${esc(post.authorName || "Usuário")}</strong><div class="muted">@${esc(post.authorUsername || "usuario")}</div></div></div><p>${esc(post.text)}</p>${post.mentions ? `<small class="muted">Marcados: ${esc(post.mentions)}</small>` : ""}</div><div class="reel-actions"><button class="reel-action ${state.like ? "active" : ""}" data-action="like">♥<span>${Number(post.likes || 0) + (state.like ? 1 : 0)}</span></button><button class="reel-action ${state.save ? "active" : ""}" data-action="save">🔖<span>${state.save ? "Salvo" : "Salvar"}</span></button><button class="reel-action ${state.repost ? "active" : ""}" data-action="repost">↻<span>${state.repost ? "Repostado" : "Repostar"}</span></button><button class="reel-action" data-action="share">↗<span>Enviar</span></button></div></article>`;
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
      followButton.textContent = p.followingMe ? "Seguindo" : "Seguir";
      followButton.classList.toggle("is-following", Boolean(p.followingMe));
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
  const following = button.textContent !== "Seguindo";
  try {
    const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow", me: currentEmail, target, following }) });
    if (!response.ok) throw Error();
    button.textContent = following ? "Seguindo" : "Seguir";
    await loadProfile();
loadRecommendations();
  } catch { postStatus.textContent = "Não foi possível atualizar o seguindo."; }
  finally { button.disabled = false; }
}

async function publishVideo(file, text) {
  if (!file || !file.type.startsWith("video/")) throw Error("Escolha um arquivo de vídeo.");
  if (file.size > 50 * 1024 * 1024) throw Error("O vídeo deve ter até 50 MB.");
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error("Não foi possível ler o vídeo.")); reader.readAsDataURL(file); });
  const uploadResponse = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, filename: file.name }) });
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok) throw Error(upload.error || "Falha no upload do vídeo.");
  const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post", me: currentEmail, authorName: user.name, authorUsername: user.username || currentEmail.split("@")[0], authorAvatar: user.avatarUrl || "", text, mentions: document.getElementById("postMentions")?.value.trim() || "", mediaUrl: upload.url, mediaType: "video" }) });
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

feed.addEventListener("click", async (event) => {
  const emptyPost = event.target.closest("#emptyPostButton");
  if (emptyPost) { postForm?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("postMedia")?.focus(); return; }
  if (event.target.closest("#retryFeed")) { loadFeed(); return; }
  const button = event.target.closest("[data-action]");
  const card = event.target.closest("[data-id]");
  if (!button || !card) return;
  const id = card.dataset.id;
  const kind = button.dataset.action;
  if (kind === "share") {
    const url = `${location.origin}/perfil?post=${encodeURIComponent(id)}`;
    try { if (navigator.share) await navigator.share({ title: "StreakUp", url }); else { await navigator.clipboard?.writeText(url); button.querySelector("span").textContent = "Copiado"; } } catch { /* usuário cancelou o compartilhamento */ }
    return;
  }
  const current = actionState[id] || {};
  current[kind] = !current[kind];
  actionState[id] = current;
  localStorage.setItem("streakup_actions", JSON.stringify(actionState));
  render();
  fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "interaction", me: currentEmail, postId: id, kind, active: current[kind] }) }).catch(() => {});
});

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
    const grouped = [...new Map((data.stories || []).map((story) => [story.authorEmail, story])).values()];
    const ownStory = (data.stories || []).find((story) => String(story.authorEmail).toLowerCase() === currentEmail);
    const highlight = document.getElementById("selfHighlight");
    if (highlight && ownStory?.mediaUrl) highlight.innerHTML = `<span class="highlight-ring"><img src="${esc(ownStory.mediaUrl)}" alt=""></span><small>Destaques</small>`;
    bar.innerHTML = `<button class="story-trigger" id="newStoryButton" type="button"><span class="story-ring"><span class="story-plus">＋</span></span><span>Seu story</span></button>${grouped.map((story) => `<button class="story-trigger" data-story-url="${esc(story.mediaUrl)}" type="button"><span class="story-ring">${storyAvatar(story)}</span><span>${esc(story.authorName || story.authorUsername)}</span></button>`).join("")}`;
  } catch { bar.innerHTML = `<button class="story-trigger" id="newStoryButton" type="button"><span class="story-ring"><span class="story-plus">＋</span></span><span>Seu story</span></button>`; }
}
async function createStory(file) {
  const media = await uploadStoryImage(file);
  const response = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ me: currentEmail, authorName: user.name, authorUsername: user.username || currentEmail.split("@")[0], mediaUrl: media.url, mediaType: media.type }) });
  const data = await response.json(); if (!response.ok) throw Error(data.error || "Não foi possível publicar o story.");
  loadStories();
}
const storiesBar = document.getElementById("storiesBar");
storiesBar?.addEventListener("click", async (event) => {
  const trigger = event.target.closest("#newStoryButton");
  if (trigger) { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = async () => { try { await createStory(input.files?.[0]); } catch (error) { alert(error.message); } }; input.click(); return; }
  const story = event.target.closest("[data-story-url]"); if (story) { document.getElementById("storyImage").src = story.dataset.storyUrl; document.getElementById("storyViewer").classList.add("open"); }
});
document.getElementById("closeStory")?.addEventListener("click", () => document.getElementById("storyViewer")?.classList.remove("open"));
loadStories();
