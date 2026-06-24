/** * --- VARIÁVEIS GLOBAIS ---
 * Mantêm o estado da aplicação no lado do cliente.
 */
let categoriasGlobais = [];
let tiposGlobais = [];
let examesParaTabela = [];
let direcaoOrdenacao = { exame: 1, data: 1 };
let paginaAtual = 1;
let totalPaginasGlobal = 1;
const examesPorPagina = 10;

const itensSelecionados = new Set();

// --- CONFIGURAÇÃO INICIAL ---
// --- CONFIGURAÇÃO INICIAL ---
window.onload = () => {
  carregarUtilizadorLogado();
  carregarCategorias();
  carregarHistorico();
  configurarEventosInterface();

  // Bloqueia datas futures nos calendários (Integridade de dados)
  const hojeFormatado = new Date().toISOString().split("T")[0];
  ["dataExame", "editDataExame"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("max", hojeFormatado);
  });
};

// --- BUSCA O UTILIZADOR AUTENTICADO E ATUALIZA A SIDEBAR ---
async function carregarUtilizadorLogado() {
  try {
    // Faz a chamada à rota que devolve a sessão do utilizador logado no server.js
    const response = await fetch("/api/usuario-logado");

    if (!response.ok) throw new Error("Sessão não encontrada");

    const dados = await response.json();

    if (dados && dados.nome) {
      // 1. Atualiza o HTML da sidebar textualmente
      const elUserName = document.getElementById("userName");
      if (elUserName) elUserName.innerText = dados.nome;

      // 2. Guarda no localStorage para sincronizar com os botões de Email e WhatsApp
      localStorage.setItem("userName", dados.nome);
    } else {
      falhaAoCarregarNome();
    }
  } catch (error) {
    console.error("Erro ao carregar sessão do utilizador:", error);
    falhaAoCarregarNome();
  }
}

function falhaAoCarregarNome() {
  const elUserName = document.getElementById("userName");
  if (elUserName) elUserName.innerText = "Utilizador";
  localStorage.setItem("userName", "Utilizador");
}

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
    if (!response.ok) throw new Error("Erro na rede");

    const data = await response.json();

    // Extração segura dos dados paginados estruturados pelo Sequelize
    examesParaTabela = data.exames;
    paginaAtual = data.paginaAtual;
    totalPaginasGlobal = data.totalPaginas; // 👈 CORREÇÃO: Salva o total real de páginas da API

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

      document.getElementById("idTipoSelecionado").value = "";
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

  if (!examesParaTabela || examesParaTabela.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum exame registado no histórico.</td></tr>`;
    renderizarControlosPaginacao(0);
    return;
  }

  examesParaTabela.forEach((exame) => {
    // --- TRATAMENTO SEGURO DA DATA (Totalmente Corrigido) ---
    let dataF = "---";
    if (exame.data) {
      try {
        const dataStr =
          typeof exame.data === "string"
            ? exame.data
            : new Date(exame.data).toISOString();
        const partes = dataStr.split("T")[0].split("-");
        if (partes.length === 3) {
          dataF = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
      } catch (e) {
        dataF = exame.data;
      }
    }

    // --- CORRIGIDO: de 'examen' para 'exame' ---
    const obsLimpa = exame.observacoes
      ? exame.observacoes
          .replaceAll("'", String.raw`\'`)
          .replaceAll('"', "&quot;")
      : "";

    tbody.innerHTML += `
        <tr>
            <td>
                <input type="checkbox" class="form-check-input exame-checkbox" value="${exame.id}" onchange="verificarSelecao()">
            </td>
            <td><strong>${exame.nome || "Exame Indefinido"}</strong></td>
            <td style="white-space: nowrap;">${dataF}</td>
            
           <td>
              ${
                exame.resultado
                  ? `<a href="${exame.resultado}" target="_blank" class="btn btn-sm btn-primary ...">
                        <i class="bi bi-file-earmark-pdf"></i> Ver Exame
                    </a>`
                  : '<span class="text-muted small">Sem ficheiro</span>'
              }
          </td>

          <td>
              ${
                exame.relatorio
                  ? `<a href="${exame.relatorio}" target="_blank" class="btn btn-sm btn-danger text-white fw-bold border-0 py-1 px-2 small" style="background-color: #dc3545 !important;">
                      <i class="bi bi-file-pdf"></i> PDF Relatório
                    </a>`
                  : '<span class="text-muted small">Sem relatório</span>'
              }
          </td>

            <td class="text-end">
                <div class="dropdown">
                    <button class="btn btn-light btn-sm border" type="button" data-bs-toggle="dropdown" data-bs-boundary="window">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                        <li><a class="dropdown-item btn-acao-individual" href="javascript:void(0)" onclick="verDetalhes(${exame.id}, '${(exame.nome || "").replaceAll("'", String.raw`\'`)}', '${exame.data}', '${obsLimpa}', '${exame.relatorio || ""}')"><i class="bi bi-eye me-2"></i> Ver Detalhes</a></li>
                        <li><a class="dropdown-item btn-acao-individual" href="javascript:void(0)" onclick="abrirModalEditar(${exame.id}, '${exame.data}', '${obsLimpa}')"><i class="bi bi-pencil me-2"></i> Editar</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="gerarLinkPartilha(${exame.id})"><i class="bi bi-share me-2"></i> Partilhar</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="eliminarUm(${exame.id})"><i class="bi bi-trash me-2"></i> Eliminar</a></li>
                    </ul>
                </div>
            </td>
        </tr>`;
  });

  renderizarControlosPaginacao(totalPaginas);
  verificarSelecao();
}

function renderizarControlosPaginacao(totalPaginas) {
  const container = document.getElementById("paginacaoContainer");
  if (!container) return;

  if (totalPaginas <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<nav><ul class="pagination pagination-sm m-0">`;

  // Botão Anterior
  html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
            <a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${paginaAtual - 1})">Anterior</a>
          </li>`;

  // Gerar botões numéricos
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
  if (num < 1 || num > totalPaginasGlobal) return;
  paginaAtual = num;
  carregarHistorico(num);
}

function filtrarTabela() {
  const termo = document
    .getElementById("inputSearch")
    .value.toLowerCase()
    .trim();
  const linhas = document.querySelectorAll("#tabelaExames tr");

  linhas.forEach((linha) => {
    // Procura a segunda coluna (onde está o nome do exame dentro do <strong>)
    const colunaNome = linha.querySelector("td:nth-child(2)");

    if (colunaNome) {
      const nomeExame = colunaNome.innerText.toLowerCase();

      // Compara apenas o termo com o nome do exame real
      if (nomeExame.includes(termo)) {
        linha.style.display = "";
      } else {
        linha.style.display = "none";
      }
    }
  });
}

//--- 3. SELEÇÃO E AÇÕES EM MASSA ---

function toggleTodos(master) {
  document.querySelectorAll(".exame-checkbox").forEach((cb) => {
    cb.checked = master.checked;
    const id = Number.parseInt(cb.value, 10);
    master.checked ? itensSelecionados.add(id) : itensSelecionados.delete(id);
  });
  verificarSelecao();
}

function verificarSelecao() {
  const checkboxes = document.querySelectorAll(".exame-checkbox");
  let marcados = 0;

  checkboxes.forEach((cb) => {
    const id = Number.parseInt(cb.value, 10);
    if (cb.checked) {
      itensSelecionados.add(id);
      marcados++;
    } else {
      itensSelecionados.delete(id);
    }
  });

  const checkAll = document.getElementById("checkAll");
  if (checkAll)
    checkAll.checked = marcados === checkboxes.length && checkboxes.length > 0;

  const barraAcoes = document.getElementById("acoesMassa");
  if (barraAcoes) {
    if (itensSelecionados.size > 0) {
      barraAcoes.classList.remove("d-none");
      barraAcoes.style.display = "flex";
    } else {
      barraAcoes.classList.add("d-none");
      barraAcoes.style.display = "none";
    }
  }
}

//--- 4. ELIMINAÇÃO EM MASSA INTERLIGADA ---

async function eliminarUm(id) {
  Swal.fire({
    title: "Tem a certeza?",
    text: "Este exame será removido permanentemente do seu histórico clínico!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await executarEliminacao([id]);
        Swal.fire({
          title: "Eliminado com Sucesso!",
          text: "O registo do exame e o respetivo ficheiro PDF foram removidos do sistema.",
          icon: "success",
          showConfirmButton: false,
          timer: 2000,
        });
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        Swal.fire({
          title: "Erro!",
          text: "Não foi possível eliminar o exame devido a restrições de segurança.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}

async function eliminarSelecionados() {
  const idsParaEliminar = Array.from(itensSelecionados);
  if (idsParaEliminar.length === 0) return;

  Swal.fire({
    title: `Deseja eliminar ${idsParaEliminar.length} exames?`,
    text: "Esta ação é irreversível e expurgará os relatórios associados!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) executarEliminacao(idsParaEliminar);
  });
}

async function executarEliminacao(ids) {
  try {
    const res = await fetch("/api/exames/eliminar-massa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const apiErro = await res.json();
      throw new Error(
        apiErro.error || "Falha ao processar pedido no servidor.",
      );
    }

    itensSelecionados.clear();
    const checkMaster = document.getElementById("checkAll");
    if (checkMaster) checkMaster.checked = false;

    Swal.fire(
      "Eliminado!",
      "Os registos foram permanentemente removidos.",
      "success",
    );
    carregarHistorico(paginaAtual);
  } catch (error) {
    Swal.fire("Erro Crítico", error.message, "error");
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
          c.nome.toLowerCase().includes(termo),
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
          t.nome.toLowerCase().includes(termo),
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

  // --- DENTRO DE configurarEventosInterface() ---
  // --- Dentro de configurarEventosInterface() ---
  const form = document.getElementById("formExame");
  if (form) {
    form.removeAttribute("action");
    form.removeAttribute("method");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const dataExame = document.getElementById("dataExame").value;
      const idTipoExame = document.getElementById("idTipoSelecionado").value;

      if (!idTipoExame || idTipoExame.trim() === "") {
        return Swal.fire({
          title: "Atenção",
          text: "Por favor, selecione um tipo de exame válido a partir das sugestões do catálogo.",
          icon: "warning",
          confirmButtonColor: "#3b5afa",
        });
      }

      // Cria o FormData dinâmico a partir do formulário
      const formData = new FormData(form);

      // Sincroniza e garante os nomes exatos esperados pelo req.body do backend
      formData.set("data_exame", dataExame);
      formData.set("observacoes", document.getElementById("observacoes").value);
      formData.set("id_tipo_exame", idTipoExame);
      formData.set("local_realizacao", "SaúdeDigital Clinic");

      Swal.fire({
        title: "A guardar registo...",
        text: "A processar metadados e anexos PDF.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const res = await fetch("/api/exames/registar", {
          method: "POST",
          body: formData, // O FormData define automaticamente o Content-Type como multipart/form-data
        });

        const contentType = res.headers.get("content-type");
        let dados = {};

        if (contentType?.includes("application/json")) {
          dados = await res.json();
        } else {
          const textoErro = await res.text();
          console.error("Erro bruto do servidor (HTML):", textoErro);
          throw new Error("O servidor clínico sofreu um erro interno.");
        }

        if (res.ok) {
          Swal.fire({
            title: "Exame Registado!",
            text: "Os dados e os ficheiros anexados foram consolidados com sucesso.",
            icon: "success",
            confirmButtonColor: "#3b5afa",
          }).then(() => {
            location.reload();
          });
        } else {
          Swal.fire({
            title: "Erro ao registar",
            text: dados.error || "Erro na inserção do registo.",
            icon: "error",
            confirmButtonColor: "#dc3545",
          });
        }
      } catch (error) {
        console.error("Erro na submissão:", error);
        Swal.fire({
          title: "Erro de Conexão",
          text: error.message || "Falha ao comunicar com o servidor clínico.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    });
  }
}

//--- 6. MODAIS E PARÂMETROS GLOBAIS ---

async function adicionarClasse() {
  const nome = document.getElementById("inputNovaClasse")?.value.trim();
  if (!nome) {
    return Swal.fire({
      title: "Campo Vazio",
      text: "Por favor, insira o nome da nova categoria.",
      icon: "info",
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
        text: `A categoria "${nome}" foi adicionada com sucesso.`,
        icon: "success",
        confirmButtonColor: "#0d6efd",
        allowOutsideClick: false,
      }).then(() => {
        location.reload();
      });
    } else {
      Swal.fire("Erro", "Não foi possível criar a categoria.", "error");
    }
  } catch (error) {
    console.error(error);
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
    });
  }

  try {
    const res = await fetch("/api/exames/tipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome, id_categoria: idCat }),
    });

    if (res.ok) {
      Swal.fire({
        title: "Tipo de Exame Criado!",
        text: `O novo tipo "${nome}" foi adicionado com sucesso.`,
        icon: "success",
        confirmButtonColor: "#0d6efd",
        allowOutsideClick: false,
      }).then(() => {
        location.reload();
      });
    } else {
      Swal.fire("Erro", "Não foi possível guardar o novo tipo.", "error");
    }
  } catch (error) {
    console.error(error);
  }
}

function ordenarTabela(coluna) {
  const fator = direcaoOrdenacao[coluna];

  examesParaTabela.sort((a, b) => {
    if (coluna === "exame") {
      let valA = (a.nome || "").toLowerCase();
      let valB = (b.nome || "").toLowerCase();
      return (valA < valB ? -1 : 1) * fator;
    } else {
      // CORREÇÃO: Usar .getTime() garante que o JS compara os milissegundos das datas corretamente
      let valA = new Date(a.data || a.data_exame).getTime();
      let valB = new Date(b.data || b.data_exame).getTime();
      return (valA - valB) * fator; // Sintaxe muito mais limpa e infalível para números/datas
    }
  });

  direcaoOrdenacao[coluna] *= -1;

  // Garante que se o totalPaginasGlobal for undefined por algum motivo, passa pelo menos 1
  renderizarTabela(totalPaginasGlobal || 1);
}

//--- 7. PARTILHA EXTERNA ---

async function lidarComCopiaDoModal(btn) {
  const input = document.getElementById("inputLinkGerado");
  if (!input) return;

  try {
    await navigator.clipboard.writeText(input.value);

    btn.innerHTML = '<i class="bi bi-check-lg"></i> Copiado!';
    btn.className = "btn btn-success";

    setTimeout(() => {
      btn.innerText = "Copiar";
      btn.className = "btn btn-primary";
    }, 2000);
  } catch (err) {
    console.error("Erro ao copiar:", err);
  }
}

async function gerarLinkPartilha() {
  const checkboxes = document.querySelectorAll(
    '#tabelaExames input[type="checkbox"]:checked',
  );

  if (checkboxes.length === 0) {
    Swal.fire({
      title: "Nenhum exame selecionado",
      text: "Por favor, selecione pelo menos um exame na tabela para gerar um link de partilha.",
      icon: "warning",
      confirmButtonColor: "#3b5afa",
    });
    return;
  }

  const examesIds = Array.from(checkboxes).map((cb) => cb.value);

  const { value: horasExpiracao } = await Swal.fire({
    title: "Validade do Link",
    text: "Durante quantas horas o médico poderá visualizar estes exames?",
    input: "select",
    inputOptions: new Map([
      ["0.08333", "5 Minutos"],
      ["1", "1 Hora"],
      ["2", "2 Horas"],
      ["24", "24 Horas"],
      ["48", "48 Horas"],
      ["168", "1 Semana"],
    ]),
    inputValue: "0.08333",
    showCancelButton: true,
    confirmButtonText: "Gerar Link Seguro",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#3b5afa",
    inputValidator: (value) => {
      if (!value) return "Precisa de escolher uma validade!";
    },
  });

  if (!horasExpiracao) return;

  Swal.fire({
    title: "A criar portal seguro...",
    text: "A encriptar chaves de acesso clínico.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await fetch("/api/exames/gerar-partilha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examesIds: examesIds,
        horasValidade: Number.parseInt(horasExpiracao, 10),
      }),
    });

    const dados = await response.json();
    if (!response.ok)
      throw new Error(dados.error || "Erro desconhecido ao gerar link.");

    const urlCompleta = `${globalThis.location.origin}/api/exames/visualizar-partilha/${dados.token}`;

    Swal.fire({
      title: "Portal Médico Gerado!",
      html: `
        <p class="text-muted small">Partilhe o link abaixo com o seu profissional de saúde:</p>
        <div class="input-group mb-3">
          <input type="text" id="inputLinkGerado" class="form-control text-center bg-light fw-bold" value="${urlCompleta}" readonly>
          <button class="btn btn-primary" type="button" id="btnCopiarModal">Copiar</button>
        </div>
        <p class="text-danger small mb-3"><i class="bi bi-clock-history"></i> Este link expira automaticamente em ${horasExpiracao} hora(s).</p>
        <hr class="my-3 text-muted opacity-25">
        <div class="d-grid gap-2">
          <a href="mailto:?subject=${encodeURIComponent("Resultados de Exames - SaúdeDigital")}&body=${encodeURIComponent("Olá,\n\nPartilho o link seguro para os meus exames clínicos:\n" + urlCompleta + "\n\nMelhores cumprimentos.")}" class="btn btn-outline-primary py-2 fw-bold text-start px-4">
            <i class="bi bi-envelope-at me-2"></i> Enviar por Email
          </a>
          <a href="https://api.whatsapp.com/send?text=${encodeURIComponent("Olá, aqui está o link seguro para os meus resultados de exames do SaúdeDigital: " + urlCompleta)}" target="_blank" class="btn btn-outline-success py-2 fw-bold text-start px-4" style="color: #198754; border-color: #198754;">
            <i class="bi bi-whatsapp me-2"></i> Enviar por WhatsApp
          </a>
        </div>`,
      icon: "success",
      confirmButtonColor: "#3b5afa",
      confirmButtonText: "Concluído",
      didOpen: () => {
        const btnCopiar = document.getElementById("btnCopiarModal");
        // 👇 Chamada direta para a função isolada, quebrando o aninhamento profundo!
        if (btnCopiar) {
          btnCopiar.addEventListener("click", () =>
            lidarComCopiaDoModal(btnCopiar),
          );
        }
      },
    });
  } catch (error) {
    console.error("Erro na partilha:", error);
    Swal.fire({
      title: "Falha na Partilha",
      text: error.message || "Não foi possível conectar ao servidor clínico.",
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
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
  globalThis.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
}

function enviarPorWhatsApp() {
  const link = document.getElementById("inputLinkPartilha").value;
  const nomeUtilizador = localStorage.getItem("userName") || "Utilizador";
  const textoMensagem = `Olá, aqui estão os meus resultados de exames do SaúdeDigital: ${link}\n\nMelhores cumprimentos, ${nomeUtilizador}`;
  window.open(
    `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMensagem)}`,
    "_blank",
  );
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
      timer: 2000,
      showConfirmButton: false,
    }).then(() => {
      location.reload();
    });
  }
}

function verDetalhes(id, nome, data, obs, ficheiro) {
  const selecionados = document.querySelectorAll(".exame-checkbox:checked");

  if (selecionados.length > 1) {
    mostrarDetalhesMultiplos();
    return;
  }

  const modalCorpo = document.getElementById("corpoDetalhesDinamico");
  const tituloModal = document.getElementById("tituloModalDetalhes");

  tituloModal.textContent = "Detalhes do Exame";

  let dataF = "---";
  if (data) {
    const partes = data.split("T")[0].split("-");
    dataF =
      partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
  }

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
        </div>`;

  new bootstrap.Modal(document.getElementById("modalDetalhesExame")).show();
}

function mostrarDetalhesMultiplos() {
  const checkboxes = document.querySelectorAll(".exame-checkbox:checked");
  const idsSeleccionados = new Set(
    Array.from(checkboxes).map((cb) => Number.parseInt(cb.value)),
  );
  const listaExamesParaMostrar = examesParaTabela.filter((ex) =>
    idsSeleccionados.has(ex.id),
  );

  const modalCorpo = document.getElementById("corpoDetalhesDinamico");
  const tituloModal = document.getElementById("tituloModalDetalhes");

  tituloModal.textContent = `Visualizando ${listaExamesParaMostrar.length} Exames`;

  let conteudoHtml = "";
  listaExamesParaMostrar.forEach((ex) => {
    let dataF = "---";
    if (ex.data) {
      const partes = ex.data.split("T")[0].split("-");
      dataF =
        partes.length === 3
          ? `${partes[2]}/${partes[1]}/${partes[0]}`
          : ex.data;
    }
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
