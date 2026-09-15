const API_BASE = process.env.DATABASE_API_BASE_URL || 'https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1';
const key = () => process.env.DATABASE_API_KEY;
const norm = v => String(v || '').trim().toLowerCase();
async function db(path, options = {}) { return fetch(`${API_BASE}${path}`, { ...options, headers: { Authorization: `Bearer ${key()}`, Accept: 'application/json', ...(options.headers || {}) } }); }
export default async function handler(req, res) {
  if (!key()) return res.status(500).json({ error: 'DATABASE_API_KEY não configurada.' });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return res.status(503).json({ error: 'Push web ainda não configurado. Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT.' });
  try {
    if (req.method === 'GET' && req.query?.action === 'publicKey') return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    if (req.method === 'POST' && req.body?.action === 'subscribe') {
      const email = norm(req.body.email), subscription = req.body.subscription;
      if (!email || !subscription?.endpoint) return res.status(400).json({ error: 'Assinatura inválida.' });
      const id = `push_${Buffer.from(email).toString('base64url')}`;
      const current = await db(`/records/${encodeURIComponent(id)}`);
      let subscriptions = [];
      if (current.ok) { const data = await current.json(); subscriptions = Array.isArray(data.registro?.data?.subscriptions) ? data.registro.data.subscriptions : []; }
      const filtered = subscriptions.filter(s => s?.endpoint !== subscription.endpoint);
      filtered.push(subscription);
      const saved = await db(`/records/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'push_subscription', data: { email, subscriptions: filtered, updatedAt: new Date().toISOString() } }) });
      return res.status(saved.ok ? 200 : saved.status).json({ success: saved.ok });
    }
    if (req.method === 'DELETE') {
      const email = norm(req.body?.email), endpoint = String(req.body?.endpoint || '');
      if (!email || !endpoint) return res.status(400).json({ error: 'Assinatura inválida.' });
      const id = `push_${Buffer.from(email).toString('base64url')}`;
      const current = await db(`/records/${encodeURIComponent(id)}`); if (!current.ok) return res.status(200).json({ success: true });
      const data = await current.json(); const subscriptions = (data.registro?.data?.subscriptions || []).filter(s => s?.endpoint !== endpoint);
      await db(`/records/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'push_subscription', data: { email, subscriptions, updatedAt: new Date().toISOString() } }) });
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) { console.error(e); return res.status(500).json({ error: e.message || 'Erro no Push.' }); }
}
