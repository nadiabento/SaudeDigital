// --- CONFIGURAÇÃO INICIAL ---
window.onload = () => {
  carregarCategorias();

  // Evento para quando mudas a "Classe do Exame" no formulário principal
  const selectPrincipal = document.getElementById("classeExameSelect");
  if (selectPrincipal) {
    selectPrincipal.addEventListener("change", (e) => {
      atualizarTiposExame(e.target.value);
    });
  }
};

// --- 1. CARREGAR CATEGORIAS DA BD ---
async function carregarCategorias() {
  try {
    const response = await fetch("/api/exames/categorias");
    const categorias = await response.json();

    // No teu HTML os IDs são: classeExameSelect (form) e selectCategoriaPai (modal)
    const selectPrincipal = document.getElementById("classeExameSelect");
    const selectModal = document.getElementById("selectCategoriaPai");

    // Limpar e manter apenas a opção padrão no principal
    selectPrincipal.innerHTML =
      '<option value="" selected disabled>Selecione a classe...</option>';
    selectModal.innerHTML = "";

    categorias.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nome;

      // Adiciona aos dois selects
      selectPrincipal.appendChild(option.cloneNode(true));
      selectModal.appendChild(option);
    });

    console.log("Categorias carregadas!");
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

// --- 2. CARREGAR TIPOS DE EXAME (FILTRO DINÂMICO) ---
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
    inputTipo.placeholder = "Agora pode pesquisar o tipo...";

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

// --- 3. ADICIONAR NOVA CATEGORIA (VIA MODAL) ---
// Nota: Por agora isto é apenas visual, depois faremos o fetch(POST) para gravar na BD
function adicionarClasse() {
  const nome = document.getElementById("inputNovaClasse").value;
  if (nome.trim() !== "") {
    alert(`Categoria "${nome}" criada! (Falta ligar ao POST do Backend)`);

    // Limpar e fechar
    document.getElementById("inputNovaClasse").value = "";
    bootstrap.Modal.getInstance(
      document.getElementById("modalNovaClasse"),
    ).hide();

    // Recarregar para ver as mudanças (depois de implementares o INSERT no node)
    // carregarCategorias();
  }
}

// --- 4. EXPORTAÇÃO ---
function exportarJSON() {
  alert("A exportar dados para formato interoperável JSON...");
}
