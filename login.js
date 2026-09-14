const form = document.getElementById("loginForm");
const status = document.getElementById("loginStatus");
const button = document.getElementById("loginButton");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.className = "";
  status.textContent = "Entrando...";
  button.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
    localStorage.setItem("streakup_user", JSON.stringify(data.user));
    window.location.href = "perfil.html";
  } catch (error) {
    status.className = "error";
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
