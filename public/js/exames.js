/**  --- VARIÁVEIS GLOBAIS --- */
let categoriasGlobais = [];
let tiposGlobais = [];
let examesParaTabela = [];
let direcaoOrdenacao = { exame: 1, data: 1 };
let paginaAtual = 1;
const examesPorPagina = 10;

// --- CONFIGURAÇÃO INICIAL ---
window.onload = () => {
  carregarCategorias();
  carregarHistorico();
  configurarEventosInterface();

  // AQUI: Bloqueia datas futuras no calendário de registo e de edição
  const hojeFormatado = new Date().toISOString().split("T")[0];

  if (document.getElementById("dataExame")) {
    document.getElementById("dataExame").setAttribute("max", hojeFormatado);
  }
  if (document.getElementById("editDataExame")) {
    document.getElementById("editDataExame").setAttribute("max", hojeFormatado);
  }
};

// --- 1. COMUNICAÇÃO COM A API (GET) ---
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

//--- 2. RENDERIZAÇÃO E PAGINAÇÃO ---

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
    const obsLimpa = exame.observacoes
      ? exame.observacoes.replace(/'/g, "\\'")
      : "";

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
                        <li>
                            <a class="dropdown-item btn-acao-individual" href="#" onclick="verDetalhes(${exame.id}, '${exame.nome}', '${exame.data}', '${obsLimpa}', '${exame.resultado || ""}')">
                                <i class="bi bi-eye me-2"></i> Ver Detalhes
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item btn-acao-individual" href="#" onclick="abrirModalEditar(${exame.id}, '${exame.data}', '${obsLimpa}')">
                                <i class="bi bi-pencil me-2"></i> Editar
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="gerarLinkPartilha(${exame.id})">
                                <i class="bi bi-share me-2"></i> Partilhar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" onclick="eliminarUm(${exame.id})">
                                <i class="bi bi-trash me-2"></i> Eliminar
                            </a>
                        </li>
                    </ul>
                </div>
            </td>
        </tr>`;
  });

  renderizarControlosPaginacao();
}

function renderizarControlosPaginacao() {
  const totalPaginas = Math.ceil(examesParaTabela.length / examesPorPagina);
  const container = document.getElementById("paginacaoContainer");

  if (!container) return;
  container.innerHTML = "";

  // Mostra sempre a paginação (mesmo com 1 página) conforme solicitado
  let html = `<nav aria-label="Navegação"><ul class="pagination pagination-sm mb-0">`;

  html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="mudarPagina(${paginaAtual - 1})">Anterior</a>
           </li>`;

  const paginasAMostrar = totalPaginas > 0 ? totalPaginas : 1;
  for (let i = 1; i <= paginasAMostrar; i++) {
    html += `<li class="page-item ${i === paginaAtual ? "active" : ""}">
              <a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>
             </li>`;
  }

  html += `<li class="page-item ${paginaAtual === totalPaginas || totalPaginas === 0 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="mudarPagina(${paginaAtual + 1})">Próximo</a>
           </li>`;

  html += `</ul></nav>`;
  container.innerHTML = html;
}

// Função de apoio para mudar a página e refrescar a tabela
function mudarPagina(num) {
  const totalPaginas = Math.ceil(examesParaTabela.length / examesPorPagina);
  if (num < 1 || num > totalPaginas) return;
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

//--- 3. SELEÇÃO E AÇÕES EM MASSA ---

function toggleTodos(master) {
  document
    .querySelectorAll(".exame-checkbox")
    .forEach((cb) => (cb.checked = master.checked));
  verificarSelecao();
}

function verificarSelecao() {
    const checkboxes = document.querySelectorAll('.exame-checkbox:checked');
    const marcados = checkboxes.length;
    
    // 1. Gerir a Barra de Ações em Massa (Aparece se houver 1 ou mais selecionados)
    const barraAcoes = document.getElementById("acoesMassa");
    if (barraAcoes) {
        // Se houver pelo menos um selecionado, mostra a barra
        const mostrarBarra = marcados > 0;
        barraAcoes.classList.toggle("d-none", !mostrarBarra);
        barraAcoes.classList.toggle("d-flex", mostrarBarra);
    }

    // 2. Bloquear Ações Individuais (Editar/Detalhes) se houver MAIS de 1 selecionado
    // Nota: Se houver apenas 1, as ações individuais devem estar ATIVAS
    const acoesIndividuais = document.querySelectorAll('.btn-acao-individual');
    const bloquearIndividuais = marcados > 1;

    acoesIndividuais.forEach(item => {
        if (bloquearIndividuais) {
            item.classList.add('disabled');
            item.style.opacity = "0.4";
            item.style.pointerEvents = "none";
            item.setAttribute("tabindex", "-1"); // Impede navegação por teclado
        } else {
            item.classList.remove('disabled');
            item.style.opacity = "1";
            item.style.pointerEvents = "auto";
            item.removeAttribute("tabindex");
        }
    });
}

// Função para apagar um exame com confirmação animada
async function eliminarUm(id) {
    // 1. Criamos a janela de confirmação (Aviso amarelo)
    Swal.fire({
        title: 'Tem a certeza?',
        text: "Este exame será removido permanentemente!",
        icon: 'warning', // Desenha o símbolo de exclamação animado
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // Cor vermelha para indicar perigo
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        // 2. Se o utilizador clicou no botão de confirmar
        if (result.isConfirmed) {
            try {
                // Chamamos a função que faz o pedido ao servidor
                await executarEliminacao([id]);

                // 3. Mostramos a animação de SUCESSO (O tal "certo" verde)
                Swal.fire({
                    title: 'Eliminado!',
                    text: 'O registo foi removido com sucesso.',
                    icon: 'success', // Aqui é onde surge a animação do "certo"
                    showConfirmButton: false,
                    timer: 1500 // Fecha sozinho para ser rápido
                });

            } catch (error) {
                // Caso o servidor falhe (ex: sem net), mostramos erro
                Swal.fire('Erro!', 'Não foi possível eliminar o exame.', 'error');
            }
        }
    });
}

// Função para o botão "Eliminar Selecionados" (Barra Azul)
async function eliminarSelecionados() {
    // 1. Captura todos os IDs dos exames que têm a checkbox marcada
    const checkboxes = document.querySelectorAll('.exame-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);

    // Segurança: Se não houver nada selecionado, não faz nada
    if (ids.length === 0) return;

    // 2. Lançamos o Alerta de Confirmação (Aviso Amarelo)
    Swal.fire({
        title: `Eliminar ${ids.length} exames?`,
        text: "Esta ação é permanente e os dados não poderão ser recuperados!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // Vermelho para indicar perigo
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, eliminar tudo',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        // 3. Se o utilizador confirmar
        if (result.isConfirmed) {
            try {
                // Chamamos a tua função que já comunica com o backend
                await executarEliminacao(ids);

                // 4. A ANIMAÇÃO DO CERTO (Sucesso Verde)
                Swal.fire({
                    title: 'Eliminados!',
                    text: 'Os registos foram removidos com sucesso.',
                    icon: 'success', // Aqui surge o símbolo do "Certo"
                    showConfirmButton: false,
                    timer: 1500
                });

            } catch (error) {
                console.error("Erro ao eliminar vários:", error);
                Swal.fire('Erro!', 'Não foi possível completar a operação.', 'error');
            }
        }
    });
}

async function executarEliminacao(ids) {
  try {
    const res = await fetch("/api/exames/eliminar-massa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) carregarHistorico();
  } catch (error) {
    console.error("Erro na eliminação:", error);
  }
}

//--- 4. CONFIGURAÇÃO DE EVENTOS E SUBMISSÃO ---

function configurarEventosInterface() {
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

  const form = document.getElementById("formExame");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const dataExame = document.getElementById("dataExame").value;
      const hoje = new Date().toISOString().split("T")[0];

      if (dataExame > hoje) {
        alert("Não é possível registar exames com datas futuras.");
        return;
      }

      const idTipoExame = document.getElementById("idTipoSelecionado").value;
      const obs = document.getElementById("observacoes").value;

      if (!idTipoExame) return alert("Selecione um tipo de exame.");

      const formData = new FormData();
      formData.append("data_exame", dataExame);
      formData.append("observacoes", obs);
      formData.append("id_tipo_exame", idTipoExame);

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
          Swal.fire({
            title: 'Sucesso!',
            text: 'O seu exame foi guardado com segurança.',
            icon: 'success',
            confirmButtonColor: '#0d6efd', // Azul Primary do Bootstrap
            timer: 2000, // Fecha sozinho após 2 segundos
            showConfirmButton: false
          }).then(() => {
          location.reload();
        });
        }
      } catch (err) {
        console.error("Erro ao enviar:", err);
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
 * --- 5. MODAIS E UTILITÁRIOS ---
 */
async function adicionarClasse() {
  const nome = document.getElementById("inputNovaClasse")?.value.trim();
  if (!nome) return alert("Insira o nome.");
  const res = await fetch("/api/exames/categorias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (res.ok) {
    alert("Sucesso!");
    location.reload();
  }
}

async function adicionarTipo() {
  const idCat = document.getElementById("selectCategoriaPai")?.value;
  const nome = document.getElementById("inputNovoTipo")?.value.trim();
  if (!idCat || !nome) return alert("Preencha tudo.");
  const res = await fetch("/api/exames/tipos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, id_categoria: idCat }),
  });
  if (res.ok) {
    alert("Sucesso!");
    location.reload();
  }
}

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
//4. PARTILHA E EMAIL
async function gerarLinkPartilha(id = null) {
    let ids = [];
    
    if (id) {
        // Se passarmos um ID (clique na linha), usamos esse
        ids = [id];
    } else {
        // Se não, vamos buscar todos os selecionados nos checkboxes
        ids = Array.from(document.querySelectorAll(".exame-checkbox:checked")).map(cb => cb.value);
    }

    if (ids.length === 0) {
        alert("Selecione pelo menos um exame para partilhar.");
        return;
    }

    try {
        const res = await fetch("/api/exames/gerar-partilha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examesIds: ids }),
        });
        
        const dados = await res.json();
        
        if (res.ok) {
            // Ajuste do link para a rota correta do teu portal do médico
            const linkFinal = `${window.location.origin}/api/exames/visualizar-partilha/${dados.token}`;
            document.getElementById("inputLinkPartilha").value = linkFinal;
            
            // Abre o modal
            const modalElement = document.getElementById('modalPartilha');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            
            // Copia automaticamente para facilitar
            navigator.clipboard.writeText(linkFinal);
        } else {
            alert("Erro ao gerar link: " + (dados.erro || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("Erro na partilha:", error);
    }
}

function copiarLinkManual() {
  const input = document.getElementById("inputLinkPartilha");
  input.select();
  navigator.clipboard.writeText(input.value);
  const msg = document.getElementById("msgCopiado");
  msg.classList.remove("d-none");
  setTimeout(() => msg.classList.add("d-none"), 3000);
}



// Função para abrir o modal e preencher os campos com os dados atuais
function abrirModalEditar(id, data, obs) {
  if (obterTotalSelecionados() > 1) {
    alert("Não é possível editar enquanto tiver vários exames selecionados.");
    return;
  }

  document.getElementById("editExameId").value = id;
  if (data) {
    const dataPura = data.includes("T") ? data.split("T")[0] : data;
    document.getElementById("editDataExame").value = dataPura;
  }
  document.getElementById("editObservacoes").value = obs || "";

  new bootstrap.Modal(document.getElementById("modalEditarExame")).show();
}

// Função para enviar os novos dados para o Backend
async function guardarEdicao() {
  const id = document.getElementById("editExameId").value;
  const data = document.getElementById("editDataExame").value;
  const obs = document.getElementById("editObservacoes").value;
  const hoje = new Date().toISOString().split("T")[0];

  if (!data) return alert("A data é obrigatória.");

  if (data > hoje) {
    alert("A data editada não pode ser futura.");
    return;
  }

  try {
    const res = await fetch(`/api/exames/editar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_exame: data, observacoes: obs }),
    });

    if (res.ok) {
      alert("Exame atualizado com sucesso!");
      location.reload();
    } else {
      const erro = await res.json();
      alert("Erro ao atualizar: " + erro.error);
    }
  } catch (error) {
    console.error("Erro na edição:", error);
    alert("Erro de comunicação com o servidor.");
  }
}

// 1. Função Ver Detalhes (Bloqueia se > 1 selecionado)
function verDetalhes(id, nome, data, obs, ficheiro) {
    // Bloqueio de segurança para o professor ver
    if (obterTotalSelecionados() > 1) {
        alert("Para ver os detalhes, desmarque as seleções múltiplas. Esta ação só é permitida para um exame de cada vez.");
        return;
    }

    document.getElementById("detalheNome").textContent = nome;
    
    // Formatação de data PT-PT
    const dataF = data ? data.split("T")[0].split("-").reverse().join("/") : "---";
    document.getElementById("detalheData").textContent = dataF;
    
    // Proteção contra texto vazio
    document.getElementById("detalheObservacoes").textContent = obs && obs !== 'undefined' ? obs : "Sem observações.";

    const containerFicheiro = document.getElementById("detalheFicheiro");
    if (ficheiro && ficheiro !== "null" && ficheiro !== "undefined" && ficheiro !== "") {
        containerFicheiro.innerHTML = `
            <a href="/uploads/${ficheiro}" target="_blank" class="btn btn-danger w-100 fw-bold shadow-sm">
                <i class="bi bi-file-earmark-pdf me-2"></i>Ver PDF do Exame
            </a>`;
    } else {
        containerFicheiro.innerHTML = '<p class="text-muted small text-center italic">Nenhum documento anexo.</p>';
    }

    new bootstrap.Modal(document.getElementById("modalDetalhesExame")).show();
}

// Função auxiliar para contar quantos exames estão selecionados
function obterTotalSelecionados() {
  return document.querySelectorAll(".exame-checkbox:checked").length;
}


function enviarPorEmail() {
    const link = document.getElementById("inputLinkPartilha").value;
    
    if (!link) {
        alert("Por favor, gere o link primeiro.");
        return; 
    }

    const nomeUtilizador = localStorage.getItem("userName") || "Utilizador SaúdeDigital";
    const assunto = encodeURIComponent("Resultados de Exames - SaúdeDigital");
    
    const corpo = encodeURIComponent(
        `Olá,\n\n` +
        `Partilho consigo o link para acesso aos meus exames clínicos através da plataforma SaúdeDigital:\n\n` +
        `${link}\n\n` +
        `Este link expirará em breve por questões de segurança.\n\n` +
        `Melhores cumprimentos,\n` +
        `${nomeUtilizador}`
    );

    window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
}