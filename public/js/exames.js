/** * --- VARIÁVEIS GLOBAIS ---
 * Mantêm o estado da aplicação no lado do cliente.
 */
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

  // Bloqueia datas futuras nos calendários (Integridade de dados)
  const hojeFormatado = new Date().toISOString().split("T")[0];
  ["dataExame", "editDataExame"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("max", hojeFormatado);
  });
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

async function carregarHistorico(pagina = 1) {
  try {
    const response = await fetch(`/api/exames/historico?page=${pagina}`);
    if (!response.ok) throw new Error("Erro na rede"); // Evita processar se der erro 500

    const data = await response.json();

    // Como agora o servidor manda um OBJETO, tens de extrair o array .exames
    examesParaTabela = data.exames;
    paginaAtual = data.paginaAtual;

    // Chama a renderização passando o total de páginas que veio do servidor
    renderizarTabela(data.totalPaginas);
  } catch (error) {
    console.error("Erro histórico:", error);
  }
}

async function atualizarTiposExame(idCategoria) {
  const inputTipo = document.getElementById("tipoExameInput");
  try {
    const response = await fetch(`/api/exames/tipos/${idCategoria}`);
    tiposGlobais = await response.json();
    if (inputTipo) {
      inputTipo.value = "";
      inputTipo.disabled = false;
      inputTipo.placeholder = "Escreva o tipo de exame...";
    }
  } catch (error) {
    console.error("Erro tipos:", error);
  }
}

//--- 2. RENDERIZAÇÃO E PAGINAÇÃO ---

function renderizarTabela(totalPaginas) {
  const tbody = document.getElementById("tabelaExames");
  if (!tbody) return;
  tbody.innerHTML = "";

  // O array 'examesParaTabela' agora contém apenas os 10 itens enviados pelo servidor
  examesParaTabela.forEach((exame) => {
    let dataF = exame.data
      ? exame.data.split("T")[0].split("-").reverse().join("/")
      : "---";

    const obsLimpa = exame.observacoes
      ? exame.observacoes.replace(/'/g, "\\'").replace(/"/g, "&quot;")
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
                            <li><a class="dropdown-item btn-acao-individual" href="javascript:void(0)" onclick="verDetalhes(${exame.id}, '${exame.nome}', '${exame.data}', '${obsLimpa}', '${exame.resultado || ""}')"><i class="bi bi-eye me-2"></i> Ver Detalhes</a></li>
                            <li><a class="dropdown-item btn-acao-individual" href="javascript:void(0)" onclick="abrirModalEditar(${exame.id}, '${exame.data}', '${obsLimpa}')"><i class="bi bi-pencil me-2"></i> Editar</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="gerarLinkPartilha(${exame.id})"><i class="bi bi-share me-2"></i> Partilhar</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="eliminarUm(${exame.id})"><i class="bi bi-trash me-2"></i> Eliminar</a></li>
                        </ul>
                    </div>
                </td>
            </tr>`;
  });

  // Passamos o total de páginas recebido do servidor para os controlos
  renderizarControlosPaginacao(totalPaginas);
}

function renderizarControlosPaginacao(totalPaginas) {
  const container = document.getElementById("paginacaoContainer");
  if (!container) return;

  let html = `<nav><ul class="pagination pagination-sm">`;

  // Botão Anterior
  html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${paginaAtual - 1})">Anterior</a>
          </li>`;

  // Gerar botões numéricos baseados no totalPaginas que veio do servidor
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<li class="page-item ${i === paginaAtual ? "active" : ""}">
              <a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${i})">${i}</a>
            </li>`;
  }

  // Botão Próximo
  html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}">
            <a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${paginaAtual + 1})">Próximo</a>
          </li>`;

  html += `</ul></nav>`;
  container.innerHTML = html;
}

function mudarPagina(num) {
  if (num < 1) return;
  paginaAtual = num;
  carregarHistorico(num); // Esta função faz o fetch com ?page=num
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
  const checkboxes = document.querySelectorAll(".exame-checkbox:checked");
  const marcados = checkboxes.length;

  const barraAcoes = document.getElementById("acoesMassa");
  if (barraAcoes) {
    barraAcoes.classList.toggle("d-none", marcados === 0);
    barraAcoes.classList.toggle("d-flex", marcados > 0);
  }

  const acoesIndividuais = document.querySelectorAll(".btn-acao-individual");
  const bloquearIndividuais = marcados > 1;

  acoesIndividuais.forEach((item) => {
    if (bloquearIndividuais) {
      item.classList.add("disabled");
      item.style.opacity = "0.4";
      item.style.pointerEvents = "none";
    } else {
      item.classList.remove("disabled");
      item.style.opacity = "1";
      item.style.pointerEvents = "auto";
    }
  });
}

//--- 4. ELIMINAÇÃO (INDIVIDUAL E MASSA) ---

async function eliminarUm(id) {
  // 1. Janela de confirmação inicial
  Swal.fire({
    title: "Tem a certeza?",
    text: "Este exame será removido permanentemente do seu histórico!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    // 2. Se o utilizador confirmar a ação
    if (result.isConfirmed) {
      try {
        // Chamada à API para eliminar na base de dados
        await executarEliminacao([id]);

        // 3. ALERTA DE SUCESSO COM TEXTO DETALHADO
        Swal.fire({
          title: "Eliminado com Sucesso!",
          text: "O registo do exame e o respetivo ficheiro PDF foram removidos do sistema.",
          icon: "success",
          showConfirmButton: false,
          timer: 2000, // Visível por 2 segundos
        });
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        Swal.fire({
          title: "Erro!",
          text: "Não foi possível eliminar o exame. Tente novamente mais tarde.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}

async function eliminarSelecionados() {
  // 1. Captura os IDs selecionados
  const checkboxes = document.querySelectorAll(".exame-checkbox:checked");
  const ids = Array.from(checkboxes).map((cb) => cb.value);

  if (ids.length === 0) return;

  // 2. Alerta de confirmação detalhado
  Swal.fire({
    title: `Eliminar ${ids.length} exames?`,
    text: "Esta ação removerá todos os registos e ficheiros selecionados permanentemente!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar tudo",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Executa a eliminação no servidor
        await executarEliminacao(ids);

        // 3. SUCESSO: Texto dinâmico com a quantidade eliminada
        Swal.fire({
          title: "Registos Removidos!",
          text: `Foram eliminados ${ids.length} exames com sucesso do seu histórico.`,
          icon: "success",
          showConfirmButton: false,
          timer: 2500, // Um pouco mais de tempo para ler o número
        });
      } catch (error) {
        console.error("Erro ao eliminar vários:", error);
        Swal.fire({
          title: "Erro na operação",
          text: "Ocorreu um problema ao tentar eliminar os registos selecionados.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
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

//--- 5. CONFIGURAÇÃO DE EVENTOS E AUTOCOMPLETE ---

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
      const idTipoExame = document.getElementById("idTipoSelecionado").value;
      if (!idTipoExame)
        return Swal.fire(
          "Atenção",
          "Selecione um tipo de exame válido.",
          "warning",
        );

      const formData = new FormData();
      formData.append("data_exame", dataExame);
      formData.append(
        "observacoes",
        document.getElementById("observacoes").value,
      );
      formData.append("id_tipo_exame", idTipoExame);

      const fileInput = document.querySelector('input[name="relatorio"]');
      if (fileInput && fileInput.files[0])
        formData.append("relatorio", fileInput.files[0]);

      const res = await fetch("/api/exames/registar", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        Swal.fire({
          title: "Exame Registado!",
          text: "O seu novo exame foi guardado com sucesso no histórico clínico.",
          icon: "success",
          confirmButtonColor: "#0d6efd",
          timer: 2500,
          showConfirmButton: false,
        }).then(() => {
          // Só recarrega a página DEPOIS de mostrar o alerta
          location.reload();
        });
      } else {
        const erro = await res.json();
        Swal.fire({
          title: "Erro ao registar",
          text: erro.error || "Verifique os dados inseridos.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (inputClasse && e.target !== inputClasse)
      listaUlClasse.style.display = "none";
    if (inputTipo && e.target !== inputTipo) listaUlTipo.style.display = "none";
  });
}

// --- 6. MODAIS E UTILITÁRIOS (Categorias, Tipos, Ordenação) ---

async function adicionarClasse() {
  const nome = document.getElementById("inputNovaClasse")?.value.trim();
  if (!nome) {
    return Swal.fire({
      title: "Campo Vazio",
      text: "Por favor, insira o nome da nova categoria.",
      icon: "info",
      confirmButtonColor: "#0d6efd",
    });
  }

  try {
    const res = await fetch("/api/exames/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    if (res.ok) {
      Swal.fire({
        title: "Categoria Criada!",
        text: `A categoria "${nome}" foi adicionada com sucesso e já pode ser utilizada.`,
        icon: "success",
        confirmButtonColor: "#0d6efd",
        timer: 2500,
        showConfirmButton: false,
      }).then(() => {
        location.reload();
      });
    } else {
      Swal.fire("Erro", "Não foi possível criar a categoria.", "error");
    }
  } catch (error) {
    console.error("Erro ao adicionar categoria:", error);
  }
}

async function adicionarTipo() {
  const idCat = document.getElementById("selectCategoriaPai")?.value;
  const nome = document.getElementById("inputNovoTipo")?.value.trim();

  if (!idCat || !nome) {
    return Swal.fire({
      title: "Atenção",
      text: "Preencha o nome e selecione uma categoria.",
      icon: "warning",
      confirmButtonColor: "#0d6efd",
    });
  }

  try {
    const res = await fetch("/api/exames/tipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Enviamos apenas o que o controller espera
      body: JSON.stringify({ nome: nome, id_categoria: idCat }),
    });

    if (res.ok) {
      // TEXTO DE SUCESSO BONITO COMO PEDISTE
      Swal.fire({
        title: "Tipo de Exame Criado!",
        text: `O novo tipo "${nome}" foi adicionado à categoria selecionada com sucesso.`,
        icon: "success",
        confirmButtonColor: "#0d6efd",
        timer: 2500,
        showConfirmButton: false,
      }).then(() => {
        location.reload(); // Recarrega para atualizar as listas
      });
    } else {
      Swal.fire("Erro", "Não foi possível guardar o novo tipo.", "error");
    }
  } catch (error) {
    console.error("Erro ao enviar:", error);
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

//--- 7. PARTILHA E EMAIL ---

async function gerarLinkPartilha(id = null) {
  let ids = [];
  const checkboxes = document.querySelectorAll(".exame-checkbox:checked");

  // LOGICA INTELIGENTE:
  // Se houver exames selecionados com "visto", usamos esses (ignora o ID individual do botão)
  if (checkboxes.length > 0) {
    ids = Array.from(checkboxes).map((cb) => cb.value);
  }
  // Se não houver nada selecionado na checkbox, mas clicaste num individual (3 pontos)
  else if (id) {
    ids = [id];
  }

  if (ids.length === 0) {
    Swal.fire(
      "Atenção",
      "Selecione pelo menos um exame para partilhar.",
      "info",
    );
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
      const linkFinal = `${window.location.origin}/api/exames/visualizar-partilha/${dados.token}`;
      document.getElementById("inputLinkPartilha").value = linkFinal;

      // Se forem vários, podemos mudar o texto do modal para avisar
      const textoQuantidade =
        ids.length > 1 ? ` (${ids.length} exames selecionados)` : "";
      document.querySelector("#modalPartilha .modal-title").innerHTML =
        `<i class="bi bi-share text-primary me-2"></i>Partilhar Resultados${textoQuantidade}`;

      const modal = new bootstrap.Modal(
        document.getElementById("modalPartilha"),
      );
      modal.show();
      navigator.clipboard.writeText(linkFinal);
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

function enviarPorEmail() {
  const link = document.getElementById("inputLinkPartilha").value;
  const nomeUtilizador =
    localStorage.getItem("userName") || "Utilizador SaúdeDigital";
  const assunto = encodeURIComponent("Resultados de Exames - SaúdeDigital");
  const corpo = encodeURIComponent(
    `Olá,\n\nPartilho o link para os meus exames:\n${link}\n\nMelhores cumprimentos,\n${nomeUtilizador}`,
  );
  window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
}

function enviarPorWhatsApp() {
  // 1. Vai buscar o link que está no input do modal
  const link = document.getElementById("inputLinkPartilha").value;

  // 2. Vai buscar o nome do utilizador (mesma lógica do teu e-mail)
  const nomeUtilizador = localStorage.getItem("userName") || "Utilizador";

  // 3. Cria a mensagem formatada
  const textoMensagem = `Olá, aqui estão os meus resultados de exames do SaúdeDigital: ${link}\n\nMelhores cumprimentos, ${nomeUtilizador}`;

  // 4. Codifica o texto para URL (converte espaços e símbolos)
  const mensagemFinal = encodeURIComponent(textoMensagem);

  // 5. URL da API do WhatsApp (funciona em Telemóvel e PC)
  const whatsappUrl = `https://api.whatsapp.com/send?text=${mensagemFinal}`;

  // 6. Abre o WhatsApp numa nova aba
  window.open(whatsappUrl, "_blank");
}
//--- 8. EDIÇÃO E DETALHES ---

function abrirModalEditar(id, data, obs) {
  if (obterTotalSelecionados() > 1) return;
  document.getElementById("editExameId").value = id;
  document.getElementById("editDataExame").value = data
    ? data.split("T")[0]
    : "";
  document.getElementById("editObservacoes").value = obs || "";
  new bootstrap.Modal(document.getElementById("modalEditarExame")).show();
}

async function guardarEdicao() {
  const id = document.getElementById("editExameId").value;
  const data = document.getElementById("editDataExame").value;
  const obs = document.getElementById("editObservacoes").value;

  const res = await fetch(`/api/exames/editar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_exame: data, observacoes: obs }),
  });

  if (res.ok) {
    Swal.fire({
      title: "Alterações Guardadas!",
      text: "Os detalhes do exame foram atualizados corretamente.",
      icon: "success",
      confirmButtonColor: "#0d6efd",
      timer: 2000,
      showConfirmButton: false,
    }).then(() => {
      location.reload();
    });
  }
}

function verDetalhes(id, nome, data, obs, ficheiro) {
  const selecionados = document.querySelectorAll(".exame-checkbox:checked");

  // Se houver vários selecionados, ignora os argumentos individuais e mostra a lista
  if (selecionados.length > 1) {
    mostrarDetalhesMultiplos(); // Esta é a função que injeta o conteúdo dinâmico
    return;
  }

  // Caso contrário, mostra o layout normal de 1 único exame
  const modalCorpo = document.getElementById("corpoDetalhesDinamico");
  const tituloModal = document.getElementById("tituloModalDetalhes");

  tituloModal.textContent = "Detalhes do Exame";
  const dataF = data
    ? data.split("T")[0].split("-").reverse().join("/")
    : "---";

  modalCorpo.innerHTML = `
        <div id="layoutIndividual">
            <div class="mb-3">
                <label class="text-muted small d-block">Nome do Exame</label>
                <span class="fw-bold fs-5 text-dark">${nome}</span>
            </div>
            <div class="mb-3">
                <label class="text-muted small d-block">Data de Realização</label>
                <span class="text-dark">${dataF}</span>
            </div>
            <div class="mb-3 p-3 bg-light rounded-3">
                <label class="text-muted small d-block mb-1">Observações / Descrição</label>
                <p class="text-dark m-0" style="white-space: pre-wrap">${obs || "Sem observações."}</p>
            </div>
            <div class="mt-3">
                ${ficheiro ? `<a href="/uploads/${ficheiro}" target="_blank" class="btn btn-danger w-100 fw-bold"><i class="bi bi-file-earmark-pdf me-2"></i>Ver PDF</a>` : '<p class="text-muted text-center italic">Sem anexo.</p>'}
            </div>
        </div>
    `;

  new bootstrap.Modal(document.getElementById("modalDetalhesExame")).show();
}

//Função para mostrar múltiplos detalhes num único visualizador

function mostrarDetalhesMultiplos() {
  const checkboxes = document.querySelectorAll(".exame-checkbox:checked");
  const idsSeleccionados = Array.from(checkboxes).map((cb) =>
    parseInt(cb.value),
  );
  const listaExamesParaMostrar = examesParaTabela.filter((ex) =>
    idsSeleccionados.includes(ex.id),
  );

  // ID do novo contentor que criámos no HTML
  const modalCorpo = document.getElementById("corpoDetalhesDinamico");
  const tituloModal = document.getElementById("tituloModalDetalhes");

  tituloModal.textContent = `Visualizando ${listaExamesParaMostrar.length} Exames`;

  let conteudoHtml = "";
  listaExamesParaMostrar.forEach((ex) => {
    const dataF = ex.data
      ? ex.data.split("T")[0].split("-").reverse().join("/")
      : "---";
    conteudoHtml += `
            <div class="card mb-3 border-0 bg-light rounded-3">
                <div class="card-body">
                    <h6 class="fw-bold text-primary mb-1">${ex.nome}</h6>
                    <p class="small text-muted mb-2"><i class="bi bi-calendar3"></i> ${dataF}</p>
                    <p class="mb-2 small">${ex.observacoes || "Sem observações."}</p>
                    ${ex.resultado ? `<a href="/uploads/${ex.resultado}" target="_blank" class="btn btn-sm btn-danger py-1 px-3">Ver PDF</a>` : ""}
                </div>
            </div>`;
  });

  modalCorpo.innerHTML = conteudoHtml;
  new bootstrap.Modal(document.getElementById("modalDetalhesExame")).show();
}

function obterTotalSelecionados() {
  return document.querySelectorAll(".exame-checkbox:checked").length;
}
