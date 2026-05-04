document.addEventListener("DOMContentLoaded", function () {
  carregarMedicacao();
});

async function carregarMedicacao() {
  const tabela = document.getElementById("tabela-medicacao");

  try {
    const resposta = await fetch("/api/medicacao");

    if (!resposta.ok) {
      throw new Error("Erro ao carregar medicação.");
    }

    const medicamentos = await resposta.json();

    tabela.innerHTML = "";

    if (medicamentos.length === 0) {
      tabela.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            Ainda não existe medicação registada.
          </td>
        </tr>
      `;
      return;
    }

    medicamentos.forEach((med) => {
      const infoDias = calcularDiasRestantes(med.data_fim);
      const badgeEstado = criarBadgeEstado(med.estado, infoDias);

      tabela.innerHTML += `
        <tr>
          <td>
            <strong>${med.nome_medicamento}</strong><br>
            <small class="text-muted">${med.forma_farmaceutica || ""}</small>
          </td>
          <td>${med.dosagem || "-"}</td>
          <td>${med.posologia}</td>
          <td>${formatarDuracao(med.data_inicio, med.data_fim)}</td>
          <td>${infoDias.texto}</td>
          <td>${badgeEstado}</td>
        </tr>
      `;
    });
  } catch (erro) {
    console.error(erro);

    tabela.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger py-4">
          Não foi possível carregar a medicação.
        </td>
      </tr>
    `;
  }
}

function calcularDiasRestantes(dataFim) {
  if (!dataFim) {
    return {
      texto: "Crónico",
      dias: null,
      tipo: "cronico"
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(dataFim);
  fim.setHours(0, 0, 0, 0);

  const diferenca = fim - hoje;
  const dias = Math.ceil(diferenca / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return {
      texto: "Terminado",
      dias,
      tipo: "concluido"
    };
  }

  if (dias === 0) {
    return {
      texto: "Termina hoje",
      dias,
      tipo: "a_terminar"
    };
  }

  return {
    texto: `${dias} dias`,
    dias,
    tipo: dias <= 3 ? "a_terminar" : "ativo"
  };
}

function criarBadgeEstado(estado, infoDias) {
  if (infoDias.tipo === "cronico") {
    return `<span class="badge bg-primary-subtle text-primary px-3">Crónico</span>`;
  }

  if (infoDias.tipo === "concluido" || estado === "Concluído") {
    return `<span class="badge bg-secondary-subtle text-secondary px-3">Concluído</span>`;
  }

  if (infoDias.tipo === "a_terminar") {
    return `<span class="badge bg-warning-subtle text-warning px-3">A terminar</span>`;
  }

  if (estado === "Suspenso") {
    return `<span class="badge bg-danger-subtle text-danger px-3">Suspenso</span>`;
  }

  return `<span class="badge bg-success-subtle text-success px-3">Ativo</span>`;
}

function formatarDuracao(dataInicio, dataFim) {
  const inicio = formatarData(dataInicio);

  if (!dataFim) {
    return `${inicio} - Crónico`;
  }

  return `${inicio} - ${formatarData(dataFim)}`;
}

function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);

  return d.toLocaleDateString("pt-PT");
}