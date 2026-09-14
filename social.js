const STORAGE = {
  user: "streakup_user",
  posts: "streakup_posts"
};

const fallbackPosts = [
  { id: "demo-1", author: "Lia Martins", handle: "liamartins", avatar: "L", time: "há 12 min", text: "Pequenos passos todos os dias. Hoje completei meu treino e mantive a sequência!", media: "image", mediaUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=82", likes: 42, liked: false, comments: [{ name: "Rafa", text: "É isso! 🔥" }] },
  { id: "demo-2", author: "Caio Nunes", handle: "caionunes", avatar: "C", time: "há 39 min", text: "Domingo também conta. Compartilhando um pouco do meu processo com vocês.", media: "video", mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", likes: 28, liked: false, comments: [] },
  { id: "demo-3", author: "Bia Costa", handle: "biacosta", avatar: "B", time: "há 1 h", text: "Qual hábito vocês estão construindo esta semana?", media: null, mediaUrl: "", likes: 17, liked: false, comments: [{ name: "João", text: "Leitura antes de dormir." }, { name: "Maya", text: "Corrida de manhã!" }] }
];

const getUser = () => JSON.parse(localStorage.getItem(STORAGE.user) || "null");
const getPosts = () => JSON.parse(localStorage.getItem(STORAGE.posts) || "null") || fallbackPosts;
const savePosts = (posts) => localStorage.setItem(STORAGE.posts, JSON.stringify(posts));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

const user = getUser();
if (!user) window.location.replace("/login");

const feed = document.getElementById("feed");
const composer = document.getElementById("composer");
const mediaInput = document.getElementById("mediaInput");
const mediaPreview = document.getElementById("mediaPreview");
let selectedMedia = null;
let visibleCount = 3;

function renderPost(post) {
  const comments = (post.comments || []).map((comment) => `<div class="comment"><strong>${escapeHtml(comment.name)}</strong><span>${escapeHtml(comment.text)}</span></div>`).join("");
  const media = post.media === "image" ? `<img class="post-media" src="${escapeHtml(post.mediaUrl)}" alt="Imagem publicada por ${escapeHtml(post.author)}" loading="lazy">` : post.media === "video" ? `<video class="post-media" controls preload="metadata" src="${escapeHtml(post.mediaUrl)}"></video>` : "";
  return `<article class="post-card" data-post-id="${escapeHtml(post.id)}"><header class="post-header"><div class="avatar avatar-sm">${escapeHtml(post.avatar)}</div><div class="post-author"><strong>${escapeHtml(post.author)}</strong><span>@${escapeHtml(post.handle)} · ${escapeHtml(post.time)}</span></div><button class="icon-button" aria-label="Mais opções">•••</button></header><p class="post-text">${escapeHtml(post.text)}</p>${media}<div class="post-actions"><button class="post-action like-button ${post.liked ? "is-liked" : ""}" data-action="like">♡ <span>${post.likes}</span></button><button class="post-action" data-action="focus-comment">◌ <span>${(post.comments || []).length}</span></button><button class="post-action">↗ <span>Compartilhar</span></button></div><div class="comments">${comments}</div><form class="comment-form"><input aria-label="Comentar" placeholder="Escreva um comentário..." maxlength="180"><button type="submit">Enviar</button></form></article>`;
}

function renderFeed() {
  const posts = getPosts();
  feed.innerHTML = posts.slice(0, visibleCount).map(renderPost).join("");
  document.getElementById("loadMore").hidden = visibleCount >= posts.length;
}

function updateHeader() {
  document.getElementById("profileName").textContent = user.name || "Seu perfil";
  document.getElementById("profileEmail").textContent = `@${(user.email || "usuario").split("@")[0]}`;
  document.getElementById("avatar").textContent = (user.name || "S").trim().charAt(0).toUpperCase();
  document.getElementById("composerAvatar").textContent = (user.name || "S").trim().charAt(0).toUpperCase();
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = document.getElementById("postText").value.trim();
  if (!text && !selectedMedia) return;
  const posts = getPosts();
  posts.unshift({ id: `post-${Date.now()}`, author: user.name || "Você", handle: (user.email || "usuario").split("@")[0], avatar: (user.name || "V").charAt(0).toUpperCase(), time: "agora", text, media: selectedMedia?.type || null, mediaUrl: selectedMedia?.url || "", likes: 0, liked: false, comments: [] });
  savePosts(posts);
  composer.reset();
  selectedMedia = null;
  mediaPreview.innerHTML = "";
  renderFeed();
});

mediaInput.addEventListener("change", () => {
  const file = mediaInput.files[0];
  if (!file) return;
  const type = file.type.startsWith("video/") ? "video" : "image";
  selectedMedia = { type, url: URL.createObjectURL(file) };
  mediaPreview.innerHTML = type === "video" ? `<video class="composer-media" controls src="${selectedMedia.url}"></video>` : `<img class="composer-media" src="${selectedMedia.url}" alt="Prévia da imagem">`;
});

feed.addEventListener("click", (event) => {
  const postCard = event.target.closest("[data-post-id]");
  if (!postCard) return;
  const posts = getPosts();
  const post = posts.find((item) => item.id === postCard.dataset.postId);
  if (!post) return;
  if (event.target.closest("[data-action='like']")) { post.liked = !post.liked; post.likes += post.liked ? 1 : -1; savePosts(posts); renderFeed(); }
  if (event.target.closest("[data-action='focus-comment']")) postCard.querySelector(".comment-form input")?.focus();
});

feed.addEventListener("submit", (event) => {
  if (!event.target.matches(".comment-form")) return;
  event.preventDefault();
  const postCard = event.target.closest("[data-post-id]");
  const post = getPosts().find((item) => item.id === postCard.dataset.postId);
  const input = event.target.querySelector("input");
  const text = input.value.trim();
  if (!text || !post) return;
  post.comments = [...(post.comments || []), { name: user.name || "Você", text }];
  savePosts(getPosts().map((item) => item.id === post.id ? post : item));
  renderFeed();
});

const loadMore = document.getElementById("loadMore");
loadMore.addEventListener("click", () => { visibleCount += 3; renderFeed(); });
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 420 && visibleCount < getPosts().length) {
    visibleCount += 3;
    renderFeed();
  }
}, { passive: true });
document.getElementById("logoutButton").addEventListener("click", () => { localStorage.removeItem(STORAGE.user); window.location.replace("/login"); });
updateHeader();
renderFeed();
