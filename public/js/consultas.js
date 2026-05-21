document.addEventListener('DOMContentLoaded', () => {
    inicializarFormulario();
    carregarHistorico();
    carregarListasModalMedico();

    const formConsulta = document.getElementById('formConsulta');
    if (formConsulta) {
        formConsulta.addEventListener('submit', registarConsulta);
    }
});

// Variáveis Globais de Estado
let consultasGlobais = [];
let listaMedicos = []; 
let abaAtual = 'futuras';

// --- VARIÁVEIS DA PAGINAÇÃO  ---
let paginaAtual = 1;
const consultasPorPagina = 10;

// CARREGAR LISTAS DO MODAL (NOVO MÉDICO)

async function carregarListasModalMedico() {
    try {
        // 1. Carregar Unidades em formato Checkbox dentro do Dropdown Múltiplo Uniformizado
        const resU = await fetch('/api/consultas/unidades');
        const unidades = await resU.json();
        const containerLista = document.getElementById('listaUniMedicoCheckboxes');
        
        if (containerLista) {
            containerLista.innerHTML = ''; // Limpa o texto "A carregar unidades..."
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

        // 2. Carregar Especialidades no Select Tradicional (Mantém-se igual ao que tinhas)
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
        console.error('Erro a carregar listas do modal:', erro); 
    }
}
// 1. FORMULÁRIO PRINCIPAL (LÓGICA INTELIGENTE)

async function inicializarFormulario() {
    try {
        const resE = await fetch('/api/consultas/todas-especialidades');
        const especialidades = await resE.json();
        const selectEsp = document.getElementById('especialidadeInput');
        especialidades.forEach(e => selectEsp.innerHTML += `<option value="${e.id_especialidade}">${e.nome}</option>`);

        const resM = await fetch('/api/consultas/todos-medicos');
        listaMedicos = await resM.json();
        const selectMed = document.getElementById('medicoInput');
        selectMed.innerHTML = '<option value="" selected disabled>Selecione o médico...</option>';
        listaMedicos.forEach(m => {
            selectMed.innerHTML += `<option value="${m.id_medico}">${m.nome}</option>`;
        });
    } catch (erro) {
        console.error('Erro ao inicializar formulário:', erro);
    }
}

async function autoPreencherMedico() {
    const idMedico = document.getElementById('medicoInput').value;
    const medicoEscolhido = listaMedicos.find(m => m.id_medico == idMedico);
    
    if (medicoEscolhido) {
        document.getElementById('especialidadeInput').value = medicoEscolhido.id_especialidade;
        
        try {
            const res = await fetch(`/api/consultas/medico-unidades/${idMedico}`);
            const unidadesDoMedico = await res.json();
            
            const selectUni = document.getElementById('unidadeInput');
            selectUni.innerHTML = '<option value="" selected disabled>Escolha o local da consulta...</option>';
            
            unidadesDoMedico.forEach(u => {
                selectUni.innerHTML += `<option value="${u.id_unidade}">${u.nome}</option>`;
            });
            
            selectUni.disabled = false;
        } catch (erro) {
            console.error('Erro ao buscar unidades do médico:', erro);
        }
    }
}

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
            
            carregarHistorico();
        } else {
            Swal.fire('Erro', 'Não foi possível registar a consulta.', 'error');
        }
    } catch (erro) { console.error(erro); }
}

// 2. CARREGAR HISTÓRICO DA TABELA E ABAS

async function carregarHistorico() {
    try {
        const resposta = await fetch('/api/consultas/historico');
        consultasGlobais = await resposta.json();
        renderizarTabela();
    } catch (erro) { console.error('Erro ao carregar histórico:', erro); }
}

function mudarSeparador(aba) {
    abaAtual = aba;
    paginaAtual = 1;
    
    // Altera o aspeto dos botões das abas
    if (aba === 'futuras') {
        document.getElementById('tab-futuras').classList.add('active');
        document.getElementById('tab-futuras').classList.remove('text-muted');
        document.getElementById('tab-anteriores').classList.remove('active');
        document.getElementById('tab-anteriores').classList.add('text-muted');
    } else {
        document.getElementById('tab-anteriores').classList.add('active');
        document.getElementById('tab-anteriores').classList.remove('text-muted');
        document.getElementById('tab-futuras').classList.remove('active');
        document.getElementById('tab-futuras').classList.add('text-muted');
    }
    
    renderizarTabela();
}

function renderizarTabela() {
    const tbody = document.getElementById('tabelaConsultas');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    const dataDeHoje = new Date();

    // 1. Filtra as consultas com base na data e na aba selecionada
    const consultasFiltradas = consultasGlobais.filter(c => {
        const dataConsulta = new Date(c.data_hora);
        if (abaAtual === 'futuras') {
            return dataConsulta >= dataDeHoje;
        } else {
            return dataConsulta < dataDeHoje;
        }
    });

    // 2. LÓGICA DE PAGINAÇÃO
    const totalPaginas = Math.ceil(consultasFiltradas.length / consultasPorPagina) || 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas; // Previne erros ao eliminar o último item

    const indiceInicio = (paginaAtual - 1) * consultasPorPagina;
    const indiceFim = indiceInicio + consultasPorPagina;
    const consultasDaPagina = consultasFiltradas.slice(indiceInicio, indiceFim); // Corta só os itens desta página

    if (consultasDaPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma consulta encontrada nesta aba.</td></tr>`;
        document.getElementById("paginacaoContainer").innerHTML = ""; // Limpa os botões
        return;
    }

    // 3. Renderiza apenas as consultas desta página
    consultasDaPagina.forEach(c => {
        const dataObj = new Date(c.data_hora);
        const dataFormatada = dataObj.toLocaleDateString('pt-PT') + ' às ' + dataObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
        
        const corTexto = abaAtual === 'anteriores' ? 'text-muted' : 'text-dark';
        const notasSeguras = c.notas ? c.notas.replace(/(\r\n|\n|\r)/gm, ' ').replace(/'/g, "\\'") : '';
        const timestampData = dataObj.getTime();

        tbody.innerHTML += `
            <tr class="${corTexto}">
                <td><input type="checkbox" class="form-check-input check-item border-secondary" value="${c.id}" onclick="mostrarAcoesMassa()"></td>
                <td><strong>${c.especialidade || 'N/A'}</strong></td>
                <td>${dataFormatada}</td>
                <td>${c.medico || 'N/A'}</td>
                <td>${c.local || 'N/A'}</td>
                <td class="text-end">
                    <div class="d-flex justify-content-end align-items-center gap-2">
                        
                        <div class="dropdown">
                            <button class="btn btn-outline-success btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Adicionar ao Calendário">
                                <i class="bi bi-calendar-plus"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                <li><a class="dropdown-item" href="#" onclick="adicionarAoCalendario('google', '${c.medico || 'N/A'}', '${c.especialidade || 'N/A'}', '${c.local || 'N/A'}', ${timestampData}, '${notasSeguras}'); return false;"><i class="bi bi-google text-danger me-2"></i>Google Calendar</a></li>
                                <li><a class="dropdown-item" href="#" onclick="adicionarAoCalendario('outlook', '${c.medico || 'N/A'}', '${c.especialidade || 'N/A'}', '${c.local || 'N/A'}', ${timestampData}, '${notasSeguras}'); return false;"><i class="bi bi-microsoft text-info me-2"></i>Outlook</a></li>
                                <li><a class="dropdown-item" href="#" onclick="adicionarAoCalendario('yahoo', '${c.medico || 'N/A'}', '${c.especialidade || 'N/A'}', '${c.local || 'N/A'}', ${timestampData}, '${notasSeguras}'); return false;"><i class="bi bi-yahoo text-primary me-2"></i>Yahoo</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="adicionarAoCalendario('ics', '${c.medico || 'N/A'}', '${c.especialidade || 'N/A'}', '${c.local || 'N/A'}', ${timestampData}, '${notasSeguras}'); return false;"><i class="bi bi-apple text-secondary me-2"></i>Apple / Outros</a></li>
                            </ul>
                        </div>
                        
                        <div class="dropdown">
                            <button class="btn btn-light btn-sm border" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                <li><a class="dropdown-item" href="#" onclick="verNotas(${c.id}); return false;"><i class="bi bi-eye text-primary me-2"></i>Ver Notas</a></li>
                                <li><a class="dropdown-item" href="#" onclick="abrirModalEditar(${c.id}); return false;"><i class="bi bi-pencil text-warning me-2"></i>Editar</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="eliminarConsultaUnica(${c.id}); return false;"><i class="bi bi-trash text-danger me-2"></i>Eliminar Registo</a></li>
                            </ul>
                        </div>

                    </div>
                </td>
            </tr>
        `;
    });
    
    mostrarAcoesMassa();

    // 4. CHAMA O CÓDIGO VISUAL
    renderizarControlosPaginacao(totalPaginas);
}

// 3. ADICIONAR UNIDADE / MÉDICO (MODAIS)

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

async function adicionarMedico() {
    const nome = document.getElementById('inputNomeMedico').value;
    const especialidade = document.getElementById('inputEspMedico').value;
    
    // Captura todos os checkboxes assinalados com visto
    const checkboxesMarcados = document.querySelectorAll('.uni-checkbox:checked');
    const unidadesSelecionadas = Array.from(checkboxesMarcados).map(cb => cb.value);

    if (!nome || !especialidade || unidadesSelecionadas.length === 0) {
        return Swal.fire('Aviso', 'Preencha todos os campos e selecione pelo menos uma unidade!', 'warning');
    }

    try {
        const res = await fetch('/api/consultas/medicos', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nome, especialidade, unidades: unidadesSelecionadas })
        });
        
        if (res.ok) {
            Swal.fire('Sucesso', 'Médico adicionado com as suas unidades!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalNovoMedico')).hide();
            
            // Limpeza e reset do formulário
            document.getElementById('inputNomeMedico').value = '';
            document.getElementById('inputEspMedico').value = '';
            
            // Desmarca todos os checkboxes e faz reset ao texto do botão
            document.querySelectorAll('.uni-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('btnUnidadesDropdown').textContent = 'Selecione as unidades...';
            
            inicializarFormulario();
        } else {
            Swal.fire('Erro', 'Não foi possível adicionar o médico.', 'error');
        }
    } catch (e) { console.error(e); }
}

// 4. FUNÇÕES DE ELIMINAÇÃO (MASSA E ÚNICA)

function toggleTodos(source) {
    const checkboxes = document.querySelectorAll('.check-item');
    checkboxes.forEach(cb => cb.checked = source.checked);
    mostrarAcoesMassa();
}

function mostrarAcoesMassa() {
    const checkboxes = document.querySelectorAll('.check-item:checked');
    const acoesMassa = document.getElementById('acoesMassa');
    if (acoesMassa) {
        if (checkboxes.length > 0) {
            acoesMassa.classList.remove('d-none');
        } else {
            acoesMassa.classList.add('d-none');
            const checkAll = document.getElementById('checkAll');
            if(checkAll) checkAll.checked = false;
        }
    }
}

async function eliminarSelecionados() {
    const checkboxes = document.querySelectorAll('.check-item:checked');
    const ids = Array.from(checkboxes).map(cb => cb.value);
    if (ids.length === 0) return;

    const confirmacao = await Swal.fire({
        title: 'Tem a certeza?', text: `Vai eliminar ${ids.length} consulta(s).`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Sim, eliminar!', cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const res = await fetch('/api/consultas/massa', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })
            });
            if (res.ok) {
                Swal.fire('Eliminado!', '', 'success');
                carregarHistorico();
                const checkAll = document.getElementById('checkAll');
                if(checkAll) checkAll.checked = false;
            }
        } catch (e) { console.error(e); }
    }
}

async function eliminarConsultaUnica(id) {
    const confirmacao = await Swal.fire({
        title: 'Tem a certeza?', 
        text: 'Vai eliminar esta consulta permanentemente.', 
        icon: 'warning',
        showCancelButton: true, 
        confirmButtonColor: '#dc3545', 
        confirmButtonText: 'Sim, eliminar!', 
        cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
        try {
            const res = await fetch('/api/consultas/massa', {
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ids: [id] }) 
            });
            
            if (res.ok) {
                Swal.fire('Eliminado!', 'A consulta foi apagada.', 'success');
                carregarHistorico();
            }
        } catch (e) { console.error(e); }
    }
}

// 5. VER E EDITAR CONSULTAS

function verNotas(id) {
    const consulta = consultasGlobais.find(c => c.id === id);
    if (consulta) {
        const textoNotas = consulta.notas ? consulta.notas : 'Não foram registadas notas para esta consulta.';
        
        Swal.fire({
            title: 'Notas Médicas',
            text: textoNotas,
            icon: 'info',
            confirmButtonColor: '#0d6efd'
        });
    }
}

function abrirModalEditar(id) {
    const consulta = consultasGlobais.find(c => c.id === id);
    if (consulta) {
        document.getElementById('editConsultaId').value = consulta.id;
        
        // Formatar data para o input datetime-local (YYYY-MM-DDTHH:MM)
        const dataFormatadaParaInput = consulta.data_hora.substring(0, 16); 
        document.getElementById('editDataHora').value = dataFormatadaParaInput;
        
        document.getElementById('editNotas').value = consulta.notas || '';

        const modal = new bootstrap.Modal(document.getElementById('modalEditarConsulta'));
        modal.show();
    }
}

async function guardarEdicao() {
    const id = document.getElementById('editConsultaId').value;
    const data_hora = document.getElementById('editDataHora').value;
    const notas = document.getElementById('editNotas').value;

    try {
        const res = await fetch(`/api/consultas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data_hora, notas })
        });

        if (res.ok) {
            Swal.fire('Sucesso', 'A consulta foi atualizada!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarConsulta')).hide();
            carregarHistorico();
        } else {
            Swal.fire('Erro', 'Não foi possível atualizar a consulta.', 'error');
        }
    } catch (erro) {
        console.error('Erro ao editar:', erro);
    }
}

// FUNÇÃO MULTI-CALENDÁRIO (WEB LINKS + ICS)

function adicionarAoCalendario(tipo, medico, especialidade, unidade, timestamp, notas) {
    const dataInicio = new Date(Number(timestamp));
    const dataFim = new Date(dataInicio.getTime() + (60 * 60 * 1000)); // +1 hora de duração

    const titulo = `Consulta de ${especialidade} com ${medico}`;
    const local = unidade;
    const detalhes = notas || 'Registo feito através do SaúdeDigital.';

    if (tipo === 'google') {
        const formatarParaGoogle = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const datas = `${formatarParaGoogle(dataInicio)}/${formatarParaGoogle(dataFim)}`;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${datas}&details=${encodeURIComponent(detalhes)}&location=${encodeURIComponent(local)}`;
        window.open(url, '_blank');
    } 
    else if (tipo === 'outlook') {
        const url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(titulo)}&startdt=${dataInicio.toISOString()}&enddt=${dataFim.toISOString()}&body=${encodeURIComponent(detalhes)}&location=${encodeURIComponent(local)}`;
        window.open(url, '_blank');
    }
    else if (tipo === 'yahoo') {
        const formatarParaYahoo = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const url = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(titulo)}&st=${formatarParaYahoo(dataInicio)}&et=${formatarParaYahoo(dataFim)}&desc=${encodeURIComponent(detalhes)}&in_loc=${encodeURIComponent(local)}`;
        window.open(url, '_blank');
    }
    else if (tipo === 'ics') {
        // Fallback obrigatório para Aplicações de Telemóvel / Apple Calendar
        const formatarICS = (d) => d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0') + 'T' + d.getHours().toString().padStart(2, '0') + d.getMinutes().toString().padStart(2, '0') + d.getSeconds().toString().padStart(2, '0');
        
        const conteudoICS = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SaudeDigital//Consultas//PT\r\nBEGIN:VEVENT\r\nSUMMARY:${titulo}\r\nDTSTART:${formatarICS(dataInicio)}\r\nDTEND:${formatarICS(dataFim)}\r\nLOCATION:${local}\r\nDESCRIPTION:${detalhes}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Lembrete de Consulta\r\nTRIGGER:-PT24H\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
        
        const blob = new Blob([conteudoICS], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `Consulta_${especialidade.replace(/\s+/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// CONTROLOS DE PAGINAÇÃO 

function renderizarControlosPaginacao(totalPaginas) {
    const container = document.getElementById("paginacaoContainer");
    if (!container) return;

    // Se só houver 1 página, não precisa mostrar os botões
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
    if (num < 1) return;
    paginaAtual = num;
    renderizarTabela(); // Volta a desenhar a tabela mas com a nova página!
}

// Função auxiliar para atualizar o texto do botão do Dropdown Múltiplo
function atualizarTextoBotaoDropdown() {
    const marcados = document.querySelectorAll('.uni-checkbox:checked').length;
    const botao = document.getElementById('btnUnidadesDropdown');
    
    if (marcados === 0) {
        botao.textContent = 'Selecione as unidades...';
    } else if (marcados === 1) {
        botao.textContent = '1 unidade selecionada';
    } else {
        botao.textContent = `${marcados} unidades selecionadas`;
    }
}