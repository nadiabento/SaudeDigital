// Lógica de Logout
function logout() {
  localStorage.removeItem("userName");
  fetch("/api/auth/logout", { method: "POST" }).then(() => {
    window.location.href = "index.html";
  });
}

// Formatação de datas global
function formatarData(dataISO) {
  return new Date(dataISO).toLocaleDateString("pt-PT");
}

// Inicialização e UI Geral
document.addEventListener("DOMContentLoaded", () => {
  const nomeTitulo = document.getElementById("nomeUtilizadorLogado");
  const nomeGuardado = localStorage.getItem("userName");

  if (nomeTitulo && nomeGuardado) {
    nomeTitulo.textContent = `Olá, ${nomeGuardado}`;
  }

  const elNomeSidebar = document.getElementById("userName");
  const elAvatarSidebar = document.getElementById("userAvatar");

  if (nomeGuardado) {
    if (elNomeSidebar) {
      elNomeSidebar.textContent = nomeGuardado;
    }
    if (elAvatarSidebar) {
      const iniciaisUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeGuardado)}&background=0d6efd&color=fff&bold=true`;
      elAvatarSidebar.src = iniciaisUrl;
    }
  }

  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// --- LÓGICA DE LOGIN ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const messageDiv = document.getElementById("message");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      messageDiv.innerHTML = "";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.nome) localStorage.setItem("userName", data.nome);
          messageDiv.innerHTML = `<div class="alert alert-success d-flex align-items-center" role="alert"><i class="bi bi-check-circle-fill me-2"></i><div>Login efetuado com sucesso! A entrar...</div></div>`;
          setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
        } else {
          messageDiv.innerHTML = `<div class="alert alert-danger d-flex align-items-center" role="alert"><i class="bi bi-exclamation-triangle-fill me-2"></i><div>${data.erro}</div></div>`;
        }
      } catch (error) {
        messageDiv.innerHTML = `<div class="alert alert-danger d-flex align-items-center" role="alert"><i class="bi bi-wifi-off me-2"></i><div>Erro ao contactar o servidor. Verifique a sua ligação.</div></div>`;
      }
    });
  }
});

// --- LÓGICA DE REGISTO ---
document.addEventListener("DOMContentLoaded", () => {
  const registoForm = document.getElementById("registoForm");
  const msgDivRegisto = document.getElementById("mensagemRegisto");

  if (registoForm) {
    registoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("regNome").value;
      const data_nascimento = document.getElementById("regDataNasc").value;
      const grupo_sanguineo = document.getElementById("regGrupoSang").value;
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      msgDivRegisto.innerHTML = "";

      try {
        const response = await fetch("/api/auth/registo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, password, data_nascimento, grupo_sanguineo }),
        });

        const data = await response.json();

        if (response.ok) {
          msgDivRegisto.innerHTML = `<div class="alert alert-success d-flex align-items-center" role="alert"><i class="bi bi-check-circle-fill me-2"></i><div>${data.mensagem}</div></div>`;
          setTimeout(() => { window.location.href = "index.html"; }, 2000);
        } else {
          msgDivRegisto.innerHTML = `<div class="alert alert-danger d-flex align-items-center" role="alert"><i class="bi bi-exclamation-triangle-fill me-2"></i><div>${data.erro}</div></div>`;
        }
      } catch (error) {
        msgDivRegisto.innerHTML = `<div class="alert alert-danger" role="alert">Erro ao contactar o servidor.</div>`;
      }
    });
  }
});

// --- CARREGAR RESUMO DO DASHBOARD ---
async function carregarResumoDashboard() {
    const elementoConsulta = document.getElementById('resumoConsulta');
    const elementoMedicacao = document.getElementById('resumoMedicacao');
    const elementoEfeitos = document.getElementById('resumoEfeitos');

    if (!elementoConsulta) return;

    try {
        const response = await fetch('/api/dashboard/resumo');
        if (response.ok) {
            const dados = await response.json();
            elementoConsulta.textContent = dados.proximaConsulta || "Sem consultas agendadas";
            elementoMedicacao.textContent = `${dados.totalMedicamentos} Medicamentos`;
            elementoEfeitos.textContent = `${dados.totalEfeitos} Alertas`;
        }
    } catch (error) {
        console.error("Erro de ligação:", error);
    }
}

// --- CARREGAR TABELA DE MEDICAÇÃO NO DASHBOARD ---
async function carregarTabelaDashboard() {
    const tbody = document.getElementById('tabelaMedicacaoDashboard');
    if (!tbody) return;

    try {
        const response = await fetch('/api/medicacao');
        if (response.ok) {
            const dados = await response.json();
            const medicamentos = Array.isArray(dados) ? dados : (dados.medicamentos || []);
            
            tbody.innerHTML = ''; 
            const ativos = medicamentos.filter(m => m.estado === 'Ativo').slice(0, 3);

            if (ativos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum medicamento ativo neste momento.</td></tr>';
                return;
            }

            ativos.forEach(med => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${med.nome_medicamento || med.medicamento || med.nome || 'Desconhecido'}</strong></td>
                    <td>${med.dosagem || '-'}</td>
                    <td>${med.posologia || '-'}</td>
                    <td><span class="badge bg-success-subtle text-success px-3">Ativo</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Erro ao contactar o servidor.</td></tr>';
    }
}

// --- LÓGICA DO MODAL SINAIS VITAIS ---
document.addEventListener('DOMContentLoaded', () => {
    const selectTipo = document.getElementById('svTipo');
    const divValor2 = document.getElementById('divValor2');
    const labelValor1 = document.getElementById('labelValor1');
    const formSinal = document.getElementById('formSinalVital');

    if (selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            if (e.target.value === 'Pressao Arterial') {
                divValor2.style.display = 'block';
                labelValor1.textContent = 'VALOR SISTÓLICO (MÁXIMA)';
            } else {
                divValor2.style.display = 'none';
                labelValor1.textContent = 'VALOR';
                const inputSecundario = document.getElementById('svValor2');
                if(inputSecundario) inputSecundario.value = ''; 
            }
        });
    }

    if (formSinal) {
        formSinal.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data_registo = document.getElementById('svData').value;
            const tipo_metrica = document.getElementById('svTipo').value;
            const valor_primario = document.getElementById('svValor1').value;
            const valor_secundario = document.getElementById('svValor2').value || null;
            const msgDiv = document.getElementById('msgSinalVital');

            msgDiv.innerHTML = ''; 

            try {
                const response = await fetch('/api/dashboard/sinais-vitais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data_registo, tipo_metrica, valor_primario, valor_secundario })
                });

                if (response.ok) {
                    msgDiv.innerHTML = '<div class="alert alert-success d-flex align-items-center"><i class="bi bi-check-circle-fill me-2"></i>Registo guardado com sucesso!</div>';
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    msgDiv.innerHTML = '<div class="alert alert-danger">Erro ao guardar o registo.</div>';
                }
            } catch (error) {
                msgDiv.innerHTML = '<div class="alert alert-danger">Erro de ligação ao servidor.</div>';
            }
        });
    }
});

// ---------------------------------------------------------
// --- SECÇÃO DO GRÁFICO DOS 5 SINAIS VITAIS (CHART.JS) ---
// ---------------------------------------------------------
let chartVitals;

async function carregarGraficoVitals() {
    const canvas = document.getElementById('healthChart'); 
    if (!canvas) return;

    try {
        const response = await fetch('/api/dashboard/historico-vitals');
        if (!response.ok) throw new Error("Erro na API");
        let dados = await response.json();
        
        // 1. A SOLUÇÃO MÁGICA PARA O SAFARI: Trocar o espaço por um 'T'
        const parseData = (dataStr) => new Date(dataStr.replace(' ', 'T'));

        // 2. Ordenação Cronológica perfeita (agora o Safari já entende!)
        dados.sort((a, b) => parseData(a.data_registo) - parseData(b.data_registo));

        // 3. Criar a string completa com ANO e HORA (Vai aparecer no quadrado/tooltip!)
        const datasUnicas = [...new Set(dados.map(d => {
            return parseData(d.data_registo).toLocaleString('pt-PT', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
        }))];

        const mapFC = {}, mapGlic = {}, mapPASis = {}, mapPADias = {}, mapPeso = {}, mapColest = {};
        
        dados.forEach(d => {
            // A chave agora é a string completa: "21/05/2026, 16:41"
            const chave = parseData(d.data_registo).toLocaleString('pt-PT', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
            
            if (d.tipo_metrica === 'Frequencia Cardiaca') mapFC[chave] = d.valor_primario;
            if (d.tipo_metrica === 'Glicose') mapGlic[chave] = d.valor_primario;
            if (d.tipo_metrica === 'Peso') mapPeso[chave] = d.valor_primario;
            if (d.tipo_metrica === 'Colesterol') mapColest[chave] = d.valor_primario;
            if (d.tipo_metrica === 'Pressao Arterial') {
                mapPASis[chave] = d.valor_primario;
                mapPADias[chave] = d.valor_secundario;
            }
        });

        const dataFC = datasUnicas.map(chave => mapFC[chave] || null);
        const dataGlic = datasUnicas.map(chave => mapGlic[chave] || null);
        const dataPASis = datasUnicas.map(chave => mapPASis[chave] || null);
        const dataPADias = datasUnicas.map(chave => mapPADias[chave] || null);
        const dataPeso = datasUnicas.map(chave => mapPeso[chave] || null);
        const dataColest = datasUnicas.map(chave => mapColest[chave] || null);

        if (chartVitals) chartVitals.destroy();

        chartVitals = new Chart(canvas, {
            type: 'line',
            data: {
                labels: datasUnicas, // Aqui vai a string com ANO e HORA para o Tooltip ler
                datasets: [
                    { label: 'FC (bpm)', data: dataFC, borderColor: '#0d6efd', backgroundColor: '#0d6efd', spanGaps: true, tension: 0.3 },
                    { label: 'Glicose (mg/dL)', data: dataGlic, borderColor: '#dc3545', backgroundColor: '#dc3545', spanGaps: true, tension: 0.3, hidden: true },
                    { label: 'PA Sistólica', data: dataPASis, borderColor: '#198754', backgroundColor: '#198754', spanGaps: true, tension: 0.3, hidden: true },
                    { label: 'PA Diastólica', data: dataPADias, borderColor: '#20c997', backgroundColor: '#20c997', borderDash: [5, 5], spanGaps: true, tension: 0.3, hidden: true },
                    { label: 'Peso (kg)', data: dataPeso, borderColor: '#ffc107', backgroundColor: '#ffc107', spanGaps: true, tension: 0.3, hidden: true },
                    { label: 'Colesterol (mg/dL)', data: dataColest, borderColor: '#0dcaf0', backgroundColor: '#0dcaf0', spanGaps: true, tension: 0.3, hidden: true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    // --- O SEGREDO ESTÁ AQUI NO EIXO X ---
                    x: {
                        ticks: {
                            display: false // Isto desliga as datas debaixo do gráfico!
                        },
                        grid: {
                            display: false // (Opcional) Tira as linhas verticais de fundo para ficar ainda mais "Clean"
                        }
                    },
                    // ------------------------------------
                    y: { 
                        beginAtZero: false,
                        title: { display: true, text: 'Batimentos por Minuto (BPM)', color: '#0d6efd', font: { weight: 'bold' } },
                        suggestedMin: 40,   
                        suggestedMax: 160
                    } 
                }
            }
        });

        configurarBotoesGrafico();

    } catch (error) {
        console.error("Erro ao desenhar gráfico:", error);
    }
}

// --- CONTROLAR OS CLIQUES NOS 5 BOTÕES DO GRÁFICO ---
function configurarBotoesGrafico() {
    const btnFC = document.getElementById('btnFC');
    const btnGlicose = document.getElementById('btnGlicose');
    const btnPA = document.getElementById('btnPA');
    const btnPeso = document.getElementById('btnPeso');
    const btnColesterol = document.getElementById('btnColesterol');

    function alternarGrafico(tipo) {
        if (!chartVitals) return;

        chartVitals.setDatasetVisibility(0, tipo === 'FC');
        chartVitals.setDatasetVisibility(1, tipo === 'Glicose');
        chartVitals.setDatasetVisibility(2, tipo === 'PA');
        chartVitals.setDatasetVisibility(3, tipo === 'PA');
        chartVitals.setDatasetVisibility(4, tipo === 'Peso');
        chartVitals.setDatasetVisibility(5, tipo === 'Colesterol');

        const eixoY = chartVitals.options.scales.y;
        
        if (tipo === 'FC') {
            eixoY.title.text = 'Batimentos por Minuto (BPM)';
            eixoY.title.color = '#0d6efd';
            eixoY.suggestedMin = 40;
            eixoY.suggestedMax = 160;
        } else if (tipo === 'Glicose') {
            eixoY.title.text = 'Nível de Glicose (mg/dL)';
            eixoY.title.color = '#dc3545';
            eixoY.suggestedMin = 50;
            eixoY.suggestedMax = 200;
        } else if (tipo === 'PA') {
            eixoY.title.text = 'Pressão Arterial (mmHg)';
            eixoY.title.color = '#198754';
            eixoY.suggestedMin = 40;
            eixoY.suggestedMax = 180;
        } else if (tipo === 'Peso') {
            eixoY.title.text = 'Peso Corporal (kg)';
            eixoY.title.color = '#ffc107';
            eixoY.suggestedMin = 40;
            eixoY.suggestedMax = 120;
        } else if (tipo === 'Colesterol') {
            eixoY.title.text = 'Colesterol Total (mg/dL)';
            eixoY.title.color = '#0dcaf0';
            eixoY.suggestedMin = 100;
            eixoY.suggestedMax = 300;
        }

        chartVitals.update(); 

        if (btnFC) btnFC.className = tipo === 'FC' ? 'badge bg-primary text-white border border-primary p-2' : 'badge bg-primary-subtle text-primary border border-primary-subtle p-2';
        if (btnGlicose) btnGlicose.className = tipo === 'Glicose' ? 'badge bg-danger text-white border border-danger p-2' : 'badge bg-danger-subtle text-danger border border-danger-subtle p-2';
        if (btnPA) btnPA.className = tipo === 'PA' ? 'badge bg-success text-white border border-success p-2' : 'badge bg-success-subtle text-success border border-success-subtle p-2';
        if (btnPeso) btnPeso.className = tipo === 'Peso' ? 'badge bg-warning text-dark border border-warning p-2' : 'badge bg-warning-subtle text-warning border border-warning-subtle p-2';
        if (btnColesterol) btnColesterol.className = tipo === 'Colesterol' ? 'badge bg-info text-dark border border-info p-2' : 'badge bg-info-subtle text-info border border-info-subtle p-2';
    }

    if (btnFC) btnFC.addEventListener('click', () => alternarGrafico('FC'));
    if (btnGlicose) btnGlicose.addEventListener('click', () => alternarGrafico('Glicose'));
    if (btnPA) btnPA.addEventListener('click', () => alternarGrafico('PA'));
    if (btnPeso) btnPeso.addEventListener('click', () => alternarGrafico('Peso'));
    if (btnColesterol) btnColesterol.addEventListener('click', () => alternarGrafico('Colesterol'));
}

// --- EXECUÇÃO INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    carregarResumoDashboard();
    carregarTabelaDashboard(); 
    carregarGraficoVitals(); 
});