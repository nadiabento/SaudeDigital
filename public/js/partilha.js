async function carregarDados() {
  const path = globalThis.location.pathname.replace(/\/$/, "");
  const token = path.split("/").pop();
  const container = document.getElementById("listaExames");

  try {
    const response = await fetch(`/api/api/exames/dados-partilha/${token}`);

    // SE O LINK EXPIROU OU NÃO EXISTE: Redireciona imediatamente para o 404
    if (!response.ok) {
      globalThis.location.href = "/404.html";
      return;
    }

    const exames = await response.json();

    if (exames.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted">Nenhum exame encontrado.</p>';
      return;
    }

    container.innerHTML = exames
      .map((ex) => {
        // Tratamento seguro da data
        const campoData = ex.data_exame || ex.data;
        let dataFinalFormatada = "Data não disponível";

        if (campoData) {
          const dataConvertida = new Date(campoData);
          if (!Number.isNaN(dataConvertida.getTime())) {
            dataFinalFormatada = dataConvertida.toLocaleDateString("pt-PT");
          }
        }

        return `
          <div class="exame-card p-3 mb-3 border rounded shadow-sm bg-white">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 w-100">
                  <div>
                      <h5 class="fw-bold mb-2 text-dark">${ex.nome}</h5>
                      <span class="data-badge bg-light p-1 px-2 rounded text-muted small">
                          <i class="bi bi-calendar3 me-1"></i> ${dataFinalFormatada}
                      </span>
                  </div>
                  
                  <div class="d-flex gap-2">
                      ${
                        ex.resultado
                          ? `
                          <button class="btn btn-sm btn-primary shadow-sm fw-semibold" onclick="verPDF('${ex.resultado}', '${ex.nome}')">
                              <i class="bi bi-file-earmark-pdf-fill me-1"></i>Ver Exame
                          </button>
                      `
                          : '<span class="text-muted small align-self-center">Sem ficheiro</span>'
                      }

                      ${
                        ex.relatorio
                          ? `
                          <button class="btn btn-sm btn-danger shadow-sm fw-semibold" style="background-color: #dc3545 !important; border-color: #dc3545 !important;" onclick="verPDF('${ex.relatorio}', 'Relatório - ${ex.nome}')">
                              <i class="bi bi-file-pdf-fill me-1"></i>Ver Relatório
                          </button>
                      `
                          : '<span class="text-muted small align-self-center">Sem relatório</span>'
                      }
                  </div>
              </div>

              ${
                ex.observacoes
                  ? `
                  <div class="mt-3 pt-3 border-top">
                      <p class="mb-0 text-muted" style="font-size: 0.9rem;">
                          <strong class="text-secondary"><i class="bi bi-chat-left-text me-1"></i> Observações:</strong><br>
                          ${ex.observacoes}
                      </p>
                  </div>
              `
                  : ""
              }
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    // ⚠️ Proteção extra: se falhar a ligação, envia para a página de erro
    globalThis.location.href = "/404.html";
  }
}

function verPDF(file, nome) {
  const frame = document.getElementById("framePDF");
  frame.src = `/uploads/${file}`;
  document.getElementById("tituloExame").innerText = nome;
  const myModal = new bootstrap.Modal(document.getElementById("modalPDF"));
  myModal.show();
}

function verPDF(file, nome) {
  const frame = document.getElementById("framePDF");
  frame.src = `/uploads/${file}`;
  document.getElementById("tituloExame").innerText = nome;
  const myModal = new bootstrap.Modal(document.getElementById("modalPDF"));
  myModal.show();
}

// Inicializa a função ao carregar o ficheiro
carregarDados();
