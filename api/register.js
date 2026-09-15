const API_BASE = process.env.DATABASE_API_BASE_URL || "https://project--457ce288-fa2b-4352-8338-3bf307534ab0.lovable.app/api/public/v1";
const strongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,72}$/.test(String(value || ""));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  try {
    const { name, email, password } = req.body || {};
    const usuario = String(email || "").trim().toLowerCase();
    const nome = String(name || "").trim();
    if (!nome || !usuario || !password) return res.status(400).json({ error: "Preencha todos os campos." });
    if (!strongPassword(password)) return res.status(400).json({ error: "Use uma senha forte: mínimo de 10 caracteres, com maiúscula, minúscula, número e símbolo." });
    const apiKey = process.env.DATABASE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DATABASE_API_KEY não configurada." });
    const response = await fetch(`${API_BASE}/records`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ chave: `login_${usuario}`, tipo: "login", data: { usuario, senha: password, nome, username: usuario.split("@")[0], avatarUrl: "", publicProfile: true } }) });
    const text = await response.text(); let data;
    try { data = JSON.parse(text); } catch { return res.status(response.status).json({ error: "A database retornou uma resposta inválida." }); }
    if (!response.ok) return res.status(response.status).json({ error: data.error || data.message || "Erro ao salvar na database." });
    return res.status(200).json({ success: true, message: "Conta salva na database.", user: { name: nome, email: usuario, username: usuario.split("@")[0], avatarUrl: "", publicProfile: true } });
  } catch (error) { console.error(error); return res.status(500).json({ error: "Erro ao conectar com a database." }); }
}
export const config = { api: { bodyParser: true } };
