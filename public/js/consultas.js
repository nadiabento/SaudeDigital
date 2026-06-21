document.addEventListener('DOMContentLoaded', () => {
    // Quando a página carrega, inicializa os formulários, a tabela e as listas do modal
    inicializarFormulario();
    carregarHistorico();
    carregarListasModalMedico();

    const formConsulta = document.getElementById('formConsulta');
    if (formConsulta) {
        formConsulta.addEventListener('submit', registarConsulta);
    }
});

// Variáveis globais para controlar o estado das consultas, médicos e a aba ativa
let consultasGlobais = [];
let listaMedicos = []; 
let abaAtual = 'futuras';

// Variáveis que controlam a paginação da nossa tabela
let paginaAtual = 1;
const consultasPorPagina = 10;

// Variáveis para gerir a ordenação das colunas na tabela
let colunaOrdenacao = 'data_hora'; 
let direcaoOrdenacao = 'asc';       

// ============================================================================
// --- GESTÃO UTILITÁRIA DE MODAIS (LIMPEZA DE BACKDROPS) ---
// ============================================================================

// Função para limpar os resíduos dos modais e não deixar o ecrã congelado ou escuro
function limparModais() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.style.overflow = 'auto'; 

    const modalEdit = document.getElementById('modalEditarConsulta');
    if (modalEdit) {
        modalEdit.classList.remove('show');
        modalEdit.style.display = 'none';
    }
}

// ============================================================================
// --- CARREGAR LISTAS DO MODAL (NOVO MÉDICO) ---
// ============================================================================

// Carrega as clínicas e as especialidades para as caixas de seleção do modal de criar médico
async function carregarListasModalMedico() {
    try {
        const resU = await fetch('/api/consultas/unidades');
        const unidades = await resU.json();
        const containerLista = document.getElementById('listaUniMedicoCheckboxes');
        
        if (containerLista) {
            containerLista.innerHTML = '';
            unidades.forEach(u => {
                containerLista.innerHTML += `
                    <div class="form-check mb-2">
                        <input class="form-check-input uni-checkbox border-secondary" type="checkbox" value="${u.id_unidade}" id="uni_${u.id_unidade}" onchange="atualizarTextoBotaoDropdown()">
                        <label class="form-check-label text-dark small fw-semibold" for="uni_${u.id_unidade}">
                            ${u.nome}
                        </label>
                    </div>
                `;
            });
        }

        const resE = await fetch('/api/consultas/todas-especialidades');
        const especialidades = await resE.json();
        const selectEsp = document.getElementById('inputEspMedico');
        
        if (selectEsp) {
            selectEsp.innerHTML = '<option value="" selected disabled>Selecione a especialidade...</option>';
            especialidades.forEach(e => {
                selectEsp.innerHTML += `<option value="${e.id_especialidade}">${e.nome}</option>`;
            });
        }
    } catch (erro) { 
        console.error('Erro ao carregar listas do modal médico:', erro); 
    }
}

// ============================================================================
// --- FORMULÁRIO PRINCIPAL (LÓGICA INTELIGENTE) ---
// ============================================================================

// Faz o arranque do formulário principal carregando as especialidades e os médicos ativos
async function inicializarFormulario() {
    try {
        // Vai buscar as especialidades todas à API
        const resE = await fetch('/api/consultas/todas-especialidades');
        const especialidades = await resE.json();
        const selectEsp = document.getElementById('especialidadeInput');
        if (selectEsp) {
            selectEsp.innerHTML = '<option value="" selected disabled>Escolha a especialidade...</option>';
            especialidades.forEach(e => selectEsp.innerHTML += `<option value="${e.id_especialidade}">${e.nome}</option>`);
        }

        // Carrega a lista completa de médicos
        const resM = await fetch('/api/consultas/todos-medicos');
        listaMedicos = await resM.json();
        const selectMed = document.getElementById('medicoInput');
        if (selectMed) {
            selectMed.innerHTML = '<option value="" selected disabled>Selecione o médico...</option>';
            listaMedicos.forEach(m => {
                selectMed.innerHTML += `<option value="${m.id_medico || m.id}">${m.nome}</option>`;
            });
        }

        // Ativa à força todos os campos da receita para o utilizador conseguir preencher
        const camposReceita = ['receitaMedicamentoInput', 'receitaPosologiaInput', 'receitaDataInicioInput', 'receitaDataFimInput'];
        camposReceita.forEach(id => {
            const elemento = document.getElementById(id);
            if (element) {
                elemento.disabled = false;
                elemento.classList.remove('text-muted');
            }
        });

    } catch (erro) { 
        console.error('Erro fatal ao inicializar formulário principal:', erro); 
    }
}

// Deteta o médico escolhido, mete a especialidade dele e filtra os locais onde ele dá consulta
async function autoPreencherMedico() {
    const idMedico = document.getElementById('medicoInput').value;
    if (!idMedico) return;

    const medicoEscolhido = listaMedicos.find(m => m.id_medico == idMedico || m.id == idMedico);
    if (medicoEscolhido) {
        document.getElementById('especialidadeInput').value = medicoEscolhido.id_especialidade || medicoEscolhido.especialidade;
        
        try {
            const res = await fetch(`/api/consultas/medico-unidades/${idMedico}`);
            const unidadesDoMedico = await res.json();
            const selectUni = document.getElementById('unidadeInput');
            if (selectUni) {
                selectUni.innerHTML = '<option value="" selected disabled>Escolha o local da consulta...</option>';
                unidadesDoMedico.forEach(u => {
                    selectUni.innerHTML += `<option value="${u.id_unidade || u.id}">${u.nome}</option>`;
                });
                selectUni.disabled = false;
            }
        } catch (erro) { 
            console.error('Erro ao auto-preencher unidades do médico:', erro); 
        }
    }
}

// Submete os dados recolhidos do formulário esquerdo para registar uma nova consulta
async function registarConsulta(evento) {
    evento.preventDefault();
    const novaConsulta = {
        id_unidade: document.getElementById('unidadeInput').value,
        id_especialidade: document.getElementById('especialidadeInput').value,
        id_medico: document.getElementById('medicoInput').value,
        data_hora: document.getElementById('dataHoraInput').value,
        notas: document.getElementById('notasConsulta').value
    };

    try {
        const resposta = await fetch('/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaConsulta)
        });

        if (resposta.ok) {
            Swal.fire({ title: 'Sucesso!', text: 'Consulta registada com sucesso.', icon: 'success', confirmButtonColor: '#0d6efd' });
            document.getElementById('formConsulta').reset();
            document.getElementById('especialidadeInput').disabled = true;
            document.getElementById('unidadeInput').disabled = true;
            carregarHistorico(); // Recarrega a tabela automaticamente
        } else {
            Swal.fire('Erro', 'Não foi possível registar a consulta.', 'error');
        }
    } catch (erro) { 
        console.error('Erro ao submeter nova consulta:', erro); 
    }
}

// ============================================================================
// --- HISTÓRICO DA TABELA E ABAS ---
// ============================================================================

// Puxa o histórico clínico do utilizador logado para atualizar o nosso array global
async function carregarHistorico() {
    try {
        const resposta = await fetch('/api/consultas/historico');
        if (resposta.ok) {
            consultasGlobais = await resposta.json();
            ordenarArrayConsultas();
            atualizarIconesOrdenacao();
            renderizarTabela();
        }
    } catch (erro) { 
        console.error('Erro ao carregar histórico de consultas:', erro); 
    }
}

// Controla as abas para alternar a visualização entre consultas futuras e passadas
function mudarSeparador(aba) {
    abaAtual = aba;
    paginaAtual = 1;
    
    if (aba === 'futuras') {
        document.getElementById('tab-futuras').className = 'nav-link active px-4 rounded-pill fw-semibold';
        document.getElementById('tab-anteriores').className = 'nav-link px-4 rounded-pill fw-semibold text-muted';
    } else {
        document.getElementById('tab-anteriores').className = 'nav-link active px-4 rounded-pill fw-semibold';
        document.getElementById('tab-futuras').className = 'nav-link px-4 rounded-pill fw-semibold text-muted';
    }
    renderizarTabela();
}

// Renderiza as linhas da tabela no ecrã com paginação e suporte a maiúsculas da BD Cloud
function renderizarTabela() {
    const tbody = document.getElementById('tabelaConsultas');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    const dataDeHoje = new Date();

    const consultasFiltradas = consultasGlobais.filter(c => {
        const dataConsulta = new Date(c.data_hora);
        return abaAtual === 'futuras' ? dataConsulta >= dataDeHoje : dataConsulta < dataDeHoje;
    });

    const totalPaginas = Math.ceil(consultasFiltradas.length / consultasPorPagina) || 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const consultasDaPagina = consultasFiltradas.slice((paginaAtual - 1) * consultasPorPagina, paginaAtual * consultasPorPagina);

    if (consultasDaPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma consulta encontrada nesta aba.</td></tr>`;
        document.getElementById("paginacaoContainer").innerHTML = "";
        return;
    }

    consultasDaPagina.forEach(c => {
        const dataObj = new Date(c.data_hora);
        const dataFormatada = dataObj.toLocaleDateString('pt-PT') + ' às ' + dataObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
        const corTexto = abaAtual === 'anteriores' ? 'text-muted' : 'text-dark';
        const notasSeguras = c.notas ? c.notas.replace(/(\r\n|\n|\r)/gm, ' ').replace(/'/g, "\\'") : '';
        const idSeguro = c.id || c.ID; // Proteção para capturar o ID independente da caixa da BD

        tbody.innerHTML += `
            <tr class="${corTexto}">
                <td><input type="checkbox" class="form-check-input check-item border-secondary" value="${idSeguro}" onclick="mostrarAcoesMassa()"></td>
                <td><strong>${c.especialidade || 'N/A'}</strong></td>
                <td>${dataFormatada}</td>
                <td>${c.medico || 'N/A'}</td>
                <td>${c.local || 'N/A'}</td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-outline-success btn-sm" onclick="adicionarAoCalendario('google', '${c.medico}', '${c.especialidade}', '${c.local}', ${dataObj.getTime()}, '${notasSeguras}')" title="Adicionar ao Calendário"><i class="bi bi-calendar-plus"></i></button>
                        <button class="btn btn-light btn-sm border" onclick="abrirModalEditar(${idSeguro})" title="Detalhes / Medicação"><i class="bi bi-three-dots"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    mostrarAcoesMassa();
    renderizarControlosPaginacao(totalPaginas);
}

// ============================================================================
// --- GESTÃO DETALHADA DO MODAL DE EDIÇÃO ---
// ============================================================================

// Abre o painel de detalhes da consulta e popula os campos com os dados existentes
async function abrirModalEditar(id) {
    const consulta = consultasGlobais.find(c => (c.id || c.ID) === id);
    if (!consulta) return;

    document.getElementById('editConsultaId').value = id;
    
    if (consulta.data_hora) {
        document.getElementById('editDataHora').value = consulta.data_hora.substring(0, 16);
    }
    document.getElementById('editNotas').value = consulta.notes || consulta.notas || '';

    const elementoModal = document.getElementById('modalEditarConsulta');
    if (!elementoModal) return;

    document.querySelectorAll('.modal-backdrop:not(.show)').forEach(el => el.remove());

    carregarCatalogoMedicamentosModal();
    carregarMedicamentosDoModalConsulta(id);

    let modalInstance = bootstrap.Modal.getInstance(elementoModal);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(elementoModal, {
            backdrop: 'static', 
            keyboard: true
        });
    }
    modalInstance.show();
}

// Carrega o catálogo de remédios para o modal e inicializa a pesquisa com o TomSelect
async function carregarCatalogoMedicamentosModal() {
    const selectCatModal = document.getElementById('modalEditMedicamentoSelect');
    if (!selectCatModal) return;

    try {
        const resCat = await fetch('/api/consultas/catalogo-medicamentos');
        const catalogo = await resCat.json();

        let options = '<option value="">Escolha um medicamento...</option>';
        catalogo.forEach(med => {
            options += `<option value="${med.id}">${med.nome_medicamento}</option>`;
        });

        selectCatModal.innerHTML = options;

        if (selectCatModal.tomselect) {
            selectCatModal.tomselect.destroy();
        }

        new TomSelect("#modalEditMedicamentoSelect", {
            create: false,
            maxOptions: 100,
            searchField: ["text"],
            placeholder: "Pesquisar medicamento..."
        });

    } catch (erro) {
        console.error("ERRO CATÁLOGO:", erro);
    }
}

// Injeta dinamicamente no modal a lista de medicamentos que já estão colados à consulta
async function carregarMedicamentosDoModalConsulta(idConsulta) {
    const container = document.getElementById('modalListaMedicamentosVinculados');
    if (!container) return;
    container.innerHTML = '<small class="text-muted">A carregar medicações associadas...</small>';

    try {
        const res = await fetch(`/api/consultas/${idConsulta}/medicamentos`);
        if (res.ok) {
            const medicamentos = await res.json();
            if (medicamentos.length === 0) {
                container.innerHTML = '<p class="small text-muted text-center py-2">Nenhum medicamento associado a esta consulta.</p>';
                return;
            }
            container.innerHTML = '';
            medicamentos.forEach(m => {
                container.innerHTML += `
                    <div class="d-flex justify-content-between align-items-center p-2 mb-1 bg-white border rounded small shadow-sm">
                        <div><strong>${m.nome_medicamento || 'Medicamento'}</strong><div class="text-muted" style="font-size: 0.7rem;">${m.posologia || 'Sem posologia'}</div></div>
                        <button class="btn btn-sm text-danger border-0 bg-transparent" onclick="removerVinculoMedicamento(${m.id}, ${idConsulta})"><i class="bi bi-trash"></i></button>
                    </div>`;
            });
        }
    } catch (e) { 
        container.innerHTML = '<small class="text-danger">Erro ao obter medicações.</small>'; 
    }
}

// Vincula um medicamento novo do catálogo à consulta atual em visualização
async function adicionarMedicamentoAConsultaExistente() {
    const idConsulta = document.getElementById('editConsultaId').value;
    const idCatalogo = document.getElementById('modalEditMedicamentoSelect').value;
    const posologia = document.getElementById('modalEditPosologiaInput').value;

    if (!idCatalogo) return Swal.fire('Aviso', 'Selecione um medicamento da lista.', 'warning');

    try {
        const res = await fetch(`/api/consultas/${idConsulta}/medicamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_catalogo_medicamento: idCatalogo, 
                posologia, 
                data_inicio: document.getElementById('modalEditDataInicio').value || null, 
                data_fim: document.getElementById('modalEditDataFim').value || null 
            })
        });
        if (res.ok) {
            document.getElementById('modalEditMedicamentoSelect').value = "";
            document.getElementById('modalEditPosologiaInput').value = "";
            document.getElementById('modalEditDataInicio').value = "";
            document.getElementById('modalEditDataFim').value = "";
            carregarMedicamentosDoModalConsulta(idConsulta);
        }
    } catch (error) { 
        console.error('Erro ao vincular medicação:', error); 
    }
}

// Elimina a ligação entre o medicamento e a consulta selecionada
async function removerVinculoMedicamento(idMedicamento, idConsulta) {
    try {
        const res = await fetch(`/api/consultas/medicamentos/${idMedicamento}`, { method: 'DELETE' });
        if (res.ok) {
            carregarMedicamentosDoModalConsulta(idConsulta);
        }
    } catch (e) { 
        console.error('Erro ao desvincular medicação:', e); 
    }
}

// Grava as alterações feitas no formulário de edição do modal
async function guardarEdicao() {
    const id = document.getElementById('editConsultaId').value;
    try {
        const res = await fetch(`/api/consultas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                data_hora: document.getElementById('editDataHora').value, 
                notas: document.getElementById('editNotas').value 
            })
        });
        if (res.ok) {
            Swal.fire('Sucesso', 'Consulta atualizada com sucesso!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarConsulta'));
            if (modal) modal.hide();
            setTimeout(() => { limparModais(); }, 300);
            carregarHistorico();
        }
    } catch (e) { 
        console.error('Erro ao guardar alterações da consulta:', e); 
    }
}

// ============================================================================
// --- SISTEMA INTERATIVO DE ORDENAÇÃO ---
// ============================================================================

// Alterna os critérios de ordenação ascendente ou descendente ao clicar nas tabelas
function ordenarPor(coluna) {
    if (colunaOrdenacao === coluna) {
        direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
        colunaOrdenacao = coluna;
        direcaoOrdenacao = 'asc';
    }
    ordenarArrayConsultas();
    atualizarIconesOrdenacao();
    paginaAtual = 1;
    renderizarTabela();
}

function ordenarArrayConsultas() {
    consultasGlobais.sort((a, b) => {
        let valorA = a[colunaOrdenacao] ? a[colunaOrdenacao].toString().toLowerCase() : '';
        let valorB = b[colunaOrdenacao] ? b[colunaOrdenacao].toString().toLowerCase() : '';

        if (colunaOrdenacao === 'data_hora') {
            valorA = new Date(a.data_hora).getTime();
            valorB = new Date(b.data_hora).getTime();
        }
        if (valorA < valorB) return direcaoOrdenacao === 'asc' ? -1 : 1;
        if (valorA > valorB) return direcaoOrdenacao === 'asc' ? 1 : -1;
        return 0;
    });
}

// Altera visualmente os ícones das setas no topo das tabelas para ajudar o utilizador
function atualizarIconesOrdenacao() {
    ['especialidade', 'data_hora', 'medico', 'local'].forEach(col => {
        const icone = document.getElementById(`sort-icon-${col}`);
        if (icone) {
            if (col === colunaOrdenacao) {
                icone.className = direcaoOrdenacao === 'asc' ? 'bi bi-arrow-up text-primary fw-bold' : 'bi bi-arrow-down text-primary fw-bold';
            } else {
                icone.className = 'bi bi-arrow-down-up text-muted opacity-50';
            }
        }
    });
}

// ============================================================================
// --- CONTROLOS AUXILIARES: PAGINAÇÃO, ELIMINAÇÃO EM MASSA E CALENDÁRIO ---
// ============================================================================

// Desenha na parte inferior os botões da paginação baseada no limite de linhas por página
function renderizarControlosPaginacao(totalPaginas) {
    const container = document.getElementById("paginacaoContainer");
    if (!container) return;
    if (totalPaginas <= 1) { container.innerHTML = ""; return; }
    
    let html = `<nav><ul class="pagination pagination-sm m-0"><li class="page-item ${paginaAtual === 1 ? "disabled" : ""}"><a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${paginaAtual - 1})">Anterior</a></li>`;
    for (let i = 1; i <= totalPaginas; i++) { html += `<li class="page-item ${i === paginaAtual ? "active" : ""}"><a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${i})">${i}</a></li>`; }
    html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}"><a class="page-link" href="javascript:void(0)" onclick="mudarPagina(${paginaAtual + 1})">Próximo</a></li></ul></nav>`;
    container.innerHTML = html;
}

function mudarPagina(num) { if (num >= 1) { paginaAtual = num; renderizarTabela(); } }

// Seleciona ou desmarca todas os vistos da tabela de uma só vez
function toggleTodos(source) { 
    document.querySelectorAll('.check-item').forEach(cb => cb.checked = source.checked); 
    mostrarAcoesMassa(); 
}

// Faz saltar ou esconde a barra azul escuro do topo consoante os vistos ativos
function mostrarAcoesMassa() {
    const checkboxes = document.querySelectorAll('.check-item:checked');
    const barraAcoes = document.getElementById('acoesMassa');
    
    if (barraAcoes) {
        if (checkboxes.length > 0) {
            barraAcoes.classList.remove('d-none');
            barraAcoes.classList.add('d-flex'); 
        } else {
            barraAcoes.classList.add('d-none');
            barraAcoes.classList.remove('d-flex');
            const checkAll = document.getElementById('checkAll');
            if (checkAll) checkAll.checked = false;
        }
    }
}

// Dispara o pedido DELETE em massa para apagar todas as consultas selecionadas
async function eliminarSelecionados() {
    const checkboxes = document.querySelectorAll('.check-item:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);
    if (ids.length === 0) return;

    const confirmacao = await Swal.fire({
        title: 'Tem a certeza?', text: `Vai eliminar ${ids.length} consulta(s) selecionada(s).`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Sim, eliminar!', cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const res = await fetch('/api/consultas/massa', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })
            });
            if (res.ok) {
                Swal.fire('Eliminado!', 'As consultas selecionadas foram apagadas.', 'success');
                carregarHistorico();
                const checkAll = document.getElementById('checkAll');
                if(checkAll) checkAll.checked = false;
            }
        } catch (e) { console.error(e); }
    }
}

// Envia os dados para a API de partilha e gera o link temporário de 48h para o médico
async function partilharSelecionados() {
    const checkboxes = document.querySelectorAll('.check-item:checked');
    const consultasIds = Array.from(checkboxes).map(cb => cb.value);
    if (consultasIds.length === 0) return;

    try {
        const res = await fetch('/api/consultas/partilha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultasIds })
        });

        if (res.ok) {
            const dados = await res.json();
            const linkPartilha = `${window.location.origin}/api/consultas/visualizar-partilha/${dados.token}`;

            Swal.fire({
                title: 'Link Clínico Gerado!',
                html: `
                    <p class="small text-muted">Este acesso é temporário e expira automaticamente em 48 horas.</p>
                    <input type="text" id="inputLinkPartilha" class="form-control text-center bg-light fw-bold" value="${linkPartilha}" readonly onclick="this.select()">
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#0d6efd',
                confirmButtonText: '<i class="bi bi-copy"></i> Copiar Link',
                cancelButtonText: 'Fechar'
            }).then((result) => {
                if (result.isConfirmed) {
                    const inputLink = document.getElementById('inputLinkPartilha');
                    inputLink.select();
                    document.execCommand('copy');
                    Swal.fire('Copiado!', 'O link de partilha foi copiado para a área de transferência.', 'success');
                }
            });
        } else {
            Swal.fire('Erro', 'Não foi possível gerar o link de partilha.', 'error');
        }
    } catch (erro) {
        console.error("Erro ao processar partilha no front-end:", erro);
    }
}

// Cria a estrutura para exportar a marcação diretamente para a agenda do Google Calendar
function adicionarAoCalendario(tipo, medico, especialidade, unidade, timestamp, notas) {
    const dataInicio = new Date(Number(timestamp));
    const dataFim = new Date(dataInicio.getTime() + (60 * 60 * 1000));
    const titulo = `Consulta de ${especialidade} - ${medico}`;
    const detalhes = notas || 'Registo automático do SaúdeDigital.';

    if (tipo === 'google') {
        const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${fmt(dataInicio)}/${fmt(dataFim)}&details=${encodeURIComponent(detalhes)}&location=${encodeURIComponent(unidade)}`;
        window.open(url, '_blank');
    }
}

// Grava as novas clínicas através do pop-up modal secundário
async function adicionarUnidade() {
    const nome = document.getElementById('inputNomeUnidade').value;
    if (!nome) return Swal.fire('Aviso', 'Preencha o nome da unidade.', 'warning');
    try {
        const res = await fetch('/api/consultas/unidades', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, localizacao: 'N/A' })
        });
        if (res.ok) {
            Swal.fire('Sucesso', 'Unidade adicionada!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalNovaUnidade')).hide();
            document.getElementById('inputNomeUnidade').value = '';
            carregarListasModalMedico(); 
        }
    } catch (e) { console.error(e); }
}

// Adiciona um médico novo no sistema vinculando-o ao array de clínicas que selecionámos
async function adicionarMedico() {
    const nome = document.getElementById('inputNomeMedico').value;
    const especialidade = document.getElementById('inputEspMedico').value;
    const checkboxesMarcados = document.querySelectorAll('.uni-checkbox:checked');
    const unidadesSelecionadas = Array.from(checkboxesMarcados).map(cb => cb.value);

    if (!nome || !especialidade || unidadesSelecionadas.length === 0) {
        return Swal.fire('Aviso', 'Preencha todos os campos do médico.', 'warning');
    }

    try {
        const res = await fetch('/api/consultas/medicos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, especialidade, unidades: unidadesSelecionadas })
        });
        if (res.ok) {
            Swal.fire('Sucesso', 'Médico adicionado!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalNovoMedico')).hide();
            document.getElementById('inputNomeMedico').value = '';
            document.querySelectorAll('.uni-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('btnUnidadesDropdown').textContent = 'Selecione as unidades...';
            inicializarFormulario();
        }
    } catch (e) { console.error(e); }
}

// Abre o pop-up para gerir as clínicas associadas a um médico específico
async function abrirModalEditarLocais() {
    const idMedico = document.getElementById('medicoInput').value;
    if (!idMedico) return Swal.fire('Aviso', 'Selecione um médico na lista ao lado.', 'info');

    const medicoEscolhido = listaMedicos.find(m => m.id_medico == idMedico || m.id == idMedico);
    if (!medicoEscolhido) return;

    document.getElementById('nomeMedicoEditar').textContent = medicoEscolhido.nome;
    try {
        const resTodasU = await fetch('/api/consultas/unidades');
        const todasUnidades = await resTodasU.json();
        const resMedU = await fetch(`/api/consultas/medico-unidades/${idMedico}`);
        const unidadesAtuais = await resMedU.json();
        const idsUnidadesAtuais = unidadesAtuais.map(u => u.id_unidade || u.id);

        const containerLista = document.getElementById('listaEditUniMedicoCheckboxes');
        if (containerLista) {
            containerLista.innerHTML = '';
            todasUnidades.forEach(u => {
                const idU = u.id_unidade || u.id;
                const marcado = idsUnidadesAtuais.includes(idU) ? 'checked' : '';
                containerLista.innerHTML += `
                    <div class="form-check mb-2">
                        <input class="form-check-input edit-uni-checkbox border-secondary" type="checkbox" value="${idU}" id="edit_uni_${idU}" ${marcado} onchange="atualizarTextoBotaoDropdownEdicao()">
                        <label class="form-check-label text-dark small fw-semibold" for="edit_uni_${idU}">${u.nome}</label>
                    </div>`;
            });
        }
        atualizarTextoBotaoDropdownEdicao();
        new bootstrap.Modal(document.getElementById('modalEditarLocaisMedico')).show();
    } catch (erro) { console.error(erro); }
}

// Envia o array final com as novas unidades selecionadas para reconfigurar o médico na BD
async function guardarNovosLocaisMedico() {
    const idMedico = document.getElementById('medicoInput').value;
    const checkboxesMarcados = document.querySelectorAll('.edit-uni-checkbox:checked');
    const unidadesSelecionadas = Array.from(checkboxesMarcados).map(cb => cb.value);

    try {
        const res = await fetch(`/api/consultas/medicos/${idMedico}/locais`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unidades: unidadesSelecionadas })
        });
        if (res.ok) {
            Swal.fire('Sucesso!', 'Clínicas do médico atualizadas.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarLocaisMedico')).hide();
            autoPreencherMedico();
        }
    } catch (erro) { console.error(erro); }
}

function atualizarTextoBotaoDropdownEdicao() {
    const marcados = document.querySelectorAll('.edit-uni-checkbox:checked').length;
    const botao = document.getElementById('btnEditUnidadesDropdown');
    if (botao) botao.textContent = marcados === 0 ? 'Nenhuma clínica' : marcados === 1 ? '1 clínica' : `${marcados} clínicas`;
}

function atualizarTextoBotaoDropdown() {
    const marcados = document.querySelectorAll('.uni-checkbox:checked').length;
    const botao = document.getElementById('btnUnidadesDropdown');
    if (botao) botao.textContent = marcados === 0 ? 'Selecione as unidades...' : marcados === 1 ? '1 unidade' : `${marcados} unidades`;
}

// Cria uma Especialidade nova mapeando as variáveis e enviando para o endpoint correto
async function adicionarEspecialidade() {
    const nome = document.getElementById("inputNovaEspecialidade").value.trim();

    if (!nome) {
        Swal.fire('Aviso', 'Introduza o nome da especialidade.', 'warning');
        return;
    }

    try {
        const res = await fetch("/api/consultas/especialidades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome })
        });

        const data = await res.json();

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Especialidade criada com sucesso!', confirmButtonColor: '#0d6efd' });
            document.getElementById("inputNovaEspecialidade").value = "";
            inicializarFormulario(); 
            bootstrap.Modal.getInstance(document.getElementById('modalNovaEspecialidade')).hide();
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Erro ao criar especialidade.' });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
    }
}