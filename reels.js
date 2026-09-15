const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
if (!user) window.location.replace("/login");

const feed = document.getElementById("reelsFeed");
const profilePanel = document.getElementById("profilePanel");
const postForm = document.getElementById("postForm");
const mediaInput = document.getElementById("postMedia");
const mediaPreview = document.getElementById("mediaPreview");
const postStatus = document.getElementById("postStatus");
const currentEmail = String(user?.email || "").trim().toLowerCase();
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
    return `<article class="reel-card" data-id="${esc(key)}"><video src="${esc(post.mediaUrl)}" controls loop playsinline preload="metadata"></video><div class="reel-gradient"></div><div class="reel-copy"><div class="reel-author">${avatarHtml(post.authorName, post.authorAvatar)}<div><strong>${esc(post.authorName || "Usuário")}</strong><div class="muted">@${esc(post.authorUsername || "usuario")}</div></div></div><p>${esc(post.text)}</p></div><div class="reel-actions"><button class="reel-action ${state.like ? "active" : ""}" data-action="like">♥<span>${Number(post.likes || 0) + (state.like ? 1 : 0)}</span></button><button class="reel-action ${state.save ? "active" : ""}" data-action="save">🔖<span>${state.save ? "Salvo" : "Salvar"}</span></button><button class="reel-action ${state.repost ? "active" : ""}" data-action="repost">↻<span>${state.repost ? "Repostado" : "Repostar"}</span></button><button class="reel-action" data-action="share">↗<span>Enviar</span></button></div></article>`;
  }).join("");
  feed.querySelectorAll("video").forEach((video) => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) video.play().catch(() => {}); else video.pause(); }, { threshold: .6 });
    observer.observe(video);
  });
}

async function loadFeed() {
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

async function loadProfile() {
  const params = new URLSearchParams(location.search);
  const target = params.get("u") || currentEmail;
  try {
    const response = await fetch(`/api/social?type=profile&email=${encodeURIComponent(target)}&username=${encodeURIComponent(target)}&viewer=${encodeURIComponent(currentEmail)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    const p = data.profile;
    document.getElementById("profileName").textContent = p.name;
    document.getElementById("profileUsername").textContent = `@${p.username}`;
    document.getElementById("profileBio").textContent = p.bio || "";
    document.getElementById("followersCount").textContent = p.followers;
    document.getElementById("followingCount").textContent = p.following;
    document.getElementById("postsCount").textContent = p.posts;
    const avatar = document.getElementById("profileAvatar");
    avatar.textContent = p.avatarUrl ? "" : (p.name || "U").charAt(0).toUpperCase();
    avatar.style.backgroundImage = p.avatarUrl ? `url(${p.avatarUrl})` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    const followButton = document.getElementById("followButton");
    if (String(p.email).toLowerCase() === currentEmail) {
      followButton.hidden = false;
      followButton.textContent = "Editar perfil";
      followButton.onclick = () => { window.location.href = "/configuracoes"; };
    } else {
      followButton.hidden = false;
      followButton.textContent = p.followingMe ? "Seguindo" : "Seguir";
      followButton.onclick = () => toggleFollow(p.email, followButton);
    }
    if (params.has("u")) profilePanel.classList.add("open");
  } catch { document.getElementById("profileName").textContent = "Perfil indisponível"; }
}

async function toggleFollow(target, button) {
  button.disabled = true;
  const following = button.textContent !== "Seguindo";
  try {
    const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow", me: currentEmail, target, following }) });
    if (!response.ok) throw Error();
    button.textContent = following ? "Seguindo" : "Seguir";
    await loadProfile();
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
  const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "post", me: currentEmail, authorName: user.name, authorUsername: user.username || currentEmail.split("@")[0], authorAvatar: user.avatarUrl || "", text, mediaUrl: upload.url, mediaType: "video" }) });
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

document.getElementById("profileToggle")?.addEventListener("click", (event) => { event.preventDefault(); profilePanel.classList.toggle("open"); if (profilePanel.classList.contains("open")) profilePanel.scrollIntoView({ behavior: "smooth", block: "start" }); });
document.getElementById("postToggle")?.addEventListener("click", (event) => { event.preventDefault(); postForm?.scrollIntoView({ behavior: "smooth", block: "center" }); });
document.getElementById("followingTab")?.addEventListener("click", (event) => { event.preventDefault(); feedType = "following"; document.querySelectorAll(".feed-switch a").forEach((item) => item.classList.toggle("active", item.id === "followingTab")); loadFeed(); });
document.querySelector(".feed-switch a.active")?.addEventListener("click", (event) => { if (event.currentTarget.id === "followingTab") return; event.preventDefault(); feedType = "feed"; document.querySelectorAll(".feed-switch a").forEach((item) => item.classList.toggle("active", item.id !== "followingTab")); loadFeed(); });
loadFeed();
loadProfile();
