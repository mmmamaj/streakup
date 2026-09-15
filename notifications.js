(() => {
  const user = JSON.parse(localStorage.getItem("streakup_user") || "null");
  if (!user?.email) return;
  const email = encodeURIComponent(user.email);
  const button = document.querySelector("[data-notifications]");
  const panel = document.getElementById("notificationsPanel");
  const list = document.getElementById("notificationsList");
  const badge = document.getElementById("notificationBadge");
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const icons = { message: "✉", follow: "＋", like: "♥", repost: "↻" };
  async function loadNotifications() {
    try {
      const response = await fetch(`/api/notifications?me=${email}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) return;
      badge.textContent = data.unread > 99 ? "99+" : String(data.unread || ""); badge.hidden = !data.unread;
      list.innerHTML = data.notifications.length ? data.notifications.map((item) => `<button class="notification-item ${item.read ? "read" : "unread"}" data-notification-id="${escapeHtml(item.id)}"><span class="notification-icon">${icons[item.kind] || "•"}</span><span><strong>${escapeHtml(item.sourceName || "StreakUp")}</strong><small>${escapeHtml(item.text)}</small><time>${new Date(item.createdAt).toLocaleString("pt-BR", { day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></span></button>`).join("") : `<div class="notification-empty">Você está em dia.</div>`;
    } catch { /* rede indisponível: mantém o estado atual */ }
  }
  button?.addEventListener("click", () => { panel.classList.toggle("open"); if (panel.classList.contains("open")) loadNotifications(); });
  list?.addEventListener("click", async (event) => { const item = event.target.closest("[data-notification-id]"); if (!item) return; await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", id: item.dataset.notificationId, me: user.email }) }); item.classList.remove("unread"); item.classList.add("read"); loadNotifications(); });
  loadNotifications();
  setInterval(loadNotifications, 10000);
})();
