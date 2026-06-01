// 1. Variáveis Globais (Vazias de início)
let todosSinaisVitais = [];
let dadosAtuais = [];
let paginaAtual = 1;
const registosPorPagina = 8;
let direcaoOrdenacao = 1;

// 2. A FUNÇÃO MÁGICA: Lê os dados reais que o teu backend já colocou no ecrã!
function capturarDadosIniciais() {
    const tbody = document.getElementById('tabelaSinaisVitais');
    if (!tbody) return;

    const linhas = tbody.querySelectorAll('tr');
    
    // Vai ler linha a linha do HTML
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        
        // Se for uma linha válida com os dados (Data, Métrica, Valor, Ações)
        if (colunas.length === 4) {
            let id = 0;
            // Tenta descobrir o ID do registo escondido no botão de apagar
            const btn = colunas[3].querySelector('button');
            if (btn && btn.getAttribute('onclick')) {
                const match = btn.getAttribute('onclick').match(/\d+/);
                if (match) id = parseInt(match[0]);
            }

            // Guarda os dados na memória do JavaScript
            todosSinaisVitais.push({
                id: id,
                data: colunas[0].innerText.trim(),
                metrica: colunas[1].innerText.trim(),
                valor: colunas[2].innerText.trim()
            });
        }
    });

    // Se encontrou dados, ativa a paginação!
    if (todosSinaisVitais.length > 0) {
        dadosAtuais = [...todosSinaisVitais];
        renderizarTabela();
    }
}

// 3. DESENHAR A TABELA (Com os dados da base de dados)
function renderizarTabela() {
    const tbody = document.getElementById('tabelaSinaisVitais');
    tbody.innerHTML = ''; 

    const inicio = (paginaAtual - 1) * registosPorPagina;
    const fim = inicio + registosPorPagina;
    const itensPagina = dadosAtuais.slice(inicio, fim);

    if (itensPagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum registo encontrado.</td></tr>';
        renderizarPaginacao();
        return;
    }

    itensPagina.forEach(registo => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${registo.data}</td>
            <td>${registo.metrica}</td>
            <td>${registo.valor}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="apagarRegisto(${registo.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderizarPaginacao();
}

// 4. PESQUISA (Agora pesquisa por métrica E por data!)
function filtrarTabela() {
    const input = document.getElementById('inputSearchSinais');
    if (!input) return;
    
    const termo = input.value.toLowerCase();
    
    dadosAtuais = todosSinaisVitais.filter(registo => 
        registo.metrica.toLowerCase().includes(termo) ||
        registo.data.toLowerCase().includes(termo)
    );
    
    paginaAtual = 1; 
    renderizarTabela();
}

// 5. ORDENAÇÃO
function ordenarTabela(coluna) {
    direcaoOrdenacao *= -1; 

    dadosAtuais.sort((a, b) => {
        let valorA = a[coluna] || '';
        let valorB = b[coluna] || '';

        if (typeof valorA === 'string') valorA = valorA.toLowerCase();
        if (typeof valorB === 'string') valorB = valorB.toLowerCase();

        if (valorA < valorB) return -1 * direcaoOrdenacao;
        if (valorA > valorB) return 1 * direcaoOrdenacao;
        return 0;
    });

    paginaAtual = 1;
    renderizarTabela();
}

// 6. BOTÕES DA PAGINAÇÃO
function renderizarPaginacao() {
    const ul = document.getElementById('paginacaoSinais');
    if (!ul) return;
    ul.innerHTML = '';
    
    const totalPaginas = Math.ceil(dadosAtuais.length / registosPorPagina);
    if (totalPaginas <= 1) return; 

    ul.innerHTML += `
        <li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="mudarPagina(event, ${paginaAtual - 1})">Anterior</a>
        </li>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        ul.innerHTML += `
            <li class="page-item ${paginaAtual === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="mudarPagina(event, ${i})">${i}</a>
            </li>
        `;
    }

    ul.innerHTML += `
        <li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="mudarPagina(event, ${paginaAtual + 1})">Próximo</a>
        </li>
    `;
}

function mudarPagina(event, novaPagina) {
    event.preventDefault(); 
    const totalPaginas = Math.ceil(dadosAtuais.length / registosPorPagina);
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
        paginaAtual = novaPagina;
        renderizarTabela();
    }
}

// 7. APAGAR REGISTO NA BASE DE DADOS
async function apagarRegisto(id) {
    if (!confirm("Tem a certeza que deseja eliminar permanentemente este registo?")) return;

    try {
        // A MAGIA ESTÁ AQUI: Mudámos para a rota exata que já tens no teu server.js
        const resposta = await fetch(`/api/vitals/${id}`, { method: 'DELETE' });

        if (resposta.ok) {
            alert('Registo apagado com sucesso!');
            window.location.reload(); // Recarrega a página para atualizar os dados
        } else {
            alert('Atenção: A ligação ao backend falhou. O registo não foi apagado.');
        }
    } catch (erro) {
        console.error("Erro ao tentar apagar:", erro);
    }
}

// 8. O GATILHO INICIAL
document.addEventListener('DOMContentLoaded', () => {
    // Dá um tempo microscópico (100ms) para garantir que o teu backend já preencheu a tabela antes de lermos os dados
    setTimeout(capturarDadosIniciais, 100); 
});