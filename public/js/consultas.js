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
let abaAtual = 'futuras'; // Define que a aba principal a abrir é a das Próximas consultas

// 0. CARREGAR LISTAS DO MODAL (NOVO MÉDICO)

async function carregarListasModalMedico() {
    try {
        const resU = await fetch('/api/consultas/unidades');
        const unidades = await resU.json();
        const selectUni = document.getElementById('inputUniMedico');
        selectUni.innerHTML = '<option value="" selected disabled>Selecione a unidade...</option>';
        unidades.forEach(u => selectUni.innerHTML += `<option value="${u.id_unidade}">${u.nome}</option>`);

        const resE = await fetch('/api/consultas/todas-especialidades');
        const especialidades = await resE.json();
        const selectEsp = document.getElementById('inputEspMedico');
        selectEsp.innerHTML = '<option value="" selected disabled>Selecione a especialidade...</option>';
        especialidades.forEach(e => selectEsp.innerHTML += `<option value="${e.id_especialidade}">${e.nome}</option>`);
    } catch (erro) { console.error('Erro a carregar listas do modal:', erro); }
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

    // Filtra as consultas com base na data e na aba selecionada
    const consultasFiltradas = consultasGlobais.filter(c => {
        const dataConsulta = new Date(c.data_hora);
        if (abaAtual === 'futuras') {
            return dataConsulta >= dataDeHoje;
        } else {
            return dataConsulta < dataDeHoje;
        }
    });

    if (consultasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma consulta encontrada nesta aba.</td></tr>`;
        return;
    }

    consultasFiltradas.forEach(c => {
        const dataObj = new Date(c.data_hora);
        const dataFormatada = dataObj.toLocaleDateString('pt-PT') + ' às ' + dataObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
        
        const corTexto = abaAtual === 'anteriores' ? 'text-muted' : 'text-dark';

        tbody.innerHTML += `
            <tr class="${corTexto}">
                <td><input type="checkbox" class="form-check-input check-item border-secondary" value="${c.id}" onclick="mostrarAcoesMassa()"></td>
                <td><strong>${c.especialidade || 'N/A'}</strong></td>
                <td>${dataFormatada}</td>
                <td>${c.medico || 'N/A'}</td>
                <td>${c.local || 'N/A'}</td>
                <td class="text-end">
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
                </td>
            </tr>
        `;
    });
    mostrarAcoesMassa();
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
    const unidade = document.getElementById('inputUniMedico').value;

    if (!nome || !especialidade || !unidade) {
        return Swal.fire('Aviso', 'Preencha todos os campos do médico!', 'warning');
    }

    try {
        const res = await fetch('/api/consultas/medicos', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nome, especialidade, unidade })
        });
        
        if (res.ok) {
            Swal.fire('Sucesso', 'Médico adicionado!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalNovoMedico')).hide();
            
            document.getElementById('inputNomeMedico').value = '';
            document.getElementById('inputEspMedico').value = '';
            document.getElementById('inputUniMedico').value = '';
            
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