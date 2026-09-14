const form=document.getElementById("registerForm");
const status=document.getElementById("status");

form.addEventListener("submit",async e=>{
 e.preventDefault();
 status.textContent="Criando conta...";
 try{
  const r=await fetch("/register.js",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    name:document.getElementById("name").value.trim(),
    email:document.getElementById("email").value.trim(),
    password:document.getElementById("password").value
   })
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data.error||"Erro ao criar conta.");
  status.textContent="Conta criada com sucesso!";
  form.reset();
 }catch(err){status.textContent=err.message}
});