import webpush from 'web-push';
const API_BASE = process.env.DATABASE_API_BASE_URL || 'https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1';
const key = () => process.env.DATABASE_API_KEY;
const norm = v => String(v || '').trim().toLowerCase();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${key()}`, Accept: 'application/json', ...(options.headers || {}) } }); }
export async function sendPushToUser(email, payload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !key()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const id = `push_${Buffer.from(norm(email)).toString('base64url')}`;
  const current = await db(`/records/${encodeURIComponent(id)}`); if (!current.ok) return;
  const body = await current.json(); const subs = body.registro?.data?.subscriptions || [];
  const alive = [];
  for (const subscription of subs) {
    try { await webpush.sendNotification(subscription, JSON.stringify(payload)); alive.push(subscription); } catch (e) { if (![404,410].includes(e.statusCode)) alive.push(subscription); }
  }
  await db(`/records/${encodeURIComponent(id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tipo:'push_subscription',data:{email:norm(email),subscriptions:alive,updatedAt:new Date().toISOString()}}) });
}
