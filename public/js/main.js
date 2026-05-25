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
    if (elNomeSidebar) elNomeSidebar.textContent = nomeGuardado;
    if (elAvatarSidebar) {
      elAvatarSidebar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeGuardado)}&background=0d6efd&color=fff&bold=true`;
    }
  }

  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(t => new bootstrap.Tooltip(t));
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
          messageDiv.innerHTML = `<div class="alert alert-success">Login efetuado!</div>`;
          setTimeout(() => window.location.href = "dashboard.html", 1000);
        } else {
          messageDiv.innerHTML = `<div class="alert alert-danger">${data.erro}</div>`;
        }
      } catch (error) {
        messageDiv.innerHTML = `<div class="alert alert-danger">Erro de ligação.</div>`;
      }
    });
  }
});

// --- CARREGAR RESUMO E TABELAS DO DASHBOARD ---
async function carregarResumoDashboard() {
    const elementoConsulta = document.getElementById('resumoConsulta');
    if (!elementoConsulta) return;

    try {
        const response = await fetch('/api/dashboard/resumo');
        if (response.ok) {
            const dados = await response.json();
            document.getElementById('resumoConsulta').textContent = dados.proximaConsulta || "Sem consultas";
            document.getElementById('resumoMedicacao').textContent = `${dados.totalMedicamentos} Medicamentos`;
            document.getElementById('resumoEfeitos').textContent = `${dados.totalEfeitos} Alertas`;
        }
    } catch (error) { console.error("Erro resumo:", error); }
}

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
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum ativo.</td></tr>';
                return;
            }

            ativos.forEach(med => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>${med.nome_medicamento || med.nome}</strong></td><td>${med.dosagem}</td><td>${med.posologia}</td><td><span class="badge bg-success-subtle text-success">Ativo</span></td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Erro tabela:", error); }
}

// ---------------------------------------------------------
// --- GRÁFICO E CRUD SINAIS VITAIS ---
// ---------------------------------------------------------
let chartVitals;

async function carregarGraficoVitals() {
    const canvas = document.getElementById('healthChart'); 
    if (!canvas) return;

    try {
        const response = await fetch('/api/dashboard/historico-vitals');
        if (!response.ok) throw new Error("Erro na API");
        let dados = await response.json();
        
        const parseData = (dataStr) => new Date(dataStr.replace(' ', 'T'));
        dados.sort((a, b) => parseData(a.data_registo) - parseData(b.data_registo));

        const datasUnicas = [...new Set(dados.map(d => parseData(d.data_registo).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })))];

        const mapFC = {}, mapGlic = {}, mapPASis = {}, mapPADias = {}, mapPeso = {}, mapColest = {};
        
        dados.forEach(d => {
            const chave = parseData(d.data_registo).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            if (d.tipo_metrica === 'Frequencia Cardiaca') mapFC[chave] = d.valor_primario;
            else if (d.tipo_metrica === 'Glicose') mapGlic[chave] = d.valor_primario;
            else if (d.tipo_metrica === 'Peso') mapPeso[chave] = d.valor_primario;
            else if (d.tipo_metrica === 'Colesterol') mapColest[chave] = d.valor_primario;
            else if (d.tipo_metrica === 'Pressao Arterial') {
                mapPASis[chave] = d.valor_primario;
                mapPADias[chave] = d.valor_secundario;
            }
        });

        if (chartVitals) chartVitals.destroy();

        chartVitals = new Chart(canvas, {
            type: 'line',
            data: {
                labels: datasUnicas,
                datasets: [
                    { label: 'FC (bpm)', data: datasUnicas.map(c => mapFC[c] || null), borderColor: '#0d6efd', hidden: false, tension: 0.3, spanGaps: true },
                    { label: 'Glicose (mg/dL)', data: datasUnicas.map(c => mapGlic[c] || null), borderColor: '#dc3545', hidden: true, tension: 0.3, spanGaps: true },
                    { label: 'PA Sistólica', data: datasUnicas.map(c => mapPASis[c] || null), borderColor: '#198754', hidden: true, tension: 0.3, spanGaps: true },
                    { label: 'PA Diastólica', data: datasUnicas.map(c => mapPADias[c] || null), borderColor: '#20c997', borderDash: [5, 5], hidden: true, tension: 0.3, spanGaps: true },
                    { label: 'Peso (kg)', data: datasUnicas.map(c => mapPeso[c] || null), borderColor: '#ffc107', hidden: true, tension: 0.3, spanGaps: true },
                    { label: 'Colesterol (mg/dL)', data: datasUnicas.map(c => mapColest[c] || null), borderColor: '#0dcaf0', hidden: true, tension: 0.3, spanGaps: true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { ticks: { display: false }, grid: { display: false } },
                    y: { beginAtZero: false, title: { display: true, text: 'BPM', color: '#0d6efd' } }
                }
            }
        });

        configurarBotoesGrafico();

    } catch (error) { console.error("Erro gráfico:", error); }
}

function configurarBotoesGrafico() {
    const configs = [
        { id: 'btnFC', idx: [0], text: 'BPM', color: '#0d6efd' },
        { id: 'btnGlicose', idx: [1], text: 'mg/dL', color: '#dc3545' },
        { id: 'btnPA', idx: [2, 3], text: 'mmHg', color: '#198754' },
        { id: 'btnPeso', idx: [4], text: 'kg', color: '#ffc107' },
        { id: 'btnColesterol', idx: [5], text: 'mg/dL', color: '#0dcaf0' }
    ];

    configs.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            btn.onclick = () => {
                chartVitals.data.datasets.forEach((_, i) => chartVitals.setDatasetVisibility(i, false));
                item.idx.forEach(i => chartVitals.setDatasetVisibility(i, true));
                
                // Atualiza o texto e a cor do título do eixo Y
                chartVitals.options.scales.y.title.text = item.text;
                chartVitals.options.scales.y.title.color = item.color;
                
                chartVitals.update();
            };
        }
    });
}

// --- LOGICA DE GRAVAR SINAL VITAL ---
document.addEventListener('DOMContentLoaded', () => {
    const formSinal = document.getElementById('formSinalVital');
    const selectTipo = document.getElementById('svTipo');

    if (selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            const divValor2 = document.getElementById('divValor2');
            const labelValor1 = document.getElementById('labelValor1');
            if (e.target.value === 'Pressao Arterial') {
                divValor2.style.display = 'block';
                labelValor1.textContent = 'VALOR SISTÓLICO';
            } else {
                divValor2.style.display = 'none';
                labelValor1.textContent = 'VALOR';
            }
        });
    }

    if (formSinal) {
        formSinal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data_registo = document.getElementById('svData').value.replace('T', ' ');
            const tipo_metrica = document.getElementById('svTipo').value;
            const valor_primario = document.getElementById('svValor1').value;
            const valor_secundario = document.getElementById('svValor2').value || null;
            const msgDiv = document.getElementById('msgSinalVital');

            try {
                const response = await fetch('/api/dashboard/sinais-vitais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data_registo, tipo_metrica, valor_primario, valor_secundario })
                });

                if (response.ok) {
                    msgDiv.innerHTML = '<div class="alert alert-success">Registo guardado!</div>';
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    msgDiv.innerHTML = '<div class="alert alert-danger">Erro ao guardar.</div>';
                }
            } catch (error) {
                msgDiv.innerHTML = '<div class="alert alert-danger">Erro de ligação.</div>';
            }
        });
    }
});

async function carregarTabelaSinaisVitais() {
    const tbody = document.getElementById('tabelaSinaisVitais');
    if (!tbody) return; // Se não estivermos na página dos sinais vitais, esta função não faz nada

    try {
        const response = await fetch('/api/vitals');
        if (!response.ok) throw new Error("Erro ao buscar dados");
        
        const dados = await response.json();
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Ainda não existem registos.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const tr = document.createElement('tr');
            // Formata a data e trata se houver valor secundário (ex: PA)
            const dataFormatada = new Date(item.data_registo).toLocaleString('pt-PT');
            const valorExibido = item.valor_secundario ? `${item.valor_primario} / ${item.valor_secundario}` : item.valor_primario;

            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${item.tipo_metrica}</td>
                <td>${valorExibido}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="apagarSinal(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) { 
        console.error("Erro ao carregar tabela:", error); 
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    }
}

// --- EXECUÇÃO INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    carregarResumoDashboard();
    carregarTabelaDashboard(); 
    carregarGraficoVitals(); 
    carregarTabelaSinaisVitais(); 
    
});