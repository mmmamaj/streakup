const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const key = process.env.DATABASE_API_KEY; if (!key) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
  try {
    const { dataUrl, filename } = req.body || {}; const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Arquivo inválido." });
    const buffer = Buffer.from(match[2], "base64"); if (buffer.length > 50 * 1024 * 1024) return res.status(413).json({ error: "O vídeo deve ter até 50 MB." });
    const form = new FormData(); form.append("file", new Blob([buffer], { type: match[1] }), filename || "video.mp4");
    const response = await fetch(`${API_BASE}/files`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form }); const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: payload.error || "Falha no upload." });
    const id = payload.arquivo?.id; return res.status(201).json({ id, url: `/api/media?id=${encodeURIComponent(id)}` });
  } catch (error) { console.error(error); return res.status(500).json({ error: "Erro ao enviar o vídeo." }); }
}
