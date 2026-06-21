let listaAlergias = [];
let colunaOrdenacaoAlergias = null;
let direcaoOrdenacaoAlergias = "asc";

let paginaAtualAlergias = 1;
const alergiasPorPagina = 10;

document.addEventListener("DOMContentLoaded", function () {
  carregarAlergias();

  const formAlergia = document.getElementById("formAlergia");

  if (formAlergia) {
    formAlergia.addEventListener("submit", registarAlergia);
  }
});

async function carregarAlergias() {
  const tabela = document.getElementById("tabelaAlergias");

  try {
    const resposta = await fetch("/api/alergias");

    if (!resposta.ok) {
      throw new Error("Erro ao carregar alergias.");
    }

    const alergias = await resposta.json();

    listaAlergias = alergias;
    paginaAtualAlergias = 1;

    renderizarTabelaAlergias();
    renderizarPaginacaoAlergias();
    mostrarAlertaAlergiasCriticas();
  } catch (erro) {
    console.error(erro);

    tabela.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">
          Não foi possível carregar as alergias.
        </td>
      </tr>
    `;
  }
}

async function registarAlergia(event) {
  event.preventDefault();

  const substancia = document.getElementById("substanciaInput").value.trim();
  const gravidade = document.getElementById("gravidadeSelect").value;
  const observacoes = document.getElementById("observacoesAlergia").value.trim();

  if (!substancia || !gravidade) {
    Swal.fire({
        title: "Campos obrigatórios",
        text: "Indique a substância e a gravidade da alergia.",
        icon: "warning",
        confirmButtonColor: "#0d6efd"
    });

    return;
    }

  try {
    const resposta = await fetch("/api/alergias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        substancia: substancia,
        gravidade: gravidade,
        observacoes: observacoes
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao registar alergia.");
    }

    document.getElementById("formAlergia").reset();
    document.getElementById("gravidadeSelect").value = "Moderada";

    await carregarAlergias();

    Swal.fire({
    title: "Alergia registada!",
    text: resultado.mensagem,
    icon: "success",
    showConfirmButton: false,
    timer: 2000
    });
  } catch (erro) {
    Swal.fire({
        title: "Erro",
        text: erro.message,
        icon: "error",
        confirmButtonColor: "#dc3545"
        });
        }
}

function renderizarTabelaAlergias() {
  const tabela = document.getElementById("tabelaAlergias");

  tabela.innerHTML = "";

  if (listaAlergias.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Ainda não existem alergias registadas.
        </td>
      </tr>
    `;
    return;
  }

  const inicio = (paginaAtualAlergias - 1) * alergiasPorPagina;
  const fim = inicio + alergiasPorPagina;
  const alergias = listaAlergias.slice(inicio, fim);

  alergias.forEach(function (alergia) {
    tabela.innerHTML += `
      <tr>
        <td>
          <input
            type="checkbox"
            class="form-check-input alergia-checkbox"
            value="${alergia.id}"
            onchange="verificarSelecaoAlergias()"
          />
        </td>

        <td>
          <strong>${limparHTML(alergia.substancia)}</strong>
        </td>

        <td>
          ${criarBadgeGravidade(alergia.gravidade)}
        </td>

        <td>
          ${alergia.observacoes ? limparHTML(alergia.observacoes) : "-"}
        </td>

        <td class="text-end">
          <button
            class="btn btn-light btn-sm border me-1"
            onclick="abrirModalEditarAlergia(${alergia.id})"
          >
            <i class="bi bi-pencil"></i>
          </button>

          <button
            class="btn btn-light btn-sm border text-danger"
            onclick="eliminarAlergia(${alergia.id})"
          >
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

function criarBadgeGravidade(gravidade) {
  if (gravidade === "Anafilaxia") {
    return `<span class="badge bg-danger px-3">Anafilaxia</span>`;
  }

  if (gravidade === "Grave") {
    return `<span class="badge bg-danger-subtle text-danger px-3">Grave</span>`;
  }

  if (gravidade === "Moderada") {
    return `<span class="badge bg-warning-subtle text-warning px-3">Moderada</span>`;
  }

  return `<span class="badge bg-success-subtle text-success px-3">Leve</span>`;
}

function ordenarAlergias(coluna) {
  if (colunaOrdenacaoAlergias === coluna) {
    direcaoOrdenacaoAlergias =
      direcaoOrdenacaoAlergias === "asc" ? "desc" : "asc";
  } else {
    colunaOrdenacaoAlergias = coluna;
    direcaoOrdenacaoAlergias = "asc";
  }

  listaAlergias.sort(function (a, b) {
    let valorA = "";
    let valorB = "";

    if (coluna === "substancia") {
      valorA = a.substancia || "";
      valorB = b.substancia || "";
    }

    if (coluna === "gravidade") {
      valorA = obterPesoGravidade(a.gravidade);
      valorB = obterPesoGravidade(b.gravidade);
    }

    if (valorA < valorB) {
      return direcaoOrdenacaoAlergias === "asc" ? -1 : 1;
    }

    if (valorA > valorB) {
      return direcaoOrdenacaoAlergias === "asc" ? 1 : -1;
    }

    return 0;
  });

  paginaAtualAlergias = 1;
  renderizarTabelaAlergias();
  renderizarPaginacaoAlergias();
}

function obterPesoGravidade(gravidade) {
  if (gravidade === "Anafilaxia") return 1;
  if (gravidade === "Grave") return 2;
  if (gravidade === "Moderada") return 3;
  if (gravidade === "Leve") return 4;
  return 5;
}

function renderizarPaginacaoAlergias() {
  const container = document.getElementById("paginacaoAlergias");

  if (!container) {
    return;
  }

  const totalPaginas = Math.ceil(listaAlergias.length / alergiasPorPagina);

  if (totalPaginas <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <nav>
      <ul class="pagination pagination-sm m-0">
  `;

  html += `
    <li class="page-item ${paginaAtualAlergias === 1 ? "disabled" : ""}">
      <a class="page-link" href="javascript:void(0)" onclick="mudarPaginaAlergias(${paginaAtualAlergias - 1})">
        Anterior
      </a>
    </li>
  `;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
      <li class="page-item ${i === paginaAtualAlergias ? "active" : ""}">
        <a class="page-link" href="javascript:void(0)" onclick="mudarPaginaAlergias(${i})">
          ${i}
        </a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${paginaAtualAlergias === totalPaginas ? "disabled" : ""}">
      <a class="page-link" href="javascript:void(0)" onclick="mudarPaginaAlergias(${paginaAtualAlergias + 1})">
        Próximo
      </a>
    </li>
  `;

  html += `
      </ul>
    </nav>
  `;

  container.innerHTML = html;
}

function mudarPaginaAlergias(novaPagina) {
  const totalPaginas = Math.ceil(listaAlergias.length / alergiasPorPagina);

  if (novaPagina < 1 || novaPagina > totalPaginas) {
    return;
  }

  paginaAtualAlergias = novaPagina;

  renderizarTabelaAlergias();
  renderizarPaginacaoAlergias();

  const checkAll = document.getElementById("checkAllAlergias");

  if (checkAll) {
    checkAll.checked = false;
  }

  verificarSelecaoAlergias();
}

function toggleTodasAlergias(master) {
  document
    .querySelectorAll(".alergia-checkbox")
    .forEach(function (checkbox) {
      checkbox.checked = master.checked;
    });

  verificarSelecaoAlergias();
}

function verificarSelecaoAlergias() {
  const selecionadas = document.querySelectorAll(".alergia-checkbox:checked");
  const barra = document.getElementById("acoesMassaAlergias");

  if (!barra) {
    return;
  }

  if (selecionadas.length > 0) {
    barra.classList.remove("d-none");
  } else {
    barra.classList.add("d-none");
  }
}

function obterAlergiasSelecionadas() {
  const checkboxes = document.querySelectorAll(".alergia-checkbox:checked");

  const idsSelecionados = Array.from(checkboxes).map(function (checkbox) {
    return Number(checkbox.value);
  });

  return listaAlergias.filter(function (alergia) {
    return idsSelecionados.includes(alergia.id);
  });
}

function abrirModalEditarAlergia(id) {
  const alergia = listaAlergias.find(function (item) {
    return item.id === id;
  });

  if (!alergia) {
    Swal.fire({
        title: "Erro",
        text: "Alergia não encontrada.",
        icon: "error",
        confirmButtonColor: "#dc3545"
    });

    return;
    }

  document.getElementById("editAlergiaId").value = alergia.id;
  document.getElementById("editGravidade").value = alergia.gravidade;
  document.getElementById("editObservacoesAlergia").value = alergia.observacoes || "";

  new bootstrap.Modal(document.getElementById("modalEditarAlergia")).show();
}

async function guardarEdicaoAlergia() {
  const id = document.getElementById("editAlergiaId").value;
  const gravidade = document.getElementById("editGravidade").value;
  const observacoes = document.getElementById("editObservacoesAlergia").value.trim();

  try {
    const resposta = await fetch(`/api/alergias/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gravidade: gravidade,
        observacoes: observacoes
      })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao atualizar alergia.");
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modalEditarAlergia")
    );

    if (modal) {
      modal.hide();
    }

    await carregarAlergias();

    Swal.fire({
        title: "Alterações guardadas!",
        text: resultado.mensagem,
        icon: "success",
        showConfirmButton: false,
        timer: 2000
        });
  } catch (erro) {
    Swal.fire({
        title: "Erro",
        text: erro.message,
        icon: "error",
        confirmButtonColor: "#dc3545"
        });
        }
}

async function eliminarAlergia(id) {
  const resultadoConfirmacao = await Swal.fire({
    title: "Eliminar alergia?",
    text: "Esta alergia será removida do seu registo clínico.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!resultadoConfirmacao.isConfirmed) {
    return;
  }

  try {
    const resposta = await fetch(`/api/alergias/${id}`, {
      method: "DELETE"
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao eliminar alergia.");
    }

    await carregarAlergias();

    Swal.fire({
      title: "Eliminada!",
      text: resultado.mensagem,
      icon: "success",
      showConfirmButton: false,
      timer: 2000
    });
  } catch (erro) {
    Swal.fire({
      title: "Erro",
      text: erro.message,
      icon: "error",
      confirmButtonColor: "#dc3545"
    });
  }
}

async function eliminarSelecionadas() {
  const selecionadas = obterAlergiasSelecionadas();

  if (selecionadas.length === 0) {
    Swal.fire({
      title: "Atenção",
      text: "Selecione pelo menos uma alergia para eliminar.",
      icon: "info",
      confirmButtonColor: "#0d6efd"
    });

    return;
  }

  const resultadoConfirmacao = await Swal.fire({
    title: `Eliminar ${selecionadas.length} alergia(s)?`,
    text: "Esta ação irá remover as alergias selecionadas do seu registo clínico.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!resultadoConfirmacao.isConfirmed) {
    return;
  }

  try {
    for (const alergia of selecionadas) {
      const resposta = await fetch(`/api/alergias/${alergia.id}`, {
        method: "DELETE"
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Erro ao eliminar alergia.");
      }
    }

    const checkAll = document.getElementById("checkAllAlergias");

    if (checkAll) {
      checkAll.checked = false;
    }

    await carregarAlergias();
    verificarSelecaoAlergias();

    Swal.fire({
      title: "Eliminadas!",
      text: "As alergias selecionadas foram eliminadas com sucesso.",
      icon: "success",
      showConfirmButton: false,
      timer: 2000
    });
  } catch (erro) {
    Swal.fire({
      title: "Erro",
      text: erro.message,
      icon: "error",
      confirmButtonColor: "#dc3545"
    });
  }
}

function mostrarAlertaAlergiasCriticas() {
  const existeCritica = listaAlergias.some(function (alergia) {
    return alergia.gravidade === "Anafilaxia" || alergia.gravidade === "Grave";
  });

  let alerta = document.getElementById("alertaAlergiasCriticas");

  if (!existeCritica) {
    if (alerta) {
      alerta.remove();
    }

    return;
  }

  if (!alerta) {
    alerta = document.createElement("div");
    alerta.id = "alertaAlergiasCriticas";
    alerta.className = "alert alert-danger border-0 shadow-sm mb-4";
    alerta.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
        <div>
          <strong>Atenção: existem alergias graves/Anafilaxia registadas.</strong>
          <div class="small">
            Consulte esta informação antes de iniciar qualquer nova terapêutica.
          </div>
        </div>
      </div>
    `;

    const main = document.querySelector(".main-content");
    const header = main.querySelector("header");

    header.insertAdjacentElement("afterend", alerta);
  }
}
function limparHTML(texto) {
  if (texto === null || texto === undefined) {
    return "";
  }

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}