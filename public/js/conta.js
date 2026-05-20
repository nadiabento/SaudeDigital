async function confirmarEliminarConta() {
  const confirmacao = confirm(
    "AVISO CRÍTICO:\n\nTem a certeza de que deseja apagar a sua conta permanentemente? Esta ação não pode ser desfeita e irá remover todos os seus exames!",
  );

  if (confirmacao) {
    try {
      const response = await fetch("/api/auth/eliminar-conta", {
        method: "DELETE",
      });

      if (response.ok) {
        alert(
          "A sua conta foi eliminada com sucesso. Obrigado por usar o SaúdeDigital.",
        );
        localStorage.clear(); // Limpa tokens e sessão local
        window.location.href = "login.html"; // Redireciona para o login
      } else {
        alert("Erro ao tentar eliminar a conta. Contacte o suporte.");
      }
    } catch (error) {
      console.error("Erro no pedido:", error);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Carregar os dados atuais do utilizador na BD ao abrir o ecrã
  try {
    const response = await fetch("/api/auth/perfil-atual"); // Rota que busca os dados da sessão
    if (response.ok) {
      const dados = await response.json();

      document.getElementById("inputAtualizarNome").value = dados.nome || "";
      document.getElementById("inputEmailBloqueado").value = dados.email || "";
      document.getElementById("selectGrupoSanguineo").value =
        dados.grupo_sanguineo || "";
      document.getElementById("inputPeso").value = dados.peso || "";

      // Trata a data para o formato aceito pelo input date (AAAA-MM-DD)
      if (dados.data_nascimento) {
        const dataFormatada = dados.data_nascimento.split("T")[0];
        document.getElementById("inputDataNascimento").value = dataFormatada;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar dados do utilizador:", error);
  }
});

// 2. Enviar as alterações atualizadas para o Backend
document
  .getElementById("formAtualizarPerfil")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const dadosAtualizados = {
      nome: document.getElementById("inputAtualizarNome").value,
      data_nascimento: document.getElementById("inputDataNascimento").value,
      grupo_sanguineo: document.getElementById("selectGrupoSanguineo").value,
      peso: document.getElementById("inputPeso").value
        ? parseFloat(document.getElementById("inputPeso").value)
        : null,
    };

    try {
      const response = await fetch("/api/auth/atualizar-perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosAtualizados),
      });

      if (response.ok) {
        // Atualiza também o nome na memória local para a sidebar mudar na hora
        localStorage.setItem("userName", dadosAtualizados.nome);
        alert("Informações atualizadas com sucesso!");
        window.location.reload();
      } else {
        const err = await response.json();
        alert("Erro ao atualizar: " + (err.error || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro no envio dos dados:", error);
      alert("Não foi possível conectar ao servidor.");
    }
  });
