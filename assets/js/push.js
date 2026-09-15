(() => {
  const user = JSON.parse(localStorage.getItem('riseup_user') || 'null');
  if (!user?.email || !('Notification' in window)) return;
  const email = String(user.email).trim().toLowerCase();
  const key = `riseup_push_enabled_${email}`;
  const b64ToUint8 = (base64) => {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  };
  async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    try { await navigator.serviceWorker.register('/sw.js'); } catch {}
    return navigator.serviceWorker.ready;
  }
  async function subscribe() {
    try {
      const reg = await getRegistration();
      if (!reg || !('PushManager' in window)) return false;
      const keyResponse = await fetch('/api/push?action=publicKey', { cache: 'no-store' });
      const keyData = await keyResponse.json().catch(() => ({}));
      if (!keyResponse.ok) { console.warn('RiseUp Push: servidor recusou a chave VAPID.', keyData.error || keyResponse.status); return false; }
      const { publicKey } = keyData;
      if (!publicKey) { console.warn('RiseUp Push: VAPID_PUBLIC_KEY vazia.'); return false; }
      let subscription = await reg.pushManager.getSubscription();
      try {
        if (!subscription) subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      } catch (firstError) {
        try { await subscription?.unsubscribe(); } catch {}
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      }
      const saved = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', email, subscription: subscription.toJSON() }) });
      if (!saved.ok) { const data = await saved.json().catch(() => ({})); console.error('RiseUp Push: assinatura não foi salva.', data.error || saved.status); return false; }
      localStorage.setItem(key, '1');
      return true;
    } catch (error) {
      console.debug('RiseUp Push:', error);
      return false;
    }
  }
  async function enable() {
    if (Notification.permission === 'granted') return subscribe();
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') { const ok=await subscribe(); if(ok) showLocal('RiseUp','Notificações ativadas com sucesso.'); return ok; }
    return false;
  }
  function showLocal(title, body, icon) {
    if (Notification.permission !== 'granted') return;
    getRegistration().then(reg => reg?.showNotification(title, { body, icon: icon || '/assets/images/icon.svg', badge: '/assets/images/icon.svg', tag: 'riseup-' + Date.now(), data: { url: '/perfil' } })).catch(() => new Notification(title, { body }));
  }
  window.RiseUpNotifications = { enable, subscribe, showLocal };
  if (Notification.permission === 'granted') subscribe();
  if (!localStorage.getItem(key)) {
    const banner = document.createElement('aside');
    banner.className = 'push-banner';
    banner.innerHTML = '<strong>Ativar notificações do RiseUp?</strong><div class="muted" style="margin-top:4px;font-size:12px">Receba curtidas, mensagens, seguidores e marcações na barra de notificações.</div><button type="button">Ativar notificações</button>';
    document.body.appendChild(banner);
    banner.querySelector('button').addEventListener('click', async () => { await enable(); banner.remove(); });
    setTimeout(() => banner.remove(), 12000);
  }
})();
