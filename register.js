// ATENÇÃO: na Vercel, este arquivo na raiz não é uma Serverless Function
// automaticamente. Ele está aqui conforme solicitado. Para executar como
// backend seguro, mova-o para /api/register.js ou configure um framework/route.
//
// A chave privada deve ficar em Environment Variables:
// DATABASE_API_KEY
// DATABASE_API_URL=https://databasen3t.lovable.app

export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Método não permitido."});
 const {name,email,password}=req.body||{};
 if(!name||!email||!password) return res.status(400).json({error:"Preencha todos os campos."});

 const apiKey=process.env.DATABASE_API_KEY;
 const apiUrl=process.env.DATABASE_API_URL;

 if(!apiKey||!apiUrl)
  return res.status(500).json({error:"Configure DATABASE_API_KEY e DATABASE_API_URL."});

 // O formato exato do POST /records precisa seguir a documentação da API.
 return res.status(501).json({
  error:"Endpoint pronto, mas o formato de POST /records precisa ser configurado conforme a documentação."
 });
}