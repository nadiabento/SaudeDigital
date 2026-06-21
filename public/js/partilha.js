async function carregarDados() {
  const path = globalThis.location.pathname.replace(/\/$/, "");
  const token = path.split("/").pop();
  const container = document.getElementById("listaExames");

  if (!container) return;

  try {
    const response = await fetch(`/api/exames/dados-partilha/${token}`);

    // Se o token falhar, expirar (410) ou não existir (404), redireciona imediatamente
    if (!response.ok || response.status === 404 || response.status === 410) {
      globalThis.location.href = "/404.html";
      return;
    }

    const exames = await response.json();

    if (exames.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted py-4">Nenhum registo clínico partilhado neste link.</p>';
      return;
    }

    container.innerHTML = exames
      .map((ex) => {
        const campoData = ex.data_exame || ex.data;
        let dataFinalFormatada = "Data não disponível";

        if (campoData) {
          const dataConvertida = new Date(campoData);
          if (!Number.isNaN(dataConvertida.getTime())) {
            dataFinalFormatada = dataConvertida.toLocaleDateString("pt-PT");
          }
        }

        return `
          <div class="exame-card p-4 mb-3 border rounded shadow-sm bg-white">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 w-100">
                  <div>
                      <h5 class="fw-bold mb-2 text-dark">${ex.nome}</h5>
                      <span class="data-badge">
                          <i class="bi bi-calendar3 me-1"></i> ${dataFinalFormatada}
                      </span>
                  </div>
                  
                  <div class="d-flex gap-2 flex-wrap">
                      ${
                        ex.resultado
                          ? `<a href="${ex.resultado}" target="_blank" class="btn btn-sm btn-primary shadow-sm fw-semibold px-3 py-2">
                                <i class="bi bi-file-earmark-pdf-fill me-1"></i>Ver Exame
                              </a>`
                          : '<span class="text-muted small align-self-center">Sem ficheiro anexo</span>'
                      }

                      ${
                        ex.relatorio
                          ? `<a href="${ex.relatorio}" target="_blank" class="btn btn-sm btn-danger shadow-sm fw-semibold px-3 py-2" style="background-color: #dc3545 !important; border-color: #dc3545 !important;">
                              <i class="bi bi-file-pdf-fill me-1"></i>Ver Relatório
                            </a>`
                          : '<span class="text-muted small align-self-center">Sem relatório médico</span>'
                      }
                  </div>
              </div>

              ${
                ex.observacoes
                  ? `
                  <div class="mt-3 pt-3 border-top">
                      <p class="mb-0 text-muted" style="font-size: 0.95rem;">
                          <strong class="text-secondary"><i class="bi bi-chat-left-text me-1"></i> Observações do Paciente:</strong><br>
                          ${ex.observacoes}
                      </p>
                  </div>`
                  : ""
              }
          </div>`;
      })
      .join("");
  } catch (err) {
    console.error("Erro fatal na Fetch API de interoperabilidade:", err);
    globalThis.location.href = "/404.html";
  }
}

function verPDF(file, nome) {
  const frame = document.getElementById("framePDF");
  const titulo = document.getElementById("tituloExame");
  const modalEl = document.getElementById("modalPDF");

  if (frame && titulo && modalEl) {
    frame.src = file;
    titulo.innerText = nome;
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();
  } else {
    console.warn("Elementos do modal PDF não foram encontrados no DOM.");
  }
}

// Inicializa a função ao carregar o ficheiro
carregarDados();
