/**
 * --- VARIÁVEIS GLOBAIS ---
 */
let categoriasGlobais = [];
let tiposGlobais = [];
let examesParaTabela = [];
let direcaoOrdenacao = { exame: 1, data: 1 };
let paginaAtual = 1;
const examesPorPagina = 5;

// --- CONFIGURAÇÃO INICIAL ---
window.onload = () => {
  carregarCategorias();
  carregarHistorico();
  configurarEventosInterface();
};

/**
 * --- 1. COMUNICAÇÃO COM A API (GET) ---
 */

async function carregarCategorias() {
  try {
    const response = await fetch("/api/exames/categorias");
    categoriasGlobais = await response.json();
    const selectModal = document.getElementById("selectCategoriaPai");
    if (selectModal) {
      selectModal.innerHTML =
        '<option value="">Selecione uma categoria...</option>';
      categoriasGlobais.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.nome;
        selectModal.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Erro categorias:", error);
  }
}

async function carregarHistorico() {
  try {
    const response = await fetch("/api/exames/historico");
    examesParaTabela = await response.json();
    renderizarTabela();
  } catch (error) {
    console.error("Erro histórico:", error);
  }
}

async function atualizarTiposExame(idCategoria) {
  const inputTipo = document.getElementById("tipoExameInput");
  try {
    const response = await fetch(`/api/exames/tipos/${idCategoria}`);
    tiposGlobais = await response.json();
    inputTipo.value = "";
    inputTipo.disabled = false;
    inputTipo.placeholder = "Escreva o tipo de exame...";
  } catch (error) {
    console.error("Erro tipos:", error);
  }
}

/**
 * --- 2. RENDERIZAÇÃO E PAGINAÇÃO ---
 */

function renderizarTabela() {
  const tbody = document.getElementById("tabelaExames");
  if (!tbody) return;
  tbody.innerHTML = "";

  const inicio = (paginaAtual - 1) * examesPorPagina;
  const fim = inicio + examesPorPagina;
  const examesPaginados = examesParaTabela.slice(inicio, fim);

  examesPaginados.forEach((exame) => {
    let dataF = exame.data
      ? exame.data.split("T")[0].split("-").reverse().join("/")
      : "---";

    tbody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="form-check-input exame-checkbox" value="${exame.id}" onchange="verificarSelecao()"></td>
                <td><strong>${exame.nome}</strong></td>
                <td>${dataF}</td>
                <td>
                    ${exame.resultado ? `<a href="/uploads/${exame.resultado}" target="_blank" class="badge bg-danger-subtle text-danger text-decoration-none">PDF</a>` : "---"}
                </td>
                <td class="text-end">
                    <div class="dropdown">
                        <button class="btn btn-light btn-sm border" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                            <li><a class="dropdown-item" href="#" onclick="gerarLinkPartilha(${exame.id})"><i class="bi bi-share me-2"></i> Partilhar</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="eliminarUm(${exame.id})"><i class="bi bi-trash me-2"></i> Eliminar</a></li>
                        </ul>
                    </div>
                </td>
            </tr>`;
  });
  renderizarControlosPaginacao();
}

function renderizarControlosPaginacao() {
  const totalPaginas = Math.ceil(examesParaTabela.length / examesPorPagina);
  const container = document.querySelector(".table-responsive");
  let pagExistente = document.querySelector(".pagination-container");
  if (pagExistente) pagExistente.remove();

  if (totalPaginas <= 1) return;

  let html = `<div class="pagination-container d-flex justify-content-center gap-2 mt-3">`;
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="btn btn-sm ${i === paginaAtual ? "btn-primary" : "btn-outline-primary"}" 
                 onclick="mudarPagina(${i})">${i}</button>`;
  }
  html += `</div>`;
  container.insertAdjacentHTML("afterend", html);
}

function mudarPagina(num) {
  paginaAtual = num;
  renderizarTabela();
}

function filtrarTabela() {
  const termo = document.getElementById("inputSearch").value.toLowerCase();
  const linhas = document.querySelectorAll("#tabelaExames tr");
  linhas.forEach((linha) => {
    const texto = linha.innerText.toLowerCase();
    linha.style.display = texto.includes(termo) ? "" : "none";
  });
}

/**
 * --- 3. SELEÇÃO E AÇÕES EM MASSA ---
 */

function toggleTodos(master) {
  document
    .querySelectorAll(".exame-checkbox")
    .forEach((cb) => (cb.checked = master.checked));
  verificarSelecao();
}

function verificarSelecao() {
  const n = document.querySelectorAll(".exame-checkbox:checked").length;
  const acoes = document.getElementById("acoesMassa");
  if (acoes)
    n > 0 ? acoes.classList.remove("d-none") : acoes.classList.add("d-none");
}

async function eliminarSelecionados() {
  const ids = Array.from(
    document.querySelectorAll(".exame-checkbox:checked"),
  ).map((cb) => cb.value);
  if (ids.length === 0) return;
  if (!confirm(`Deseja eliminar ${ids.length} exames?`)) return;
  executarEliminacao(ids);
}

async function executarEliminacao(ids) {
  try {
    const res = await fetch("/api/exames/eliminar-massa", {
      method: "DELETE", // Garante que o método é DELETE
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (res.ok) {
      alert("Exame(s) eliminado(s)!");
      carregarHistorico(); // Recarrega a tabela
    } else {
      const erro = await res.json();
      alert("Erro: " + erro.error);
    }
  } catch (error) {
    console.error("Erro na comunicação com o servidor:", error);
  }
}

async function eliminarUm(id) {
  if (!confirm("Tem a certeza que deseja eliminar este exame?")) return;
  executarEliminacao([id]);
}
/**
 * --- 4. CONFIGURAÇÃO DE EVENTOS E SUBMISSÃO ---
 */

function configurarEventosInterface() {
  // Autocompletes
  const inputClasse = document.getElementById("classeExameInput");
  const listaUlClasse = document.getElementById("sugestoesClasse");
  const inputTipo = document.getElementById("tipoExameInput");
  const listaUlTipo = document.getElementById("sugestoesTipo");

  if (inputClasse) {
    inputClasse.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase();
      listaUlClasse.innerHTML = "";
      if (termo.length > 0) {
        const filtradas = categoriasGlobais.filter((c) =>
          c.nome.toLowerCase().startsWith(termo),
        );
        filtradas.forEach((cat) => {
          const li = document.createElement("li");
          li.className = "list-group-item list-group-item-action";
          li.textContent = cat.nome;
          li.onclick = () => {
            inputClasse.value = cat.nome;
            listaUlClasse.style.display = "none";
            atualizarTiposExame(cat.id);
          };
          listaUlClasse.appendChild(li);
        });
        listaUlClasse.style.display = filtradas.length > 0 ? "block" : "none";
      } else {
        listaUlClasse.style.display = "none";
      }
    });
  }

  if (inputTipo) {
    inputTipo.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase();
      listaUlTipo.innerHTML = "";
      if (termo.length > 0) {
        const filtrados = tiposGlobais.filter((t) =>
          t.nome.toLowerCase().startsWith(termo),
        );
        filtrados.forEach((tipo) => {
          const li = document.createElement("li");
          li.className = "list-group-item list-group-item-action";
          li.textContent = tipo.nome;
          li.onclick = () => {
            inputTipo.value = tipo.nome;
            document.getElementById("idTipoSelecionado").value = tipo.id;
            listaUlTipo.style.display = "none";
          };
          listaUlTipo.appendChild(li);
        });
        listaUlTipo.style.display = filtrados.length > 0 ? "block" : "none";
      } else {
        listaUlTipo.style.display = "none";
      }
    });
  }

  // --- SUBMISSÃO ÚNICA DO FORMULÁRIO ---
  const form = document.getElementById("formExame");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idTipoExame = document.getElementById("idTipoSelecionado").value;
      const dataExame = document.getElementById("dataExame").value;
      const obs = document.getElementById("observacoes").value;

      if (!idTipoExame) return alert("Selecione um exame da lista.");
      if (!dataExame) return alert("Selecione a data do exame.");

      const formData = new FormData();
      formData.append("data_exame", dataExame);
      formData.append("observacoes", obs);
      formData.append("id_tipo_exame", idTipoExame);
      formData.append("local_realizacao", "SaúdeDigital Clinic");

      const fileInput = document.querySelector('input[name="relatorio"]');
      if (fileInput && fileInput.files[0]) {
        formData.append("relatorio", fileInput.files[0]);
      }

      try {
        const response = await fetch("/api/exames/registar", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          alert("Exame registado com sucesso!");
          location.reload();
        } else {
          const res = await response.json();
          alert("Erro: " + (res.error || "Erro no servidor"));
        }
      } catch (error) {
        console.error("Erro no envio:", error);
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (inputClasse && e.target !== inputClasse)
      listaUlClasse.style.display = "none";
    if (inputTipo && e.target !== inputTipo) listaUlTipo.style.display = "none";
  });
}

/**
 * --- 5. CRIAÇÃO DE CATEGORIAS/TIPOS (MODAIS) ---
 */

async function adicionarClasse() {
  const nomeInput = document.getElementById("inputNovaClasse");
  const nome = nomeInput?.value.trim();
  if (!nome) return alert("Insira o nome da categoria.");
  const res = await fetch("/api/exames/categorias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (res.ok) {
    alert("Categoria guardada!");
    nomeInput.value = "";
    bootstrap.Modal.getInstance(
      document.getElementById("modalNovaClasse"),
    )?.hide();
    carregarCategorias();
  }
}

async function adicionarTipo() {
  const idCat = document.getElementById("selectCategoriaPai")?.value;
  const nomeInput = document.getElementById("inputNovoTipo");
  const nome = nomeInput?.value.trim();
  if (!idCat || !nome) return alert("Preencha todos os campos.");
  const res = await fetch("/api/exames/tipos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, id_categoria: idCat }),
  });
  if (res.ok) {
    alert("Tipo guardado!");
    nomeInput.value = "";
    bootstrap.Modal.getInstance(
      document.getElementById("modalNovoTipo"),
    )?.hide();
  }
}

/**
 * --- 6. UTILITÁRIOS ---
 */

function ordenarTabela(coluna) {
  const fator = direcaoOrdenacao[coluna];
  examesParaTabela.sort((a, b) => {
    let valA = coluna === "exame" ? a.nome.toLowerCase() : new Date(a.data);
    let valB = coluna === "exame" ? b.nome.toLowerCase() : new Date(b.data);
    return (valA < valB ? -1 : 1) * fator;
  });
  direcaoOrdenacao[coluna] *= -1;
  renderizarTabela();
}

async function gerarLinkPartilha(id = null) {
  const ids = id
    ? [id]
    : Array.from(document.querySelectorAll(".exame-checkbox:checked")).map(
        (cb) => cb.value,
      );
  if (ids.length === 0) return alert("Selecione exames.");

  try {
    const res = await fetch("/api/exames/gerar-partilha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examesIds: ids }),
    });
    const dados = await res.json();
    if (res.ok) {
      const link = window.location.origin + "/view/share/" + dados.token;
      navigator.clipboard.writeText(link);
      alert("Link copiado para o clipboard!");
    }
  } catch (error) {
    console.error(error);
  }
}

function exportarJSON() {
  console.log(examesParaTabela);
  alert("Dados na consola!");
}
