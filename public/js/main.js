// Lógica de Logout
function logout() {
  // Limpar sessão (exemplo simplificado)
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
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Login 
document.addEventListener('DOMContentLoaded', () => {
    // Seleciono o formulário e a div onde vou mostrar mensagens de sucesso/erro
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // Verifico se estou na página de Login 
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // Isto impede que a página faça "refresh" quando clico no botão
            e.preventDefault(); 

            // 1. Valores que o utilizador escreveu nos campos de email e password
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Limpar mensagens anteriores
            messageDiv.innerHTML = '';

            try {
                // 2. Enviar os dados para o servidor usando Fetch API
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Envio o email e a password como JSON 
                    body: JSON.stringify({ email, password }) 
                });

                // Espero a resposta do servidor e converto para JSON
                const data = await response.json();

                // Verifico se o login foi bem-sucedido (código 200) ou se houve um erro 
                if (response.ok) {
                    // Login com sucesso! (Código 200)
                    messageDiv.innerHTML = `
                        <div class="alert alert-success d-flex align-items-center" role="alert">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <div>${data.mensagem}</div>
                        </div>
                    `;
                    if (data.nome) {
                       localStorage.setItem('userName', data.nome);
                    }

                    messageDiv.innerHTML = `
                    <div class="alert alert-success d-flex align-items-center" role="alert">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        <div>${data.mensagem}</div>
                    </div>
                    `;
                    
                    // Aguarda 1 segundo e redireciona o utilizador para o Dashboard
                    setTimeout(() => {
                        window.location.href = data.redirecionar || '/dashboard.html';
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
                console.error('Erro de ligação ao servidor:', error);
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
document.addEventListener('DOMContentLoaded', () => {
    const registoForm = document.getElementById('registoForm');
    const msgDivRegisto = document.getElementById('mensagemRegisto');

    if (registoForm) {
        registoForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            // Apanhar os valores que escreveste no formulário
            const nome = document.getElementById('regNome').value;
            const data_nascimento = document.getElementById('regDataNasc').value;
            const grupo_sanguineo = document.getElementById('regGrupoSang').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            msgDivRegisto.innerHTML = '';

            try {
                // Enviar para a rota de registo do teu authController
                const response = await fetch('/api/auth/registo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, password, data_nascimento, grupo_sanguineo })
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
                        window.location.href = 'index.html';
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
                console.error('Erro:', error);
                msgDivRegisto.innerHTML = `
                    <div class="alert alert-danger" role="alert">Erro ao contactar o servidor.</div>
                `;
            }
        });
    }
});