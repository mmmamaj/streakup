(() => {
  const saved = localStorage.getItem("streakup_theme") || "dark";
  document.documentElement.dataset.theme = saved;
  window.toggleStreakTheme = () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("streakup_theme", next);
    document.querySelectorAll("[data-theme-label]").forEach((node) => { node.textContent = next === "light" ? "Modo escuro" : "Modo claro"; });
  };
  window.initThemeButton = () => document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", window.toggleStreakTheme));
})();
