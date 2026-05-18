// Lógica de Logout
function logout() {
  // Limpa o nome do utilizador da memória do browser
  localStorage.removeItem("userName");

  // Limpar sessão
  fetch("/api/auth/logout", { method: "POST" }).then(() => {
    window.location.href = "index.html";
  });
}
// Formatação de datas global
function formatarData(dataISO) {
  return new Date(dataISO).toLocaleDateString("pt-PT");
}

// Inicialização de Tooltips do Bootstrap (se necessário)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Lógica para o Título do Dashboard
  const nomeTitulo = document.getElementById("nomeUtilizadorLogado");
  const nomeGuardado = localStorage.getItem("userName");

  if (nomeTitulo && nomeGuardado) {
    nomeTitulo.textContent = `Olá, ${nomeGuardado}`;
  }

  // 2. Lógica para a Sidebar (Perfil e Avatar)
  const elNomeSidebar = document.getElementById("userName");
  const elAvatarSidebar = document.getElementById("userAvatar");

  if (nomeGuardado) {
    // Atualiza o texto na sidebar
    if (elNomeSidebar) {
      elNomeSidebar.textContent = nomeGuardado;
    }

    // Atualiza o círculo (Avatar) com as iniciais via API
    if (elAvatarSidebar) {
      const iniciaisUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeGuardado)}&background=0d6efd&color=fff&bold=true`;
      elAvatarSidebar.src = iniciaisUrl;
    }
  }

  // 3. Inicialização de Tooltips do Bootstrap
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Login
document.addEventListener("DOMContentLoaded", () => {
  // Seleciono o formulário e a div onde vou mostrar mensagens de sucesso/erro
  const loginForm = document.getElementById("loginForm");
  const messageDiv = document.getElementById("message");

  // Verifico se estou na página de Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      // Isto impede que a página faça "refresh" quando clico no botão
      e.preventDefault();

      // 1. Valores que o utilizador escreveu nos campos de email e password
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Limpar mensagens anteriores
      messageDiv.innerHTML = "";

      try {
        // 2. Enviar os dados para o servidor usando Fetch API
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Envio o email e a password como JSON
          body: JSON.stringify({ email, password }),
        });

        // Espero a resposta do servidor e converto para JSON
        const data = await response.json();

        // Verifico se o login foi bem-sucedido (código 200) ou se houve um erro
        // Verifico se o login foi bem-sucedido (código 200) ou se houve um erro
        if (response.ok) {
          // --> AS LINHAS NOVAS ENTRAM AQUI <--
          if (data.nome) {
            localStorage.setItem("userName", data.nome);
          }

          // Login com sucesso! (Código 200)
          messageDiv.innerHTML = `
                            <div class="alert alert-success d-flex align-items-center" role="alert">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                <div>Login efetuado com sucesso! A entrar...</div>
                            </div>
                        `;

          // Aguarda 1 segundo e força o redirecionamento de forma segura
          setTimeout(() => {
            console.log("A redirecionar para o dashboard...");
            window.location.href = "dashboard.html";
          }, 1000);
        } else {
          // Erro de Login (Código 401 - Pass errada, etc.)
          messageDiv.innerHTML = `
                        <div class="alert alert-danger d-flex align-items-center" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>${data.erro}</div>
                        </div>
                    `;
        }
      } catch (error) {
        // Erro caso o servidor esteja em baixo ou a VPN caia
        console.error("Erro de ligação ao servidor:", error);
        messageDiv.innerHTML = `
                    <div class="alert alert-danger d-flex align-items-center" role="alert">
                        <i class="bi bi-wifi-off me-2"></i>
                        <div>Erro ao contactar o servidor. Verifique a sua ligação.</div>
                    </div>
                `;
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

      // Apanhar os valores que escreveste no formulário
      const nome = document.getElementById("regNome").value;
      const data_nascimento = document.getElementById("regDataNasc").value;
      const grupo_sanguineo = document.getElementById("regGrupoSang").value;
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      msgDivRegisto.innerHTML = "";

      try {
        // Enviar para a rota de registo do teu authController
        const response = await fetch("/api/auth/registo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            email,
            password,
            data_nascimento,
            grupo_sanguineo,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // SUCESSO: Conta criada!
          msgDivRegisto.innerHTML = `
                        <div class="alert alert-success d-flex align-items-center" role="alert">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <div>${data.mensagem}</div>
                        </div>
                    `;
          // Redireciona para o Login após 2 segundos
          setTimeout(() => {
            window.location.href = "index.html";
          }, 2000);
        } else {
          // ERRO: Ex (E-mail já existe)
          msgDivRegisto.innerHTML = `
                        <div class="alert alert-danger d-flex align-items-center" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>${data.erro}</div>
                        </div>
                    `;
        }
      } catch (error) {
        console.error("Erro:", error);
        msgDivRegisto.innerHTML = `
                    <div class="alert alert-danger" role="alert">Erro ao contactar o servidor.</div>
                `;
      }
    });
  }
});

// --- LÓGICA DO DASHBOARD (Carregar Perfil) ---
document.addEventListener("DOMContentLoaded", () => {
  const nomeTitulo = document.getElementById("nomeUtilizadorLogado");

  // Se estivermos na página do dashboard...
  if (nomeTitulo) {
    // Vai buscar o nome que guardaste no LocalStorage durante o Login!
    const nomeGuardado = localStorage.getItem("userName");

    if (nomeGuardado) {
      // Se encontrou o nome, troca imediatamente no ecrã
      nomeTitulo.textContent = `Olá, ${nomeGuardado}`;
    } else {
      console.log("Nenhum nome encontrado no LocalStorage.");
    }
  }
});


// --- CARREGAR RESUMO DO DASHBOARD ---
async function carregarResumoDashboard() {
    // 1. Encontrar os elementos no HTML
    const elementoConsulta = document.getElementById('resumoConsulta');
    const elementoMedicacao = document.getElementById('resumoMedicacao');
    const elementoEfeitos = document.getElementById('resumoEfeitos');

    // Se não estivermos na página do dashboard, a função para aqui
    if (!elementoConsulta) return;

    try {
        // 2. Fazer o pedido ao nosso backend (vamos criar esta rota a seguir!)
        const response = await fetch('/api/dashboard/resumo');
        
        if (response.ok) {
            const dados = await response.json();
            
            // 3. Trocar o texto "A carregar..." pelos dados verdadeiros!
            elementoConsulta.textContent = dados.proximaConsulta || "Sem consultas agendadas";
            elementoMedicacao.textContent = `${dados.totalMedicamentos} Medicamentos`;
            elementoEfeitos.textContent = `${dados.totalEfeitos} Alertas`;
        } else {
            console.error("Erro ao carregar o resumo do dashboard");
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
            
            tbody.innerHTML = ''; // Limpa o "A carregar..."

            // Filtra os ativos e pega só nos 3 primeiros
            const ativos = medicamentos.filter(m => m.estado === 'Ativo').slice(0, 3);

            if (ativos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum medicamento ativo neste momento.</td></tr>';
                return;
            }

            // Preenche a tabela com os teus estilos originais
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
        } else {
            throw new Error("Erro no servidor");
        }
    } catch (error) {
        console.error("Erro ao carregar a tabela:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Erro ao contactar o servidor.</td></tr>';
    }
}

// Quando a página carregar, executa as DUAS funções do Dashboard
document.addEventListener('DOMContentLoaded', () => {
    carregarResumoDashboard();
    carregarTabelaDashboard(); 
});

// --- LÓGICA DO MODAL SINAIS VITAIS ---
document.addEventListener('DOMContentLoaded', () => {
    const selectTipo = document.getElementById('svTipo');
    const divValor2 = document.getElementById('divValor2');
    const labelValor1 = document.getElementById('labelValor1');
    const formSinal = document.getElementById('formSinalVital');

    // Mudar o formulário consoante o que o utilizador escolhe
    if (selectTipo) {
        selectTipo.addEventListener('change', (e) => {
            if (e.target.value === 'Pressao Arterial') {
                divValor2.style.display = 'block';
                labelValor1.textContent = 'VALOR SISTÓLICO (MÁXIMA)';
            } else {
                divValor2.style.display = 'none';
                labelValor1.textContent = 'VALOR';
                document.getElementById('svValor2').value = ''; // Limpa o segundo valor
            }
        });
    }

    // Enviar para a Base de Dados
    if (formSinal) {
        formSinal.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data_registo = document.getElementById('svData').value;
            const tipo_metrica = document.getElementById('svTipo').value;
            const valor_primario = document.getElementById('svValor1').value;
            const valor_secundario = document.getElementById('svValor2').value || null;
            const msgDiv = document.getElementById('msgSinalVital');

            msgDiv.innerHTML = ''; // Limpar mensagens antigas

            try {
                // Vamos criar esta rota no servidor já a seguir!
                const response = await fetch('/api/dashboard/sinais-vitais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data_registo, tipo_metrica, valor_primario, valor_secundario })
                });

                if (response.ok) {
                    msgDiv.innerHTML = '<div class="alert alert-success d-flex align-items-center"><i class="bi bi-check-circle-fill me-2"></i>Registo guardado com sucesso!</div>';
                    // Recarrega a página após 1 segundo para vermos tudo atualizado
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    msgDiv.innerHTML = '<div class="alert alert-danger">Erro ao guardar o registo.</div>';
                }
            } catch (error) {
                console.error(error);
                msgDiv.innerHTML = '<div class="alert alert-danger">Erro de ligação ao servidor.</div>';
            }
        });
    }
});

// --- DESENHAR O GRÁFICO (CHART.JS) ---
async function carregarGraficoVitals() {
    const canvas = document.getElementById('graficoVitals');
    if (!canvas) return;

    try {
        const response = await fetch('/api/dashboard/historico-vitals');
        if (!response.ok) throw new Error("Erro na API");
        
        const dados = await response.json();
        
        // 1. Formatar datas para o eixo de baixo (ex: 14/05)
        const datasX = dados.map(d => {
            const data = new Date(d.data_registo);
            return data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
        });

        // 2. Separar os valores
        const bpm = dados.map(d => d.tipo_metrica === 'Frequencia Cardiaca' ? d.valor_primario : null);
        const glicose = dados.map(d => d.tipo_metrica === 'Glicose' ? d.valor_primario : null);

        // 3. Chamar o Chart.js para pintar!
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: datasX,
                datasets: [
                    {
                        label: 'FC (bpm)',
                        data: bpm,
                        borderColor: '#0d6efd', // Azul
                        backgroundColor: '#0d6efd',
                        spanGaps: true, // Se não houver medição num dia, a linha continua!
                        tension: 0.3,   // Faz a linha ficar curvada e suave
                        pointRadius: 4
                    },
                    {
                        label: 'Glicose (mg/dL)',
                        data: glicose,
                        borderColor: '#dc3545', // Vermelho
                        backgroundColor: '#dc3545',
                        spanGaps: true,
                        tension: 0.3,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

    } catch (error) {
        console.error("Erro ao desenhar gráfico:", error);
    }
}
// Quando a página carregar, executa TUDO!
document.addEventListener('DOMContentLoaded', () => {
    carregarResumoDashboard();
    carregarTabelaDashboard(); 
    carregarGraficoVitals(); // <-- A função do gráfico entra aqui!
});
