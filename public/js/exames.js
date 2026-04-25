// --- VARIÁVEIS GLOBAIS ---
let examesParaTabela = [];
let direcaoOrdenacao = { exame: 1, data: 1 };

// --- CONFIGURAÇÃO INICIAL ---
window.onload = () => {
  carregarCategorias();
  carregarHistorico(); // <--- CHAMADA ADICIONADA AQUI

  const selectPrincipal = document.getElementById("classeExameSelect");
  if (selectPrincipal) {
    selectPrincipal.addEventListener("change", (e) => {
      atualizarTiposExame(e.target.value);
    });
  }
};

// --- 1. CARREGAR CATEGORIAS ---
async function carregarCategorias() {
  try {
    const response = await fetch("/api/exames/categorias");
    const categorias = await response.json();

    const selectPrincipal = document.getElementById("classeExameSelect");
    const selectModal = document.getElementById("selectCategoriaPai");

    selectPrincipal.innerHTML =
      '<option value="" selected disabled>Selecione a classe...</option>';
    selectModal.innerHTML = "";

    categorias.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nome;
      selectPrincipal.appendChild(option.cloneNode(true));
      selectModal.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

// --- 2. CARREGAR TIPOS (FILTRO) ---
async function atualizarTiposExame(idCategoria) {
  const inputTipo = document.getElementById("tipoExameInput");
  const datalist = document.getElementById("listaExames");
  if (!idCategoria) return;

  try {
    const response = await fetch(`/api/exames/tipos/${idCategoria}`);
    const tipos = await response.json();
    datalist.innerHTML = "";
    inputTipo.value = "";
    inputTipo.disabled = false;
    inputTipo.placeholder = "Pesquisar exame...";

    tipos.forEach((tipo) => {
      const option = document.createElement("option");
      option.value = tipo.nome;
      option.dataset.id = tipo.id;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar tipos:", error);
  }
}

// --- 3. HISTÓRICO E TABELA ---

// Função que faz o fetch dos dados
async function carregarHistorico() {
  try {
    const response = await fetch("/api/exames/historico");
    const dados = await response.json();
    examesParaTabela = dados; // Guarda no array global
    renderizarTabela(); // Desenha a tabela
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
  }
}

function renderizarTabela() {
  const tbody = document.getElementById("tabelaExames");
  tbody.innerHTML = "";

  examesParaTabela.forEach((exame) => {
    // 1. Tratamento da data (garantir que não quebra se for objeto Date ou String)
    const dataRaw = exame.data.includes("T")
      ? exame.data.split("T")[0]
      : exame.data;
    const dataFormatada = dataRaw.split("-").reverse().join("/");

    // 2. Criar a linha da tabela
    tbody.innerHTML += `
            <tr>
                <td><strong>${exame.nome}</strong></td>
                <td>${dataFormatada}</td>
                <td>
                    ${
                      exame.resultado
                        ? `
                        <a href="/uploads/${exame.resultado}" target="_blank" class="badge bg-danger-subtle text-danger px-3 text-decoration-none">
                            <i class="bi bi-file-pdf me-1"></i> PDF
                        </a>
                    `
                        : '<span class="text-muted small">Sem ficheiro</span>'
                    }
                </td>
                <td class="text-end">
                    <button class="btn btn-light btn-sm border"><i class="bi bi-three-dots"></i></button>
                </td>
            </tr>
        `;
  });
}

// --- 4. ORDENAÇÃO ---

function ordenarTabela(coluna) {
  const fator = direcaoOrdenacao[coluna];

  examesParaTabela.sort((a, b) => {
    let valA = coluna === "exame" ? a.nome.toLowerCase() : new Date(a.data);
    let valB = coluna === "exame" ? b.nome.toLowerCase() : new Date(b.data);

    if (valA < valB) return -1 * fator;
    if (valA > valB) return 1 * fator;
    return 0;
  });

  direcaoOrdenacao[coluna] *= -1;
  atualizarIconeOrdenacao(coluna, direcaoOrdenacao[coluna]);
  renderizarTabela();
}

function atualizarIconeOrdenacao(coluna, direcao) {
  document.getElementById("setaExame").className =
    "bi bi-arrow-down-up ms-1 small text-muted";
  document.getElementById("setaData").className =
    "bi bi-arrow-down-up ms-1 small text-muted";

  const idSeta = coluna === "exame" ? "setaExame" : "setaData";
  const icone = document.getElementById(idSeta);
  // Se direcao for -1 (DESC), seta para baixo. Se for 1 (ASC), seta para cima.
  icone.className =
    direcao === -1
      ? "bi bi-arrow-down ms-1 small text-primary"
      : "bi bi-arrow-up ms-1 small text-primary";
}

// --- 5. OUTRAS FUNÇÕES ---
function adicionarClasse() {
  const nome = document.getElementById("inputNovaClasse").value;
  if (nome.trim() !== "") {
    alert(`Categoria "${nome}" registada!`);
    document.getElementById("inputNovaClasse").value = "";
    bootstrap.Modal.getInstance(
      document.getElementById("modalNovaClasse"),
    ).hide();
  }
}

function exportarJSON() {
  alert("A exportar dados JSON...");
}

// --- 6. SUBMETER FORMULÁRIO (UPLOAD) ---
document.getElementById("formExame").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();

  // Captura os campos simples
  const dataExame = e.target.querySelector('input[type="date"]').value;
  const observacoes = document.getElementById("observacoes").value;

  // Captura o ID do tipo de exame selecionado no datalist
  const inputTipo = document.getElementById("tipoExameInput");
  const optionSelecionada = document.querySelector(
    `#listaExames option[value="${inputTipo.value}"]`,
  );
  const idTipoExame = optionSelecionada ? optionSelecionada.dataset.id : null;

  if (!idTipoExame) {
    alert("Por favor, selecione um tipo de exame válido da lista.");
    return;
  }

  formData.append("data_exame", dataExame);
  formData.append("observacoes", observacoes);
  formData.append("id_tipo_exame", idTipoExame);
  formData.append("local_realizacao", "SaúdeDigital Clinic"); // Valor padrão ou criar input

  // Captura o ficheiro PDF
  const fileInput = e.target.querySelector('input[name="relatorio"]');
  if (fileInput.files[0]) {
    formData.append("relatorio", fileInput.files[0]);
  }

  try {
    const response = await fetch("/api/exames/registar", {
      method: "POST",
      body: formData,
    });

    const res = await response.json();
    if (response.ok) {
      alert(res.message);
      location.reload(); // Recarrega para mostrar na tabela
    } else {
      alert("Erro: " + res.error);
    }
  } catch (error) {
    console.error("Erro no envio:", error);
  }
});
