async function carregarDados() {
  const path = globalThis.location.pathname.replace(/\/$/, "");
  const token = path.split("/").pop();
  const container = document.getElementById("listaExames");

  try {
    const response = await fetch(`/api/exames/dados-partilha/${token}`);
    if (!response.ok) throw new Error("Falha na resposta do servidor");

    const exames = await response.json();

    if (exames.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted">Nenhum exame encontrado.</p>';
      return;
    }

    container.innerHTML = exames
      .map((ex) => {
        // 👈 CORREÇÃO DO INVALID DATE:
        // Tenta obter o campo (data_exame ou data) vindo do teu pool do MySQL
        const campoData = ex.data_exame || ex.data;
        let dataFinalFormatada = "Data não disponível";

        if (campoData) {
          const dataConvertida = new Date(campoData);
          // Valida se a conversão do objeto Date foi bem sucedida
          if (!Number.isNaN(dataConvertida.getTime())) {
            dataFinalFormatada = dataConvertida.toLocaleDateString("pt-PT");
          }
        }

        return `
                <div class="exame-card">
                    <div class="d-flex justify-content-between align-items-start w-100">
                        <div>
                            <h5 class="fw-bold mb-2 text-dark">${ex.nome}</h5>
                            <span class="data-badge">
                                <i class="bi bi-calendar3 me-1"></i> ${dataFinalFormatada}
                            </span>
                        </div>
                        <button class="btn-visualizar shadow-sm" onclick="verPDF('${ex.resultado}', '${ex.nome}')">
                            <i class="bi bi-file-earmark-pdf-fill me-2"></i>Ver PDF
                        </button>
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
    container.innerHTML =
      '<p class="text-center text-danger">Erro ao carregar os exames. Verifique a validade do link.</p>';
  }
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
