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

    const apiKey = process.env.DATABASE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "DATABASE_API_KEY não configurada."
      });
    }

    const response = await fetch(
      "https://databasen3t.lovable.app/api/public/v1/records",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chave: `login_${email.toLowerCase()}`,
          tipo: "login",
          data: {
            usuario: email,
            senha: password,
            nome: name
          }
        })
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(response.status).json({
        error: "A database retornou uma resposta inválida.",
        status: response.status
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || data.message || "Erro ao salvar na database.",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conta salva na database.",
      registro: data.registro
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao conectar com a database."
    });
  }
}
