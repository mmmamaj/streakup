export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {

    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    const API_KEY = process.env.DATABASE_API_KEY;
    const DATABASE_URL = process.env.DATABASE_API_URL;

    if (!API_KEY || !DATABASE_URL) {
      return res.status(500).json({
        error: "Variáveis da database não configuradas na Vercel."
      });
    }

    /*
      AQUI entra o formato exato da API.

      Exemplo APENAS ilustrativo:

      const response = await fetch(`${DATABASE_URL}/v1/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          chave: `usuario_${Date.now()}`,
          tipo: "usuario",
          data: {
            name,
            email,
            password
          }
        })
      });

    */

    return res.status(501).json({
      error: "Configure o POST /records conforme a documentação da database."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Erro interno do servidor."
    });

  }
}
