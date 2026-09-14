const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
if (!user) window.location.replace("/login");
const CONTACTS_KEY = "streakup_contacts";
const defaultContacts = [{ id: "lia.martins@example.com", name: "Lia Martins", handle: "@liamartins", avatar: "L", online: true }, { id: "caio.nunes@example.com", name: "Caio Nunes", handle: "@caionunes", avatar: "C", online: false }, { id: "bia.costa@example.com", name: "Bia Costa", handle: "@biacosta", avatar: "B", online: true }];
const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || "null") || defaultContacts;
let activeContact = contacts[0];
const list = document.getElementById("conversationList");
const messages = document.getElementById("messages");
const chatTitle = document.getElementById("chatTitle");
const chatHandle = document.getElementById("chatHandle");
const chatAvatar = document.getElementById("chatAvatar");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function renderList() {
  list.innerHTML = contacts.map((contact) => `<button class="conversation ${activeContact?.id === contact.id ? "active" : ""}" data-contact="${escapeHtml(contact.id)}"><span class="avatar avatar-sm">${escapeHtml(contact.avatar)}</span><span class="conversation-copy"><strong>${escapeHtml(contact.name)}</strong><small>${escapeHtml(contact.handle)}</small></span><i class="online-dot ${contact.online ? "" : "offline"}"></i></button>`).join("");
}
async function loadMessages() {
  if (!activeContact) return;
  chatTitle.textContent = activeContact.name;
  chatHandle.textContent = `${activeContact.handle} · conversa persistente`;
  chatAvatar.textContent = activeContact.avatar;
  try {
    const response = await fetch(`/api/chat?me=${encodeURIComponent(user.email)}&with=${encodeURIComponent(activeContact.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    messages.innerHTML = (data.messages || []).map((item) => `<div class="message-row ${item.from === user.email.toLowerCase() ? "mine" : "theirs"}"><div class="message-bubble">${escapeHtml(item.text)}</div></div>`).join("") || `<div class="empty">Nenhuma mensagem ainda. Comece a conversa.</div>`;
    messages.scrollTop = messages.scrollHeight;
  } catch (error) { messages.innerHTML = `<div class="empty">Não foi possível carregar a conversa agora.</div>`; }
}
list.addEventListener("click", (event) => { const button = event.target.closest("[data-contact]"); if (!button) return; activeContact = contacts.find((contact) => contact.id === button.dataset.contact); renderList(); loadMessages(); });
messageForm.addEventListener("submit", async (event) => { event.preventDefault(); const text = messageInput.value.trim(); if (!text || !activeContact) return; const button = messageForm.querySelector("button"); button.disabled = true; try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ me: user.email, with: activeContact.id, text }) }); if (!response.ok) throw new Error("Falha ao enviar"); messageInput.value = ""; await loadMessages(); } catch { alert("Não foi possível enviar a mensagem."); } finally { button.disabled = false; } });
document.getElementById("logoutButton").addEventListener("click", () => { localStorage.removeItem("streakup_user"); window.location.replace("/login"); });
document.getElementById("myAvatar").textContent = (user?.name || "V").charAt(0).toUpperCase();
renderList(); loadMessages();
setInterval(loadMessages, 4000);
