/*VARIÁVEIS GLOBAIS ---
 * categoriasGlobais: Armazena as classes (ex: Cardiologia) vindas da BD.
 * tiposGlobais: Armazena os tipos (ex: ECG) da classe selecionada.
 * examesParaTabela: Armazena o histórico para permitir ordenação sem novo fetch.
 */

let categoriasGlobais = [];
let tiposGlobais = [];
let examesParaTabela = [];
let direcaoOrdenacao = { exame: 1, data: 1 };

// --- CONFIGURAÇÃO INICIAL (EVENTOS) ---
window.onload = () => {
  carregarCategorias(); // Carrega as classes para o autocomplete e modais
  carregarHistorico(); // Carrega a tabela de exames realizados

  // --- LÓGICA DO AUTOCOMPLETE: CLASSE DO EXAME ---
  const inputClasse = document.getElementById("classeExameInput");
  const listaUlClasse = document.getElementById("sugestoesClasse");

  if (inputClasse && listaUlClasse) {
    inputClasse.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase();
      listaUlClasse.innerHTML = ""; // Limpa a lista anterior

      if (termo.length > 0) {
        // Filtra categorias que COMEÇAM com o texto digitado
        const filtradas = categoriasGlobais.filter((cat) =>
          cat.nome.toLowerCase().startsWith(termo),
        );

        if (filtradas.length > 0) {
          listaUlClasse.style.display = "block";
          filtradas.forEach((cat) => {
            const li = document.createElement("li");
            li.className = "list-group-item list-group-item-action";
            li.textContent = cat.nome;
            li.onclick = () => {
              inputClasse.value = cat.nome;
              listaUlClasse.style.display = "none";
              atualizarTiposExame(cat.id); // Desbloqueia e carrega os tipos desta classe
            };
            listaUlClasse.appendChild(li);
          });
        } else {
          listaUlClasse.style.display = "none";
        }
      } else {
        listaUlClasse.style.display = "none";
      }
    });
  }

  // --- LÓGICA DO AUTOCOMPLETE: TIPO DE EXAME ---
  const inputTipo = document.getElementById("tipoExameInput");
  const listaUlTipo = document.getElementById("sugestoesTipo");

  if (inputTipo && listaUlTipo) {
    inputTipo.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase();
      listaUlTipo.innerHTML = "";

      if (termo.length > 0) {
        const filtrados = tiposGlobais.filter((t) =>
          t.nome.toLowerCase().startsWith(termo),
        );

        if (filtrados.length > 0) {
          listaUlTipo.style.display = "block";
          filtrados.forEach((tipo) => {
            const li = document.createElement("li");
            li.className = "list-group-item list-group-item-action";
            li.textContent = tipo.nome;
            li.onclick = () => {
              inputTipo.value = tipo.nome;
              // Guarda o ID no campo oculto (input hidden) para o formulário
              document.getElementById("idTipoSelecionado").value = tipo.id;
              listaUlTipo.style.display = "none";
            };
            listaUlTipo.appendChild(li);
          });
        } else {
          listaUlTipo.style.display = "none";
        }
      } else {
        listaUlTipo.style.display = "none";
      }
    });
  }

  // Fecha as listas de sugestões se o utilizador clicar fora delas
  document.addEventListener("click", (e) => {
    if (e.target !== inputClasse) listaUlClasse.style.display = "none";
    if (e.target !== inputTipo) listaUlTipo.style.display = "none";
  });
};

// --- 1. CARREGAR CLASSES (CATEGORIAS) ---
async function carregarCategorias() {
  try {
    const response = await fetch("/api/exames/categorias");
    categoriasGlobais = await response.json();

    // Preenche o select dentro do Modal "Novo Tipo"
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
    console.error("Erro ao carregar categorias:", error);
  }
}

// --- 2. CARREGAR TIPOS (FILTRO DINÂMICO) ---
async function atualizarTiposExame(idCategoria) {
  const inputTipo = document.getElementById("tipoExameInput");
  try {
    const response = await fetch(`/api/exames/tipos/${idCategoria}`);
    tiposGlobais = await response.json();

    inputTipo.value = "";
    inputTipo.disabled = false; // Ativa o campo agora que temos a classe
    inputTipo.placeholder = "Escreva o tipo de exame...";
  } catch (error) {
    console.error("Erro ao carregar tipos:", error);
  }
}

// --- 3. HISTÓRICO E TABELA ---
async function carregarHistorico() {
  try {
    const response = await fetch("/api/exames/historico");
    examesParaTabela = await response.json();
    renderizarTabela();
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
  }
}

function renderizarTabela() {
  const tbody = document.getElementById("tabelaExames");
  if (!tbody) return;
  tbody.innerHTML = "";

  examesParaTabela.forEach((exame) => {
    // Formata a data (YYYY-MM-DD -> DD/MM/YYYY)
    let dataF = "---";
    if (exame.data) {
      const dataLimpa = exame.data.includes("T")
        ? exame.data.split("T")[0]
        : exame.data;
      dataF = dataLimpa.split("-").reverse().join("/");
    }

    tbody.innerHTML += `
            <tr>
                <td><strong>${exame.nome}</strong></td>
                <td>${dataF}</td>
                <td>
                    ${
                      exame.resultado
                        ? `<a href="/uploads/${exame.resultado}" target="_blank" class="badge bg-danger-subtle text-danger text-decoration-none"><i class="bi bi-file-pdf"></i> PDF</a>`
                        : "---"
                    }
                </td>
                <td class="text-end">
                    <button class="btn btn-light btn-sm border"><i class="bi bi-three-dots"></i></button>
                </td>
            </tr>`;
  });
}

// --- 4. FUNÇÕES PARA OS MODAIS (CRIAÇÃO) ---

// --- FUNÇÃO PARA ADICIONAR CATEGORIA ---
async function adicionarClasse() {
  console.log("Botão Categoria Clicado!"); // Isto tem de aparecer na consola (F12)

  const nomeInput = document.getElementById("inputNovaClasse");
  if (!nomeInput)
    return console.error("Não encontrei o input 'inputNovaClasse'");

  const nome = nomeInput.value.trim();
  if (!nome) return alert("Escreve um nome para a categoria.");

  try {
    const res = await fetch("/api/exames/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome }),
    });

    if (res.ok) {
      alert("Categoria guardada!");
      nomeInput.value = "";
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modalNovaClasse"),
      );
      if (modal) modal.hide();
      await carregarCategorias(); // Atualiza a lista
    } else {
      alert("Erro ao gravar no servidor.");
    }
  } catch (error) {
    console.error("Erro no fetch:", error);
    alert("Erro de ligação.");
  }
}

// --- FUNÇÃO PARA ADICIONAR TIPO ---
async function adicionarTipo() {
  console.log("Botão Tipo Clicado!");

  const idCat = document.getElementById("selectCategoriaPai").value;
  const nomeInput = document.getElementById("inputNovoTipo");
  const nome = nomeInput.value.trim();

  if (!idCat || !nome) return alert("Preenche todos os campos.");

  try {
    const res = await fetch("/api/exames/tipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome, id_categoria: idCat }),
    });

    if (res.ok) {
      alert("Tipo de exame guardado!");
      nomeInput.value = "";
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modalNovoTipo"),
      );
      if (modal) modal.hide();
    }
  } catch (error) {
    console.error("Erro no fetch:", error);
  }
}

// --- 5. SUBMISSÃO DO FORMULÁRIO (UPLOAD) ---
document.getElementById("formExame").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Captura o ID do campo oculto preenchido pelo autocomplete do Tipo
  const idTipoExame = document.getElementById("idTipoSelecionado").value;

  if (!idTipoExame)
    return alert("Por favor, selecione um exame válido da lista.");

  const formData = new FormData();
  formData.append(
    "data_exame",
    e.target.querySelector('input[type="date"]').value,
  );
  formData.append("observacoes", document.getElementById("observacoes").value);
  formData.append("id_tipo_exame", idTipoExame);
  formData.append("local_realizacao", "SaúdeDigital Clinic");

  const fileInput = e.target.querySelector('input[name="relatorio"]');
  if (fileInput.files[0]) formData.append("relatorio", fileInput.files[0]);

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
      alert("Erro: " + res.error);
    }
  } catch (error) {
    console.error("Erro no envio:", error);
  }
});

// --- 6. UTILITÁRIOS (ORDENAÇÃO E JSON) ---
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

function exportarJSON() {
  alert("Dados exportados para a consola!");
  console.log(JSON.stringify(examesParaTabela, null, 2));
}
