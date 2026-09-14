const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
export default async function handler(req, res) {
  const key = process.env.DATABASE_API_KEY; const id = String(req.query?.id || "");
  if (!key || !id) return res.status(400).end();
  try { const response = await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` } }); if (!response.ok) return res.status(response.status).end(); res.setHeader("Content-Type", response.headers.get("content-type") || "video/mp4"); res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); const buffer = Buffer.from(await response.arrayBuffer()); return res.status(200).send(buffer); } catch { return res.status(500).end(); }
}
