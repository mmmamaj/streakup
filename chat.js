const CHAT_KEY = "streakup_chats";
const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
if (!user) window.location.replace("/login");
const conversations = [
  { id: "lia", name: "Lia Martins", handle: "@liamartins", avatar: "L", preview: "Bora manter a sequência?", online: true },
  { id: "caio", name: "Caio Nunes", handle: "@caionunes", avatar: "C", preview: "Vi seu novo post!", online: false },
  { id: "bia", name: "Bia Costa", handle: "@biacosta", avatar: "B", preview: "Qual hábito você está construindo?", online: true }
];
const getChats = () => JSON.parse(localStorage.getItem(CHAT_KEY) || "{}");
const saveChats = (data) => localStorage.setItem(CHAT_KEY, JSON.stringify(data));
let activeId = "lia";
const list = document.getElementById("conversationList");
const messages = document.getElementById("messages");
const chatTitle = document.getElementById("chatTitle");
const chatHandle = document.getElementById("chatHandle");
const chatAvatar = document.getElementById("chatAvatar");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

function renderList() {
  const chats = getChats();
  list.innerHTML = conversations.map((chat) => { const items = chats[chat.id] || []; const last = items.at(-1)?.text || chat.preview; return `<button class="conversation ${activeId === chat.id ? "active" : ""}" data-chat="${chat.id}"><span class="avatar avatar-sm">${chat.avatar}</span><span class="conversation-copy"><strong>${chat.name}</strong><small>${last}</small></span><i class="online-dot ${chat.online ? "" : "offline"}"></i></button>`; }).join("");
}
function renderMessages() {
  const chat = conversations.find((item) => item.id === activeId);
  const chats = getChats();
  chatTitle.textContent = chat.name;
  chatHandle.textContent = `${chat.handle} · ${chat.online ? "online agora" : "visto recentemente"}`;
  chatAvatar.textContent = chat.avatar;
  messages.innerHTML = (chats[activeId] || [{ from: "them", text: `Oi! Vi que você também está no StreakUp. ${chat.preview}` }]).map((item) => `<div class="message-row ${item.from === "me" ? "mine" : "theirs"}"><div class="message-bubble">${item.text.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]))}</div></div>`).join("");
  messages.scrollTop = messages.scrollHeight;
}
list.addEventListener("click", (event) => { const button = event.target.closest("[data-chat]"); if (!button) return; activeId = button.dataset.chat; renderList(); renderMessages(); });
messageForm.addEventListener("submit", (event) => { event.preventDefault(); const text = messageInput.value.trim(); if (!text) return; const chats = getChats(); chats[activeId] = [...(chats[activeId] || []), { from: "me", text }]; saveChats(chats); messageInput.value = ""; renderList(); renderMessages(); });
document.getElementById("logoutButton").addEventListener("click", () => { localStorage.removeItem("streakup_user"); window.location.replace("/login"); });
document.getElementById("myAvatar").textContent = (user?.name || "V").charAt(0).toUpperCase();
renderList(); renderMessages();
