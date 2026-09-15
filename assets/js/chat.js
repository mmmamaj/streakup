const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
if (!user) window.location.replace("/login");

const CONTACTS_KEY = "streakup_contacts";
const currentEmail = String(user?.email || "").trim().toLowerCase();
let directory = [];
let contacts = [];
let activeContact = null;
const nicknames = JSON.parse(localStorage.getItem("streakup_nicknames") || "{}");

const list = document.getElementById("conversationList");
const messages = document.getElementById("messages");
const chatTitle = document.getElementById("chatTitle");
const chatHandle = document.getElementById("chatHandle");
const chatAvatar = document.getElementById("chatAvatar");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const contactForm = document.getElementById("contactForm");
const contactEmail = document.getElementById("contactEmail");
const contactStatus = document.getElementById("contactStatus");
const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const avatar = (contact) => contact.avatarUrl ? `<span class="avatar avatar-sm" style="background-image:url('${escapeHtml(contact.avatarUrl)}');background-size:cover;background-position:center"></span>` : `<span class="avatar avatar-sm">${escapeHtml((contact.name || "U").charAt(0).toUpperCase())}</span>`;
const lookup = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");

function readStoredContacts() {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]"); } catch { return []; }
}

function renderDirectory() {
  const query = String(contactEmail.value || "").trim().toLowerCase();
  const candidates = directory.filter((contact) => !query || [contact.email, contact.name, contact.username].some((value) => String(value || "").toLowerCase().includes(query)));
  if (!candidates.length) {
    list.innerHTML = `<div class="empty"><strong>Ninguém encontrado</strong><p style="margin-top:6px">Pesquise pelo e-mail ou nome de usuário.</p></div>`;
    return;
  }
  list.innerHTML = `<div class="directory-label">Pessoas da rede</div>${candidates.map((contact) => `<button class="conversation ${activeContact?.email === contact.email ? "active" : ""}" data-contact="${escapeHtml(contact.email)}">${avatar(contact)}<span class="conversation-copy"><strong>${escapeHtml(contact.name)}</strong><small>@${escapeHtml(contact.username)} · ${contact.canMessage ? "pode receber mensagens" : "siga você para liberar mensagem"}</small></span><i class="online-dot offline"></i></button>`).join("")}`;
}

function renderContacts() {
  const stored = new Set(readStoredContacts().map((contact) => String(contact.email || contact.id || "").toLowerCase()));
  contacts = directory.filter((contact) => stored.has(contact.email));
  if (!contacts.length) {
    renderDirectory();
    return;
  }
  list.innerHTML = `<div class="directory-label">Conversas</div>${contacts.map((contact) => `<button class="conversation ${activeContact?.email === contact.email ? "active" : ""}" data-contact="${escapeHtml(contact.email)}">${avatar(contact)}<span class="conversation-copy"><strong>${escapeHtml(contact.name)}</strong><small>@${escapeHtml(contact.username)}</small></span><i class="online-dot offline"></i></button>`).join("")}<button class="directory-toggle" type="button" id="showPeople">＋ Adicionar outra pessoa</button>`;
}

function selectContact(contact) {
  activeContact = contact;
  document.querySelector(".chat-list")?.classList.add("chat-mobile-hidden");
  document.querySelector(".chat-window")?.classList.remove("chat-mobile-hidden");
  chatTitle.textContent = nicknames[contact.email] || contact.name;
  chatHandle.textContent = `@${contact.username} · conversa persistente`;
  chatAvatar.textContent = contact.avatarUrl ? "" : (contact.name || "U").charAt(0).toUpperCase();
  chatAvatar.style.backgroundImage = contact.avatarUrl ? `url(${contact.avatarUrl})` : "";
  chatAvatar.style.backgroundSize = "cover";
  chatAvatar.style.backgroundPosition = "center";
  document.getElementById("chatProfileLink").hidden = false;
  document.getElementById("chatProfileLink").href = `/perfil?u=${encodeURIComponent(contact.username)}`;
  document.getElementById("renameChat").hidden = false;
  renderContacts();
  loadMessages();
}

async function loadMessages() {
  if (!activeContact) {
    messages.innerHTML = `<div class="empty"><strong>Escolha uma pessoa</strong><p style="margin-top:6px">Adicione alguém da rede para começar uma conversa.</p></div>`;
    return;
  }
  try {
    const response = await fetch(`/api/chat?me=${encodeURIComponent(currentEmail)}&with=${encodeURIComponent(activeContact.email)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    messages.innerHTML = (data.messages || []).map((item) => `<div class="message-row ${String(item.from).toLowerCase() === currentEmail ? "mine" : "theirs"}"><div class="message-bubble">${escapeHtml(item.text)}</div></div>`).join("") || `<div class="empty">Nenhuma mensagem ainda. Comece a conversa.</div>`;
    messages.scrollTop = messages.scrollHeight;
  } catch { messages.innerHTML = `<div class="empty">Não foi possível carregar a conversa agora.</div>`; }
}

async function loadDirectory(query = "") {
  try {
    const response = await fetch(`/api/users?me=${encodeURIComponent(currentEmail)}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    directory = data.users || [];
    const stored = readStoredContacts();
    if (!stored.length) renderDirectory(); else renderContacts();
  } catch {
    list.innerHTML = `<div class="empty">Não foi possível carregar os usuários da rede.</div>`;
  }
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = contactEmail.value.trim();
  if (!query) return;
  contactStatus.textContent = "Buscando...";
  await loadDirectory(query);
  const match = directory.find((contact) => [contact.email, contact.username, contact.name].some((value) => lookup(value) === lookup(query)));
  if (!match) { contactStatus.textContent = "Nenhuma conta encontrada."; return; }
  const next = [...readStoredContacts().filter((item) => String(item.email || "").toLowerCase() !== match.email), match];
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
  contactStatus.textContent = "Contato adicionado.";
  contactEmail.value = "";
  directory = [...new Map([...directory, match].map((item) => [item.email, item])).values()];
  renderContacts();
  selectContact(match);
});

contactEmail.addEventListener("input", () => { if (contactEmail.value.trim().length >= 2) loadDirectory(contactEmail.value.trim()); });
list.addEventListener("click", (event) => {
  if (event.target.closest("#showPeople")) { localStorage.removeItem(CONTACTS_KEY); renderDirectory(); return; }
  const button = event.target.closest("[data-contact]");
  if (!button) return;
  const contact = directory.find((item) => item.email === button.dataset.contact);
  if (contact && contact.canMessage === false) { contactStatus.textContent = "Essa pessoa precisa seguir você antes de receber mensagens."; return; }
  if (contact) selectContact(contact);
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !activeContact) return;
  const button = messageForm.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ me: currentEmail, with: activeContact.email, text }) });
    if (!response.ok) throw new Error("Falha ao enviar");
    messageInput.value = "";
    await loadMessages();
  } catch { alert("Não foi possível enviar a mensagem."); }
  finally { button.disabled = false; }
});

document.getElementById("backToChats")?.addEventListener("click", () => { document.querySelector(".chat-window")?.classList.add("chat-mobile-hidden"); document.querySelector(".chat-list")?.classList.remove("chat-mobile-hidden"); });
document.getElementById("renameChat")?.addEventListener("click", () => { if (!activeContact) return; const value = prompt("Apelido desta conversa", nicknames[activeContact.email] || activeContact.name); if (value && value.trim()) { nicknames[activeContact.email] = value.trim().slice(0, 40); localStorage.setItem("streakup_nicknames", JSON.stringify(nicknames)); chatTitle.textContent = nicknames[activeContact.email]; renderContacts(); } });
document.getElementById("logoutButton").addEventListener("click", () => { localStorage.removeItem("streakup_user"); window.location.replace("/login"); });
loadDirectory();
setInterval(loadMessages, 4000);
