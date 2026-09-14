const form = document.getElementById("registerForm");
const status = document.getElementById("status");
const button = document.getElementById("submitButton");

if (form && status && button) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    status.className = "";
    status.textContent = "Criando sua conta...";
    button.disabled = true;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Servidor retornou resposta inválida (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar a conta.");
      }

      status.className = "success";
      status.textContent = "Conta criada com sucesso!";
      form.reset();
    } catch (error) {
      console.error(error);
      status.className = "error";
      status.textContent = error.message || "Ocorreu um erro. Tente novamente.";
    } finally {
      button.disabled = false;
    }
  });
}
