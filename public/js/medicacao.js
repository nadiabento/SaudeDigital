
let listaMedicamentos = [];
let colunaOrdenacaoMedicacao = null;
let direcaoOrdenacaoMedicacao = "asc";

let modoHistorico = false;

document.addEventListener("DOMContentLoaded", function () {
  carregarMedicacao();
  carregarMedicamentosParaEfeitos();

  const btnHistorico = document.getElementById("btn-historico");

  if (btnHistorico) {
    btnHistorico.addEventListener("click", function () {
      modoHistorico = !modoHistorico;
      carregarMedicacao();
      atualizarBotaoHistorico();
    });
  }
});

async function carregarMedicacao() {
  const tabela = document.getElementById("tabela-medicacao");

  try {
    const url = modoHistorico
    ? "/api/medicacao?historico=true"
    : "/api/medicacao";

const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error("Erro ao carregar medicação.");
    }

    const medicamentos = await resposta.json();

    listaMedicamentos = medicamentos;

    renderizarTabelaMedicacao(listaMedicamentos);    
    
  
}
function renderizarTabelaMedicacao(medicamentos) {
  const tabela = document.getElementById("tabela-medicacao");

  tabela.innerHTML = "";

  if (medicamentos.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
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

        <td class="text-end">
          <div class="dropdown">
            <button
              class="btn btn-sm btn-light border"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="bi bi-three-dots"></i>
            </button>

            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
              <li>
                <button
                  class="dropdown-item"
                  type="button"
                  onclick="atualizarEstadoMedicacao(${med.id}, 'Concluído')"
                >
                  <i class="bi bi-check-circle me-2 text-success"></i>
                  Concluir
                </button>
              </li>

              <li>
                <button
                  class="dropdown-item"
                  type="button"
                  onclick="atualizarEstadoMedicacao(${med.id}, 'Suspenso')"
                >
                  <i class="bi bi-pause-circle me-2 text-warning"></i>
                  Suspender
                </button>
              </li>

              <li>
                <hr class="dropdown-divider">
              </li>

              <li>
                <button
                  class="dropdown-item text-danger"
                  type="button"
                  onclick="eliminarMedicacao(${med.id})"
                >
                  <i class="bi bi-trash me-2"></i>
                  Eliminar
                </button>
              </li>
            </ul>
          </div>
        </td>
      </tr>
    `;
  });
}
function ordenarMedicacao(coluna) {
  if (colunaOrdenacaoMedicacao === coluna) {
    direcaoOrdenacaoMedicacao =
      direcaoOrdenacaoMedicacao === "asc" ? "desc" : "asc";
  } else {
    colunaOrdenacaoMedicacao = coluna;
    direcaoOrdenacaoMedicacao = "asc";
  }

  listaMedicamentos.sort(function (a, b) {
    let valorA;
    let valorB;

    if (coluna === "medicamento") {
      valorA = a.nome_medicamento || "";
      valorB = b.nome_medicamento || "";
    }

    if (coluna === "dosagem") {
      valorA = a.dosagem || "";
      valorB = b.dosagem || "";
    }

    if (coluna === "data") {
      valorA = new Date(a.data_inicio);
      valorB = new Date(b.data_inicio);
    }

    if (coluna === "dias") {
      valorA = calcularDiasRestantes(a.data_fim).dias ?? 999999;
      valorB = calcularDiasRestantes(b.data_fim).dias ?? 999999;
    }

    if (coluna === "estado") {
      valorA = a.estado || "";
      valorB = b.estado || "";
    }

    if (valorA < valorB) {
      return direcaoOrdenacaoMedicacao === "asc" ? -1 : 1;
    }

    if (valorA > valorB) {
      return direcaoOrdenacaoMedicacao === "asc" ? 1 : -1;
    }

    return 0;
  });

  renderizarTabelaMedicacao(listaMedicamentos);
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
  if (estado === "Suspenso") {
    return `<span class="badge bg-danger-subtle text-danger px-3">Suspenso</span>`;
  }

  if (estado === "Concluído") {
    return `<span class="badge bg-secondary-subtle text-secondary px-3">Concluído</span>`;
  }

  if (infoDias.tipo === "cronico") {
    return `<span class="badge bg-primary-subtle text-primary px-3">Crónico</span>`;
  }

  if (infoDias.tipo === "concluido") {
    return `<span class="badge bg-secondary-subtle text-secondary px-3">Concluído</span>`;
  }

  if (infoDias.tipo === "a_terminar") {
    return `<span class="badge bg-warning-subtle text-warning px-3">A terminar</span>`;
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
          id_catalogo_medicamento: idCatalogoMedicamento,
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

  const inputDosagem = document.getElementById("dosagem");

  if (inputDosagem) {
    inputDosagem.value = med.forma_farmaceutica || med.dosagem || "";
  }

  esconderSugestoesMedicamentos();
}

function esconderSugestoesMedicamentos() {
  caixaSugestoes.classList.add("d-none");
  caixaSugestoes.innerHTML = "";
}


async function eliminarMedicacao(id) {
  const confirmar = confirm("Tem a certeza que deseja eliminar esta medicação?");

  if (!confirmar) {
    return;
  }

  try {
    const resposta = await fetch(`/api/medicacao/${id}`, {
      method: "DELETE"
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao eliminar medicação.");
    }

    carregarMedicacao();
  } catch (erro) {
    alert(erro.message);
  }
}

function atualizarBotaoHistorico() {
  const btnHistorico = document.getElementById("btn-historico");
  const tituloPlano = document.getElementById("titulo-plano");

  if (!btnHistorico || !tituloPlano) {
    return;
  }

  if (modoHistorico) {
    btnHistorico.textContent = "Ver Plano Terapêutico Ativo";
    tituloPlano.textContent = "Histórico Completo de Medicação";
  } else {
    btnHistorico.textContent = "Ver Histórico Completo";
    tituloPlano.textContent = "Plano Terapêutico Ativo";
  }
}

async function atualizarEstadoMedicacao(id, novoEstado) {
  const confirmar = confirm(`Tem a certeza que deseja marcar esta medicação como "${novoEstado}"?`);

  if (!confirmar) {
    return;
  }

  try {
    const resposta = await fetch(`/api/medicacao/${id}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        estado: novoEstado
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao atualizar estado da medicação.");
    }

    carregarMedicacao();
  } catch (erro) {
    alert(erro.message);
  }
}

const formCatalogoMedicamento = document.getElementById("form-catalogo-medicamento");

if (formCatalogoMedicamento) {
  formCatalogoMedicamento.addEventListener("submit", async function (event) {
    event.preventDefault();

    const erroCatalogo = document.getElementById("erro-catalogo");
    const sucessoCatalogo = document.getElementById("sucesso-catalogo");

    erroCatalogo.classList.add("d-none");
    sucessoCatalogo.classList.add("d-none");
    erroCatalogo.textContent = "";
    sucessoCatalogo.textContent = "";

    const nomeMedicamento = document
      .getElementById("catalogoNomeMedicamento")
      .value.trim();

    const substanciaAtiva = document
      .getElementById("catalogoSubstanciaAtiva")
      .value.trim();

    const dosagem = document
      .getElementById("catalogoDosagem")
      .value.trim();

    const formaFarmaceutica = document
      .getElementById("catalogoFormaFarmaceutica")
      .value.trim();

    try {
      const resposta = await fetch("/api/medicacao/catalogo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome_medicamento: nomeMedicamento,
          substancia_ativa: substanciaAtiva,
          dosagem: dosagem,
          forma_farmaceutica: formaFarmaceutica
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Erro ao adicionar medicamento ao catálogo.");
      }

      sucessoCatalogo.textContent = resultado.mensagem;
      sucessoCatalogo.classList.remove("d-none");

      document.getElementById("medicamento").value = nomeMedicamento;
      document.getElementById("idCatalogoMedicamento").value = resultado.id;
      document.getElementById("dosagem").value = dosagem;

      setTimeout(function () {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("modalNovoMedicamentoCatalogo")
        );

        if (modal) {
          modal.hide();
        }

        formCatalogoMedicamento.reset();
      }, 800);
    } catch (erro) {
      erroCatalogo.textContent = erro.message;
      erroCatalogo.classList.remove("d-none");
    }
  });
}

async function carregarMedicamentosParaEfeitos() {
  const select = document.getElementById("efeitoMedicamento");

  if (!select) {
    return;
  }

  try {
    const resposta = await fetch("/api/medicacao?historico=true");

    if (!resposta.ok) {
      throw new Error("Erro ao carregar medicações.");
    }

    const medicamentos = await resposta.json();

    select.innerHTML = `
      <option value="">Selecione uma medicação...</option>
    `;

    medicamentos.forEach(function (med) {
      select.innerHTML += `
        <option value="${med.id}">
          ${med.nome_medicamento} - ${med.dosagem || ""}
        </option>
      `;
    });
  } catch (erro) {
    console.error(erro);
  }
}


const formEfeitoSecundario = document.getElementById("form-efeito-secundario");

if (formEfeitoSecundario) {
  formEfeitoSecundario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const erroEfeito = document.getElementById("erro-efeito");
    const sucessoEfeito = document.getElementById("sucesso-efeito");

    erroEfeito.classList.add("d-none");
    sucessoEfeito.classList.add("d-none");
    erroEfeito.textContent = "";
    sucessoEfeito.textContent = "";

    const idMedicamento = document.getElementById("efeitoMedicamento").value;
    const sintoma = document.getElementById("efeitoSintoma").value.trim();
    const gravidade = document.getElementById("efeitoGravidade").value;
    const dataOcorrencia = document.getElementById("efeitoData").value;
    const notas = document.getElementById("efeitoNotas").value.trim();

    try {
      const resposta = await fetch("/api/medicacao/efeitos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id_medicamento: idMedicamento,
          sintoma: sintoma,
          gravidade: gravidade,
          data_ocorrencia: dataOcorrencia,
          notas: notas
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Erro ao registar efeito secundário.");
      }

      sucessoEfeito.textContent = resultado.mensagem;
      sucessoEfeito.classList.remove("d-none");

      formEfeitoSecundario.reset();

      setTimeout(function () {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("modalEfeitoSecundario")
        );

        if (modal) {
          modal.hide();
        }
      }, 800);
    } catch (erro) {
      erroEfeito.textContent = erro.message;
      erroEfeito.classList.remove("d-none");
    }
  });
}