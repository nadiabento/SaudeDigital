// Lógica de Logout
function logout() {
  // Limpar sessão (exemplo simplificado)
  fetch("/api/auth/logout", { method: "POST" }).then(() => {
    window.location.href = "index.html";
  });
}

// Formatação de datas global
function formatarData(dataISO) {
  return new Date(dataISO).toLocaleDateString("pt-PT");
}

// Inicialização de Tooltips do Bootstrap (se necessário)
document.addEventListener("DOMContentLoaded", () => {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
