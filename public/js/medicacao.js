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


const formMedicacao = document.getElementById("form-medicacao");

if (formMedicacao) {
  formMedicacao.addEventListener("submit", async function (event) {
    event.preventDefault();

    const erroDiv = document.getElementById("erro-medicacao");
    const sucessoDiv = document.getElementById("sucesso-medicacao");

    erroDiv.classList.add("d-none");
    sucessoDiv.classList.add("d-none");
    erroDiv.textContent = "";
    sucessoDiv.textContent = "";

    const medicamento = document.getElementById("medicamento").value.trim();
    const idCatalogoMedicamento = document.getElementById("idCatalogoMedicamento").value;
    const dosagem = document.getElementById("dosagem").value.trim();
    const posologia = document.getElementById("posologia").value.trim();
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;
    const estado = document.getElementById("estado").value;

    if (dataFim && dataFim < dataInicio) {
      erroDiv.textContent = "A data de fim não pode ser anterior à data de início.";
      erroDiv.classList.remove("d-none");
      return;
    }

    if (!idCatalogoMedicamento) {
  erroDiv.textContent = "Selecione um medicamento da lista de sugestões.";
  erroDiv.classList.remove("d-none");
  return;
}

    try {
      const resposta = await fetch("/api/medicacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          medicamento: medicamento,
          dosagem: dosagem,
          posologia: posologia,
          data_inicio: dataInicio,
          data_fim: dataFim,
          estado: estado
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Erro ao registar medicação.");
      }

      sucessoDiv.textContent = resultado.mensagem;
      sucessoDiv.classList.remove("d-none");

      formMedicacao.reset();

      carregarMedicacao();
    } catch (erro) {
      erroDiv.textContent = erro.message;
      erroDiv.classList.remove("d-none");
    }
  });
}

const inputMedicamento = document.getElementById("medicamento");
const inputIdCatalogoMedicamento = document.getElementById("idCatalogoMedicamento");
const caixaSugestoes = document.getElementById("sugestoes-medicamentos");

let temporizadorPesquisa = null;

if (inputMedicamento && caixaSugestoes) {
  inputMedicamento.addEventListener("input", function () {
    const termo = inputMedicamento.value.trim();

    inputIdCatalogoMedicamento.value = "";

    clearTimeout(temporizadorPesquisa);

    if (termo.length < 2) {
      esconderSugestoesMedicamentos();
      return;
    }

    temporizadorPesquisa = setTimeout(function () {
      pesquisarMedicamentos(termo);
    }, 300);
  });

  document.addEventListener("click", function (event) {
    if (
      !inputMedicamento.contains(event.target) &&
      !caixaSugestoes.contains(event.target)
    ) {
      esconderSugestoesMedicamentos();
    }
  });
}

async function pesquisarMedicamentos(termo) {
  try {
    const resposta = await fetch(
      `/api/medicacao/catalogo?termo=${encodeURIComponent(termo)}`
    );

    if (!resposta.ok) {
      throw new Error("Erro ao pesquisar medicamentos.");
    }

    const medicamentos = await resposta.json();

    mostrarSugestoesMedicamentos(medicamentos);
  } catch (erro) {
    console.error(erro);
    esconderSugestoesMedicamentos();
  }
}

function mostrarSugestoesMedicamentos(medicamentos) {
  caixaSugestoes.innerHTML = "";

  if (medicamentos.length === 0) {
    caixaSugestoes.innerHTML = `
      <div class="list-group-item text-muted">
        Nenhum medicamento encontrado.
      </div>
    `;
    caixaSugestoes.classList.remove("d-none");
    return;
  }

  medicamentos.forEach(function (med) {
    const item = document.createElement("button");

    item.type = "button";
    item.className = "list-group-item list-group-item-action";

    item.innerHTML = `
      <div class="fw-semibold">${med.nome_medicamento}</div>
      <small class="text-muted">
        ${med.substancia_ativa || "Sem substância ativa"} ·
        ${med.forma_farmaceutica || ""} ·
        ${med.dosagem || ""}
      </small>
    `;

    item.addEventListener("click", function () {
      selecionarMedicamento(med);
    });

    caixaSugestoes.appendChild(item);
  });

  caixaSugestoes.classList.remove("d-none");
}

function selecionarMedicamento(med) {
  inputMedicamento.value = med.nome_medicamento;
  inputIdCatalogoMedicamento.value = med.id;

  esconderSugestoesMedicamentos();
}

function esconderSugestoesMedicamentos() {
  caixaSugestoes.classList.add("d-none");
  caixaSugestoes.innerHTML = "";
}