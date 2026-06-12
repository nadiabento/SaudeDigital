document.addEventListener("DOMContentLoaded", () => {
  carregarDadosPerfil();

  // Descarregar dados estruturais atualizados do servidor
  carregarArraysModicacao();

  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".position-relative")) {
      esconderTodasAsListas();
    }
  });
});

let listaMedicos = [];
let listaUnidades = [];
let listaMedicamentos = [];
let listaEfeitos = [];
let listaCategorias = [];
let listaTipos = [];

const idsSelecionados = {
  medico: null,
  unidade: null,
  medicamento: null,
  efeito: null,
  categoria: null,
  tipo: null,
};

// --- 1. CHAMADAS ATUALIZADAS E SINCRONIZADAS ---
async function carregarArraysModicacao() {
  try {
    // AQUI ESTÁ A MUDANÇA: Mudámos de "/api/consultas" para "/api/consultas/medicos"
    const resMed = await fetch("/api/consultas/medicos");
    if (resMed.ok) listaMedicos = await resMed.json();

    const resUni = await fetch("/api/consultas/unidades");
    if (resUni.ok) listaUnidades = await resUni.json();

    // Passamos um termo vazio para ativar a pesquisa que já tens escrita no teu medRoutes
    const resCatMed = await fetch("/api/medicacao/catalogo/todos");
    if (resCatMed.ok) listaMedicamentos = await resCatMed.json();

    // Sintonizado com a nova rota GET /api/medicacao/efeitos que adicionámos ao backend
    const resEfe = await fetch("/api/medicacao/efeitos");
    if (resEfe.ok) listaEfeitos = await resEfe.json();

    const resCat = await fetch("/api/exames/categorias");
    if (resCat.ok) listaCategorias = await resCat.json();

    // Rota global do Sequelize mapeada no teu novo exameController
    const resTip = await fetch("/api/exames/tipos-todos");
    if (resTip.ok) listaTipos = await resTip.json();

    configurarFiltrosDinamicos();
  } catch (err) {
    console.error("Erro ao carregar dados de moderação no conta.js:", err);
  }
}

// --- 2. CONFIGURAÇÃO CIRÚRGICA DOS CAMPOS DA BD ---
function configurarFiltrosDinamicos() {
  setupFiltroUnico(
    "inputBuscarMedico",
    "sugestoesMedico",
    listaMedicos,
    "nome",
    "medico",
  );
  setupFiltroUnico(
    "inputBuscarUnidade",
    "sugestoesUnidade",
    listaUnidades,
    "nome",
    "unidade",
  );

  // Mapeia para 'nome_medicamento' conforme o teu modelo SQL do catálogo
  setupFiltroUnico(
    "inputBuscarMedicamento",
    "sugestoesMedicamento",
    listaMedicamentos,
    "nome_medicamento",
    "medicamento",
  );

  // Mapeia para 'sintoma' conforme a tabela Efeito_Secundario
  setupFiltroUnico(
    "inputBuscarEfeito",
    "sugestoesEfeito",
    listaEfeitos,
    "sintoma",
    "efeito",
  );

  setupFiltroUnico(
    "inputBuscarCategoria",
    "sugestoesCategoria",
    listaCategorias,
    "nome",
    "categoria",
  );
  setupFiltroUnico(
    "inputBuscarTipo",
    "sugestoesTipo",
    listaTipos,
    "nome",
    "tipo",
  );
}

function setupFiltroUnico(inputId, listaUlId, dadosArray, campoBusca, chaveId) {
  const input = document.getElementById(inputId);
  const ul = document.getElementById(listaUlId);

  if (!input || !ul) return;

  input.addEventListener("input", () => {
    const termo = input.value.trim().toLowerCase();
    ul.innerHTML = "";
    idsSelecionados[chaveId] = null;

    if (!termo) {
      ul.style.setProperty("display", "none", "important");
      return;
    }

    const filtrados = dadosArray.filter((item) =>
      String(item[campoBusca]).toLowerCase().includes(termo),
    );

    if (filtrados.length === 0) {
      ul.style.setProperty("display", "none", "important");
      return;
    }

    filtrados.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerText = item[campoBusca];

      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        input.value = item[campoBusca];
        idsSelecionados[chaveId] =
          item.id || item.id_unidade || item.id_categoria;
        ul.style.setProperty("display", "none", "important");
      });

      ul.appendChild(li);
    });

    ul.style.setProperty("display", "block", "important");
  });
}

function esconderTodasAsListas() {
  const listas = document.querySelectorAll(".custom-autocomplete-list");
  listas.forEach((l) => (l.style.display = "none"));
}

// --- 3. EXECUÇÃO DE DELETES SEGUROS ---
async function processarRemocaoPorId(chaveId, urlBase, nomeEntidade) {
  const id = idsSelecionados[chaveId];
  if (!id) {
    return Swal.fire({
      title: "Seleção em falta",
      text: `Por favor, escreva e selecione um(a) ${nomeEntidade} válido(a) da lista antes de tentar apagar.`,
      icon: "warning",
      confirmButtonColor: "#0d6efd",
    });
  }

  // Janela de Confirmação Estilizada do SweetAlert2
  Swal.fire({
    title: `Tem a certeza?`,
    text: `Esta ação vai eliminar permanentemente este registo de ${nomeEntidade}!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545", // Botão vermelho de perigo
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    // Se o utilizador clicar no botão vermelho "Sim, eliminar!"
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${urlBase}/${id}`, { method: "DELETE" });

        if (response.ok) {
          // Pop-up de Sucesso
          Swal.fire({
            title: "Removido!",
            text: `O registo de ${nomeEntidade} foi eliminado com sucesso.`,
            icon: "success",
            confirmButtonColor: "#0d6efd",
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            globalThis.location.reload(); // Recarrega a página após a animação terminar
          });
        } else {
          // Tratar os avisos de integridade (Se houver coisas associadas àquele ID)
          const textoErro = await response.text();
          let mensagem = "Não foi possível remover este registo.";

          try {
            const jsonErro = JSON.parse(textoErro);
            mensagem = jsonErro.error || jsonErro.erro || mensagem;
          } catch (e) {
            mensagem = textoErro || mensagem;
          }

          // Pop-up de Bloqueio de Segurança (Chaves Estrangeiras do MySQL/Sequelize)
          Swal.fire({
            title: "Aviso de Segurança",
            text: mensagem,
            icon: "error",
            confirmButtonColor: "#dc3545",
          });
        }
      } catch (error) {
        console.error("Erro na requisição:", error);
        Swal.fire({
          title: "Erro de Ligação",
          text: "Não foi possível comunicar com o servidor da UA.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}

function eliminarMedicoGlobal() {
  processarRemocaoPorId("medico", "/api/consultas/medicos", "Médico");
}
function eliminarUnidadeGlobal() {
  processarRemocaoPorId(
    "unidade",
    "/api/consultas/unidades",
    "Unidade de Saúde",
  );
}
function eliminarMedicamentoCatalogoGlobal() {
  processarRemocaoPorId(
    "medicamento",
    "/api/medicacao/catalogo",
    "Medicamento",
  );
}
function eliminarEfeitoSecundarioGlobal() {
  processarRemocaoPorId(
    "efeito",
    "/api/medicacao/efeitos",
    "Efeito Secundário",
  ); // Atualizado para a rota certa
}
function eliminarCategoriaExameGlobal() {
  processarRemocaoPorId(
    "categoria",
    "/api/exames/categorias",
    "Categoria de Exame",
  );
}
function eliminarTipoExameGlobal() {
  processarRemocaoPorId("tipo", "/api/exames/tipos", "Tipo de Exame");
}

// --- 4. PERFIL (REVERTIDO PARA O TEU ORIGINAL CASO PREFIERAS NÃO MEXER NO AUTH CONTROLLER) ---
async function carregarDadosPerfil() {
  try {
    // Tenta ler do teu backend original
    const response = await fetch("/api/auth/meu-perfil");

    if (response.ok) {
      const user = await response.json();
      document.getElementById("inputAtualizarNome").value = user.nome || "";
      document.getElementById("inputEmailBloqueado").value = user.email || "";
      document.getElementById("selectGrupoSanguineo").value =
        user.grupo_sanguineo || "";
      document.getElementById("inputPeso").value = user.peso || "";
      if (user.data_nascimento)
        document.getElementById("inputDataNascimento").value =
          user.data_nascimento.split("T")[0];
    }
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}
