
function _temaAtivo() {
    return document.body.classList.contains('dark-mode');
}
function _aplicarTema(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const btn = document.getElementById('btn-darkmode');
    if (btn) { btn.innerHTML = isDark ? '☼' : '☾'; btn.title = isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'; }
}

function _formatarDataHora(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d)) return isoStr;
    const dd   = String(d.getDate()).padStart(2,'0');
    const mm   = String(d.getMonth()+1).padStart(2,'0');
    const hh   = String(d.getHours()).padStart(2,'0');
    const mi   = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}
function _dtLocalAgora() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}
function _inputParaDate(v) { return v ? new Date(v) : null; }

/*
 * A partir desta versão, cada movimentação passa a ser gravada já vinculada
 * ao ID do período Sem SISPLAN vigente (campo `periodoId`), em vez de depender
 * apenas da comparação de datas. Isso é o que garante que, ao trocar de
 * período (encerrar um e abrir/retomar outro), o sistema nunca mais misture
 * lançamentos de um período com o de outro.
 *
 * As funções abaixo centralizam a leitura/gravação dessas chaves de sessão.
 * Sempre que uma tela deixar o usuário "dentro" de um período (novo período,
 * continuar turno, troca de operador), ela DEVE chamar _definirPeriodoSessao.
 * Sempre que o período é encerrado/fechado, ela DEVE chamar _limparPeriodoSessao.
 */
function _definirPeriodoSessao(periodo) {
    if (!periodo) return;
    sessionStorage.setItem('sisplan_periodo_id', String(periodo.id));
    sessionStorage.setItem('sisplan_periodo_inicio', periodo.dataInicio);
}
function _limparPeriodoSessao() {
    sessionStorage.removeItem('sisplan_periodo_id');
    sessionStorage.removeItem('sisplan_periodo_inicio');
}
window._periodoIdSessaoAtual = function () {
    const v = sessionStorage.getItem('sisplan_periodo_id');
    return v ? Number(v) : null;
};

async function _verificarSobreposicao(dataInicioNova, idIgnorar) {
    const todos = await db.contingencias.toArray();
    for (const c of todos) {
        if (idIgnorar && c.id === idIgnorar) continue;
        const inicioExist = new Date(c.dataInicio);
        const fimExist    = c.dataFim ? new Date(c.dataFim) : new Date();
        
        if (dataInicioNova >= inicioExist && dataInicioNova <= fimExist) {
            return `Conflito com período existente:\nInício: ${_formatarDataHora(c.dataInicio)} — Fim: ${c.dataFim ? _formatarDataHora(c.dataFim) : 'Em aberto'}`;
        }
    }
    return null;
}

function _buildDropdown(ddId, hiddenId, placeholder, lista) {
    return `
    <div class="cont-dropdown" id="${ddId}">
        <button type="button" class="cont-dd-trigger" onclick="toggleDropdown('${ddId}')">
            <span class="cont-dd-texto" id="${ddId}-texto">${placeholder}</span>
            <svg class="cont-dd-seta" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M6 8L1 3h10z"/></svg>
        </button>
        <div class="cont-dd-lista" id="${ddId}-lista">
            <div class="cont-dd-item cont-dd-placeholder" onclick="selecionarDropdown('${ddId}','${hiddenId}','','${placeholder}')">${placeholder}</div>
            ${lista.map(o => `<div class="cont-dd-item" onclick="selecionarDropdown('${ddId}','${hiddenId}','${o}','${o}')">${o}</div>`).join('')}
        </div>
        <input type="hidden" id="${hiddenId}" value="">
    </div>`;
}

async function _renderizarListaPeriodos() {
    const container = document.getElementById('cont-lista-periodos');
    if (!container) return;
    const registros = await db.contingencias.orderBy('dataInicio').reverse().toArray();
    window._cacheContingencias = registros; 
    if (registros.length === 0) {
        container.innerHTML = `<div class="cont-lista-vazia">Nenhum período registrado ainda.</div>`;
        return;
    }
    container.innerHTML = registros.map(c => {
        const aberto = !c.dataFim;
        const trocasHtml = c.trocas && c.trocas.length
            ? `<div class="cont-periodo-trocas">
                ${c.trocas.map(t => `<span>↪ ${t.operadorbal} <em>${_formatarDataHora(t.data)}</em></span>`).join('')}
               </div>`
            : '';
        return `
        <div class="cont-periodo-item ${aberto ? 'cont-periodo-aberto' : 'cont-periodo-fechado'}"
             style="cursor:pointer;" title="Clique para ver as movimentações deste período"
             onclick="window.abrirDetalhePeriodo(${c.id})">
            <div class="cont-periodo-status" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span>${aberto ? '● Em aberto' : '✔ Encerrado'}</span>
                <span style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                    <span style="font-size:11px;opacity:.7;white-space:nowrap;">⌕ ver dados</span>
                    <button type="button" title="Excluir este período (requer senha)"
                            onclick="event.stopPropagation(); window.excluirPeriodoSemSisplan(${c.id});"
                            style="background:none;border:none;cursor:pointer;font-size:13px;opacity:.55;line-height:1;padding:2px;">🗑</button>
                </span>
            </div>
            <div class="cont-periodo-datas">
                <span><strong>Início:</strong> ${_formatarDataHora(c.dataInicio)}</span>
                <span><strong>Fim:</strong> ${c.dataFim ? _formatarDataHora(c.dataFim) : '—'}</span>
            </div>
            <div class="cont-periodo-info">
                <span><strong>operadorbal:</strong> ${c.operadorbal || '—'}</span>
                <span><strong>Coord.:</strong> ${c.coordenador || '—'}</span>
            </div>
            ${trocasHtml}
            ${c.motivo && c.motivo !== 'Não informado' ? `<div class="cont-periodo-motivo">${c.motivo}</div>` : ''}
        </div>`;
    }).join('');
}

async function verificarTravaSisplan() {
    const liberado    = sessionStorage.getItem('sisplan_liberado_sessao');
    const coordenador = sessionStorage.getItem('sisplan_coordenador_sessao') || '';
    if (liberado === 'true') {
        window.coordenadorSessaoAtual = coordenador;
        if (typeof verificarPrimeiroAcesso === 'function') setTimeout(verificarPrimeiroAcesso, 300);
        return;
    }

    let periodoAberto = null;

    if (typeof window.turno_lerPeriodoCompartilhado === 'function') {
        try { periodoAberto = await window.turno_lerPeriodoCompartilhado(); } catch(e) {}
    }

    if (periodoAberto) {
        try {
            const abertas = await db.contingencias.filter(c => !c.dataFim).toArray();
            if (abertas.length === 0) {
                
                const { id: _id, ...semId } = periodoAberto;
                const novoId = await db.contingencias.add({ ...semId, _importadoDeArquivo: true });
                periodoAberto = { ...periodoAberto, id: novoId };
                await db.logs.add({
                    data: new Date().toISOString(),
                    operadorbal: periodoAberto.operadorbal || '-',
                    acao: 'Período sem SISPLAN sincronizado do arquivo compartilhado (outro perfil/turno).',
                    placa: '-'
                });
            } else {
                periodoAberto = abertas[0]; 
            }
        } catch(e) {}
    } else {
        
        try {
            const abertas = await db.contingencias.filter(c => !c.dataFim).toArray();
            if (abertas.length > 0) periodoAberto = abertas[0];
        } catch(e) {}
    }

    if (periodoAberto) {
        exibirModalPeriodoAberto(periodoAberto);
    } else {
        exibirModalContingencia();
    }
}

async function exibirModalPeriodoAberto(periodo) {
    document.getElementById('trava-sisplan-modal')?.remove();
    window._periodoAbertoAtual = periodo;

    const ops    = [...new Set(window.listaoperadoresbal    || [])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const coords = [...new Set(window.listaCoordenadores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const dtMax  = _dtLocalAgora();
    const operadorbalAtual = (periodo && periodo.operadorbal) ? periodo.operadorbal.trim() : '';
    const opsTroca = ops.filter(o => o.trim() !== operadorbalAtual);
    const modal = document.createElement('div');
    modal.id        = 'trava-sisplan-modal';
    modal.className = 'cont-overlay';

    modal.innerHTML = `
        <div class="cont-card cont-card-wide">

            <div class="cont-header-logo">
                <img src="assets/icone-balanca.png" class="cont-logo-img" alt="Balança Portuária">
                <div class="cont-header-info">
                    <div class="cont-header-titulo">Balança Portuária</div>
                    <div class="cont-header-sub">Porto do Recife S.A.</div>
                </div>
                <button class="cont-btn-tema" onclick="window.alternarTemaPeloModal()" title="Alternar Modo Escuro">
                    <span id="cont-icone-tema">${_temaAtivo() ? '☼' : '☾'}</span>
                </button>
            </div>

            <div class="cont-divisor"></div>

            <div class="cont-periodo-status">
                <div class="cont-status-dot"></div>
                <div class="cont-status-info">
                    <span class="cont-status-label">Período sem SISPLAN em andamento</span>
                    <span class="cont-status-detalhe">Iniciado em ${_formatarDataHora(periodo.dataInicio)} · operadorbal: ${periodo.operadorbal || periodo.coordenador || '—'}</span>
                </div>
            </div>

            <div class="cont-layout-duplo">

                <div class="cont-coluna-lista">
                    <div class="cont-secao-titulo">Períodos Sem SISPLAN</div>
                    <div id="cont-lista-periodos" class="cont-lista-scroll">
                        <div class="cont-lista-vazia">Carregando...</div>
                    </div>
                </div>

                <div class="cont-coluna-form">
                    <div class="cont-secao-titulo">O que deseja fazer?</div>

                    <div class="cont-opcao-card" id="opcao-continuar-card">
                        <button class="cont-opcao-header" onclick="_toggleOpcao('continuar')">
                            <span class="cont-opcao-titulo">Continuar Turno Atual</span>
                            <span class="cont-opcao-seta" id="seta-continuar">›</span>
                        </button>
                        <div class="cont-opcao-corpo" id="corpo-continuar">
                            <p class="cont-opcao-desc">O SISPLAN ainda não voltou. A autorização do coordenador do período é mantida.</p>
                            <button class="cont-btn-confirmar" onclick="window.continuarTurnoAtual(window._periodoAbertoAtual)">
                                Continuar Lançamentos
                            </button>
                        </div>
                    </div>

                    <div class="cont-opcao-card" id="opcao-troca-card">
                        <button class="cont-opcao-header" onclick="_toggleOpcao('troca')">
                            <span class="cont-opcao-titulo">Assumir Turno — Troca de operadorbal</span>
                            <span class="cont-opcao-seta" id="seta-troca">›</span>
                        </button>
                        <div class="cont-opcao-corpo" id="corpo-troca" style="display:none">
                            <p class="cont-opcao-desc">Informe quem está assumindo o plantão.</p>
                            <div class="cont-campo">
                                <label class="cont-label">Novo operador da Balança</label>
                                ${_buildDropdown('dd-novo-operadorbal','novo-operadorbal','-- Selecione o operadorbal --', opsTroca)}
                            </div>
                            <button class="cont-btn-confirmar" onclick="window.trocaroperadorbalTurno()">
                                Registrar Troca e Continuar
                            </button>
                        </div>
                    </div>

                    <div class="cont-opcao-card cont-opcao-card-destaque" id="opcao-encerrar-card">
                        <button class="cont-opcao-header" onclick="_toggleOpcao('encerrar')">
                            <span class="cont-opcao-titulo">SISPLAN Restabelecido — Encerrar Período</span>
                            <span class="cont-opcao-seta" id="seta-encerrar">›</span>
                        </button>
                        <div class="cont-opcao-corpo" id="corpo-encerrar" style="display:none">
                            <p class="cont-opcao-desc">Informe quando o SISPLAN foi reestabelecido para registrar o fim exato do período.</p>
                            <div class="cont-campo">
                                <label class="cont-label">Data e Hora em que o SISPLAN voltou</label>
                                <input type="datetime-local" id="cont-dt-fim" class="cont-input-dt" value="${dtMax}" max="${dtMax}">
                                <span class="cont-hint">Não pode ser antes de ${_formatarDataHora(periodo.dataInicio)} nem no futuro.</span>
                            </div>
                            <div class="cont-campo">
                                <label class="cont-label">operadorbal encerrando</label>
                                ${_buildDropdown('dd-enc-operadorbal','enc-operadorbal','-- Selecione o operadorbal --', ops)}
                            </div>
                            <button class="cont-btn-encerrar" onclick="window.encerrarPeriodoSisplan('${periodo.id}', '${periodo.dataInicio}')">
                                Confirmar Encerramento
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>`;

    document.body.appendChild(modal);
    document.addEventListener('click', _fecharDropdownsFora);
    await _renderizarListaPeriodos();
}

window._toggleOpcao = function(qual) {
    ['continuar','troca','encerrar'].forEach(id => {
        const corpo = document.getElementById(`corpo-${id}`);
        const seta  = document.getElementById(`seta-${id}`);
        const card  = document.getElementById(`opcao-${id}-card`);
        const abrir = id === qual;
        if (corpo) corpo.style.display = abrir ? 'block' : 'none';
        if (seta)  seta.textContent    = abrir ? '⌄' : '›';
        if (card)  card.classList.toggle('cont-opcao-ativa', abrir);
    });
};

window.continuarTurnoAtual = function(periodo) {
    
    const coord    = (periodo && periodo.coordenador) || sessionStorage.getItem('sisplan_coordenador_sessao') || '';
    const operadorbal = (periodo && periodo.operadorbal)    || sessionStorage.getItem('sisplan_operadorbal_sessao')    || '';
    document.removeEventListener('click', _fecharDropdownsFora);
    sessionStorage.setItem('sisplan_liberado_sessao',    'true');
    sessionStorage.setItem('sisplan_coordenador_sessao', coord);
    sessionStorage.setItem('sisplan_operadorbal_sessao',    operadorbal);
    _definirPeriodoSessao(periodo);
    document.getElementById('trava-sisplan-modal')?.remove();
    window.coordenadorSessaoAtual = coord;
    location.reload();
};

window.trocaroperadorbalTurno = async function() {
    const novoOp = document.getElementById('novo-operadorbal')?.value || '';

    const novoCoord = window._periodoAbertoAtual?.coordenador || '';

    if (!novoOp) {
        abrirModalSistema({ titulo:'Atenção', mensagem:'Selecione o operadorbal que está assumindo.', botoes:[{texto:'Entendido',estilo:'info',acao:()=>{}}] });
        return;
    }

    const operadorbalAtual = (window._periodoAbertoAtual?.operadorbal || '').trim();
    if (novoOp.trim() === operadorbalAtual) {
        abrirModalSistema({ titulo:'operadorbal Inválido', mensagem:'O operadorbal selecionado é o mesmo que abriu o turno. Para continuar com o mesmo operadorbal, use "Continuar Turno Atual".', botoes:[{texto:'Entendido',estilo:'info',acao:()=>{}}] });
        return;
    }

    let periodoAtualizado = window._periodoAbertoAtual;
    try {
        const abertas = await db.contingencias.filter(c => !c.dataFim).toArray();
        if (abertas.length > 0) {
            const periodo = abertas[0];
            const trocas  = periodo.trocas || [];
            trocas.push({ operadorbal: novoOp, coordenador: novoCoord, data: new Date().toISOString() });
            await db.contingencias.update(periodo.id, { trocas, operadorbal: novoOp, coordenador: novoCoord || periodo.coordenador });

            await db.logs.add({
                data:     new Date().toISOString(),
                operadorbal: novoOp,
                acao:     `Troca de operadorbal em Contingência — Assumiu: ${novoOp} | Coord: ${novoCoord || periodo.coordenador}`,
                placa:    '-'
            });

            periodoAtualizado = await db.contingencias.get(periodo.id) || periodo;

            if (typeof window.turno_atualizarPeriodo === 'function') {
                if (periodoAtualizado) await window.turno_atualizarPeriodo(periodoAtualizado);
            }
        }
    } catch(e) { console.warn('Erro ao registrar troca:', e); }

    document.removeEventListener('click', _fecharDropdownsFora);
    sessionStorage.setItem('sisplan_liberado_sessao',    'true');
    sessionStorage.setItem('sisplan_coordenador_sessao', novoCoord || '');
    sessionStorage.setItem('sisplan_operadorbal_sessao',    novoOp);
    if (periodoAtualizado) _definirPeriodoSessao(periodoAtualizado);
    document.getElementById('trava-sisplan-modal')?.remove();
    window.coordenadorSessaoAtual = novoCoord;
    location.reload();
};

window.encerrarPeriodoSisplan = async function(periodoId, dataInicioPeriodo) {
    const dtFimVal  = document.getElementById('cont-dt-fim')?.value || '';
    const encOp     = document.getElementById('enc-operadorbal')?.value || '';

    if (!dtFimVal) {
        abrirModalSistema({ titulo:'Atenção', mensagem:'Informe a data e hora em que o SISPLAN voltou.', botoes:[{texto:'Entendido',estilo:'info',acao:()=>{}}] });
        return;
    }

    const dataFimDate   = new Date(dtFimVal);
    const dataInicioRef = new Date(dataInicioPeriodo);
    const agora         = new Date();

    if (dataFimDate > agora) {
        abrirModalSistema({ titulo:'Data Inválida', mensagem:'A data/hora de fim não pode ser no futuro.', botoes:[{texto:'Corrigir',estilo:'info',acao:()=>{}}] });
        return;
    }
    if (dataFimDate < dataInicioRef) {
        abrirModalSistema({ titulo:'Data Inválida', mensagem:`A data/hora de fim não pode ser anterior ao início do período (${_formatarDataHora(dataInicioPeriodo)}).`, botoes:[{texto:'Corrigir',estilo:'info',acao:()=>{}}] });
        return;
    }

    try {
        const idNum = parseInt(periodoId, 10) || periodoId;
        await db.contingencias.update(idNum, {
            dataFim:    dataFimDate.toISOString(),
            horarioFim: `${String(dataFimDate.getHours()).padStart(2,'0')}:${String(dataFimDate.getMinutes()).padStart(2,'0')}`
        });
        await db.logs.add({
            data:     agora.toISOString(),
            operadorbal: encOp || '-',
            acao:     `Período Sem SISPLAN Encerrado — SISPLAN voltou em: ${_formatarDataHora(dataFimDate.toISOString())} | Registrado por: ${encOp || '-'}`,
            placa:    '-'
        });
        
        if (typeof window.turno_encerrarPeriodo === 'function') {
            await window.turno_encerrarPeriodo();
        }
    } catch(e) { console.warn('Erro ao encerrar período:', e); }

    document.removeEventListener('click', _fecharDropdownsFora);

    sessionStorage.removeItem('sisplan_liberado_sessao');
    sessionStorage.removeItem('sisplan_coordenador_sessao');
    sessionStorage.removeItem('sisplan_operadorbal_sessao');
    _limparPeriodoSessao();
    document.getElementById('trava-sisplan-modal')?.remove();

    abrirModalSistema({
        titulo:   '✔ SISPLAN Reestabelecido',
        mensagem: `Período encerrado com sucesso.\nEste sistema deve ser usado apenas em contingência. O que deseja fazer agora?`,
        botoes:   [
            {
                texto:  'Fechar o Sistema',
                estilo: 'danger',
                acao:   () => { if (typeof window.fecharAbaSistema === 'function') window.fecharAbaSistema(); }
            },
            {
                texto:  'Registrar Novo Período Sem SISPLAN',
                estilo: 'success',
                acao:   () => { if (typeof exibirModalContingencia === 'function') exibirModalContingencia(); }
            }
        ]
    });
};

async function exibirModalContingencia() {
    document.getElementById('trava-sisplan-modal')?.remove();

    const ops    = [...new Set(window.listaoperadoresbal    || [])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const coords = [...new Set(window.listaCoordenadores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    const dtNow  = _dtLocalAgora();

    const modal = document.createElement('div');
    modal.id        = 'trava-sisplan-modal';
    modal.className = 'cont-overlay';

    modal.innerHTML = `
        <div class="cont-card cont-card-wide">

            <div class="cont-header-logo">
                <img src="assets/icone-balanca.png" class="cont-logo-img" alt="Balança Portuária">
                <div class="cont-header-info">
                    <div class="cont-header-titulo">Balança Portuária</div>
                    <div class="cont-header-sub">Porto do Recife S.A. — Modo Contingência</div>
                </div>
                <button class="cont-btn-tema" onclick="window.alternarTemaPeloModal()" title="Alternar Modo Escuro">
                    <span id="cont-icone-tema">${_temaAtivo() ? '☼' : '☾'}</span>
                </button>
            </div>

            <div class="cont-divisor"></div>

            <div class="cont-aviso">
                <span class="cont-aviso-titulo">Atenção</span>
                <p>UTILIZAR ESTE SISTEMA APENAS EM CASO DE FALTA DE SISPLAN</p>
                Os registros realizados aqui <strong>não isentam</strong> a obrigatoriedade
                de lançamento integral no SISPLAN após o restabelecimento do serviço.
            </div>

            <div class="cont-layout-duplo">

                <div class="cont-coluna-lista">
                    <div class="cont-secao-titulo">Períodos Anteriores</div>
                    <div id="cont-lista-periodos" class="cont-lista-scroll">
                        <div class="cont-lista-vazia">Carregando...</div>
                    </div>
                </div>

                <div class="cont-coluna-form">
                    <div class="cont-secao-titulo">Nova Ausência do SISPLAN</div>

                    <div class="cont-campo">
                        <label class="cont-label">Data e Hora da Indisponibilidade</label>
                        <input type="datetime-local" id="cont-dt-inicio" class="cont-input-dt" value="${dtNow}" max="${dtNow}">
                        <span class="cont-hint">Preencha com a hora real em que o sistema ficou indisponível.</span>
                    </div>

                    <div class="cont-campo">
                        <label class="cont-label">operador da Balança</label>
                        <div class="input-row">
                            ${_buildDropdown('dd-operadorbal','cont-operadorbal','-- Selecione o operadorbal --', ops)}
                            <button type="button" class="btn-plus" title="Cadastrar novo operadorbal" onclick="window.cadastroRapidoContingencia('operadorbal')">+</button>
                        </div>
                    </div>

                    <div class="cont-campo">
                        <label class="cont-label">Coordenador que Autorizou o rigistro sem Sisplan</label>
                        <div class="input-row">
                            ${_buildDropdown('dd-coordenador','cont-coordenador','-- Selecione o Coordenador --', coords)}
                            <button type="button" class="btn-plus" title="Cadastrar novo coordenador" onclick="window.cadastroRapidoContingencia('coordenador')">+</button>
                        </div>
                    </div>

                    <div class="cont-campo">
                        <label class="cont-label">Motivo da Indisponibilidade</label>
                        <textarea id="cont-motivo" placeholder="Descreva o motivo (queda de sistema, manutenção, etc.)" class="cont-textarea"></textarea>
                    </div>

                    <button class="cont-btn-confirmar" onclick="window.salvarLiberacaoContingencia()">
                        Registrar e Iniciar Lançamentos
                    </button>
                </div>

            </div>
        </div>`;

    document.body.appendChild(modal);
    document.addEventListener('click', _fecharDropdownsFora);
    await _renderizarListaPeriodos();
}

window.toggleDropdown = function (id) {
    const aberto = document.getElementById(id)?.classList.contains('aberto');
    document.querySelectorAll('.cont-dropdown.aberto').forEach(el => el.classList.remove('aberto'));
    if (!aberto) document.getElementById(id)?.classList.add('aberto');
};

window.selecionarDropdown = function (ddId, hiddenId, valor, texto) {
    const hidden  = document.getElementById(hiddenId);
    const textoEl = document.getElementById(ddId + '-texto');
    if (hidden)  hidden.value        = valor;
    if (textoEl) textoEl.textContent = texto;
    if (textoEl) textoEl.classList.toggle('cont-dd-selecionado', valor !== '');
    document.getElementById(ddId)?.classList.remove('aberto');
};

function _fecharDropdownsFora(e) {
    if (!e.target.closest('.cont-dropdown')) {
        document.querySelectorAll('.cont-dropdown.aberto').forEach(el => el.classList.remove('aberto'));
    }
}

window.alternarTemaPeloModal = function () {
    const novo = !_temaAtivo();
    _aplicarTema(novo);
    sessionStorage.setItem('balanca_tema_escuro', novo ? 'true' : 'false');
    const icone = document.getElementById('cont-icone-tema');
    if (icone) icone.textContent = novo ? '☼' : '☾';
};

window.salvarLiberacaoContingencia = async function () {
    const coord       = document.getElementById('cont-coordenador')?.value  || '';
    const operadorbal    = document.getElementById('cont-operadorbal')?.value     || '';
    const motivo      = document.getElementById('cont-motivo')?.value.trim()|| 'Não informado';
    const dtInicioVal = document.getElementById('cont-dt-inicio')?.value    || '';

    if (!coord) {
        abrirModalSistema({ titulo:'Atenção', mensagem:'Selecione um coordenador antes de prosseguir.', botoes:[{texto:'Entendido',estilo:'info',acao:()=>{}}] });
        return;
    }
    if (!dtInicioVal) {
        abrirModalSistema({ titulo:'Atenção', mensagem:'Informe a data e hora em que o SISPLAN ficou indisponível.', botoes:[{texto:'Entendido',estilo:'info',acao:()=>{}}] });
        return;
    }

    const dataInicioDate = new Date(dtInicioVal);

    if (dataInicioDate > new Date()) {
        abrirModalSistema({ titulo:'Data Inválida', mensagem:'A data/hora de início não pode ser no futuro.', botoes:[{texto:'Corrigir',estilo:'info',acao:()=>{}}] });
        return;
    }

    const conflito = await _verificarSobreposicao(dataInicioDate, null);
    if (conflito) {
        abrirModalSistema({ titulo:'Sobreposição de Período', mensagem:`Não é possível registrar: o horário informado se sobrepõe a um registro existente.\n\n${conflito}`, botoes:[{texto:'Corrigir',estilo:'info',acao:()=>{}}] });
        return;
    }

    const agora = new Date();
    try {
        if (typeof db !== 'undefined') {
            const novoPeriodo = {
                dataInicio:    dataInicioDate.toISOString(),
                horarioInicio: `${String(dataInicioDate.getHours()).padStart(2,'0')}:${String(dataInicioDate.getMinutes()).padStart(2,'0')}`,
                coordenador:   coord,
                operadorbal:      operadorbal,
                motivo:        motivo,
                trocas:        [],
                vinculoPorId:  true 
            };
            const novoId = await db.contingencias.add(novoPeriodo);
            await db.logs.add({
                data:     agora.toISOString(),
                operadorbal: operadorbal || coord,
                acao:     `Início de Contingência — Queda em: ${_formatarDataHora(dataInicioDate.toISOString())} | Registrado em: ${_formatarDataHora(agora.toISOString())} | Coord: ${coord} | Motivo: ${motivo}`,
                placa:    '-'
            });
            
            if (typeof window.turno_abrirPeriodo === 'function') {
                await window.turno_abrirPeriodo({ ...novoPeriodo, id: novoId });
            }

            _definirPeriodoSessao({ ...novoPeriodo, id: novoId });
        }
    } catch(e) { console.warn('Erro ao salvar contingência:', e); }

    document.removeEventListener('click', _fecharDropdownsFora);
    sessionStorage.setItem('sisplan_liberado_sessao',    'true');
    sessionStorage.setItem('sisplan_coordenador_sessao', coord);
    sessionStorage.setItem('sisplan_operadorbal_sessao',    operadorbal);
    document.getElementById('trava-sisplan-modal')?.remove();
    window.coordenadorSessaoAtual = coord;
    location.reload();
};

window.iniciarObservadorTema = function () { console.log('Observador de tema ativo.'); };

window.fecharAbaSistema = function () {
    
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.confirmarFechamento) {
        window.electronAPI.confirmarFechamento();
    } else {
        
        try { window.close(); } catch(e) {}
    }
};

window.fecharPeriodoSisplan = async function () {
    const contingenciasAbertas = await db.contingencias.filter(c => !c.dataFim).toArray();
    if (contingenciasAbertas.length === 0) return;
    const agora = new Date();
    for (const c of contingenciasAbertas) {
        await db.contingencias.update(c.id, {
            dataFim:    agora.toISOString(),
            horarioFim: agora.toLocaleTimeString('pt-BR')
        });
    }
    const operadorbal = document.getElementById('operadorbalAtivo')?.value || '-';
    await db.logs.add({
        data: agora.toISOString(), operadorbal,
        acao: `Período Sem SISPLAN Encerrado — Operação manual finalizada. SISPLAN reestabelecido.`,
        placa: '-'
    });
    sessionStorage.removeItem('sisplan_liberado_sessao');
    sessionStorage.removeItem('sisplan_coordenador_sessao');
    sessionStorage.removeItem('sisplan_operadorbal_sessao');
    _limparPeriodoSessao();
};

window.exibirModalFechamento = async function () {
    let temPeriodoAberto = false;
    try {
        const abertas = await db.contingencias.filter(c => !c.dataFim).toArray();
        temPeriodoAberto = abertas.length > 0;
    } catch(e) {}

    const msgPeriodo = temPeriodoAberto
        ? `<div style="margin-top:10px;padding:10px 12px;background:rgba(37,99,235,0.10);border:1px solid var(--brand-blue);border-radius:6px;font-size:13px;color:var(--text-primary);">
               <strong style="color:var(--brand-blue);">⚠ Período sem SISPLAN ainda em aberto!</strong><br>
               Recomendado encerrar o período antes de fechar. Use a tela de contingência para registrar quando o SISPLAN voltou.
           </div>` : '';

    const overlay = document.createElement('div');
    overlay.id = 'modal-fechamento-sistema';
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;animation:fadeInOverlay 0.2s ease;`;
    overlay.innerHTML = `
        <div style="background:var(--card-background);border:1px solid var(--border-color);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);width:90%;max-width:480px;padding:24px;animation:fadeUp 0.22s ease both;font-family:var(--font-body);">
            <h3 style="margin:0 0 10px;font-size:16px;color:var(--text-primary);">⚿ Fechar Sistema</h3>
            <p style="margin:0 0 6px;font-size:13.5px;color:var(--text-primary);line-height:1.5;">Antes de sair, deseja salvar um backup dos dados desta sessão?</p>
            ${msgPeriodo}
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:18px;">
                ${temPeriodoAberto ? `<button onclick="window._fecharComBackupEPeriodo()" style="padding:10px 16px;border-radius:var(--radius-sm);border:none;background:var(--brand-blue-dark);color:#fff;font-weight:700;font-size:13px;font-family:var(--font-body);cursor:pointer;text-align:left;">✔ Salvar Backup + Encerrar Período Sem SISPLAN e Fechar</button>` : ''}
                <button onclick="window._fecharSomenteBackup()" style="padding:10px 16px;border-radius:var(--radius-sm);border:none;background:var(--brand-blue);color:#fff;font-weight:700;font-size:13px;font-family:var(--font-body);cursor:pointer;text-align:left;">▣ Salvar Backup e Fechar</button>
                <button onclick="window._fecharSemBackup()" style="padding:10px 16px;border-radius:var(--radius-sm);border:none;background:var(--fundo-botao);color:var(--texto-botao);font-weight:600;font-size:13px;font-family:var(--font-body);cursor:pointer;border:1px solid var(--borda-botao);text-align:left;">Fechar sem Salvar Backup</button>
                <button onclick="document.getElementById('modal-fechamento-sistema')?.remove()" style="padding:8px 16px;border-radius:var(--radius-sm);border:none;background:transparent;color:var(--text-muted);font-size:12px;font-family:var(--font-body);cursor:pointer;text-align:center;">← Cancelar (Continuar usando o sistema)</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

            window._fecharComBackupEPeriodo = async function () {
        document.getElementById('modal-fechamento-sistema')?.remove();
        await window.fecharPeriodoSisplan();
        if (typeof exportarBackupCompleto === 'function') {
            const ok = await exportarBackupCompleto();
            if (ok === false) return;   
        }
        window.fecharAbaSistema();   
    };

    window._fecharSomenteBackup = async function () {
        document.getElementById('modal-fechamento-sistema')?.remove();
        if (typeof exportarBackupCompleto === 'function') {
            const ok = await exportarBackupCompleto();
            if (ok === false) return;   
        }
        window.fecharAbaSistema();   
    };

    window._fecharSemBackup = function () {
        document.getElementById('modal-fechamento-sistema')?.remove();
        window.fecharAbaSistema();   
    };

};

function _parseDataFlex(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

async function _movimentacoesDoPeriodo(periodo) {
    let todas = [];
    try { todas = await db.movimentacoes.toArray(); } catch(e) {}

    
    const porId = todas.filter(m => m.periodoId === periodo.id);
    if (porId.length > 0 || periodo.vinculoPorId) {
        return porId.sort((a, b) => _parseDataFlex(a.dataEntrada) - _parseDataFlex(b.dataEntrada));
    }

    
    const ini = _parseDataFlex(periodo.dataInicio);
    const fim = periodo.dataFim ? _parseDataFlex(periodo.dataFim) : new Date();
    if (!ini) return [];
    return todas
        .filter(m => {
            if (m.periodoId) return false; 
            const dt = _parseDataFlex(m.dataEntrada);
            return dt && dt >= ini && dt <= fim;
        })
        .sort((a, b) => _parseDataFlex(a.dataEntrada) - _parseDataFlex(b.dataEntrada));
}

function _pesoNum(v) {
    if (!v) return 0;
    return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
}
function _fmtPeso(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) + ' kg';
}

window.abrirDetalhePeriodo = async function(periodoId) {
    const periodo = (window._cacheContingencias || []).find(c => c.id === periodoId)
                 || await db.contingencias.get(periodoId);
    if (!periodo) return;

    const movs = await _movimentacoesDoPeriodo(periodo);
    window._detalhePeriodoAtual = { periodo, movs };

    let totEnt = 0, totSai = 0;
    movs.forEach(m => { totEnt += _pesoNum(m.entrada); totSai += _pesoNum(m.saida); });
    const totLiq = totEnt - totSai;

    const linhas = movs.length ? movs.map(m => {
        const liq = _pesoNum(m.entrada) - _pesoNum(m.saida);
        const status = m.saidaVazia ? 'Saída Vazia' : (m.saida ? 'Concluído' : 'Em trânsito');
        return `<tr>
            <td>${_formatarDataHora(m.dataEntrada)}</td>
            <td>${m.sisplan || '—'}</td>
            <td>${m.placa || '—'}</td>
            <td>${m.embarcacao || '—'}</td>
            <td>${m.clientes || '—'}</td>
            <td>${m.mercadoria || '—'}</td>
            <td style="text-align:right">${m.entrada || '—'}</td>
            <td style="text-align:right">${m.saida || '—'}</td>
            <td style="text-align:right">${m.saida ? _fmtPeso(liq) : '—'}</td>
            <td>${status}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="10" style="text-align:center;padding:20px;opacity:.7;">Nenhuma movimentação neste período.</td></tr>`;

    const overlay = document.createElement('div');
    overlay.id = 'cont-detalhe-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
        <div style="background:var(--card-background,#fff);border-radius:10px;max-width:1100px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3);">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border-color,#e2e8f0);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h3 style="margin:0;font-size:16px;color:var(--text-primary,#0f172a);">▦ Movimentações do Período</h3>
                    <small style="color:var(--text-secondary,#64748b);">
                        ${_formatarDataHora(periodo.dataInicio)} → ${periodo.dataFim ? _formatarDataHora(periodo.dataFim) : 'Em aberto'}
                        &nbsp;|&nbsp; operadorbal: <strong>${periodo.operadorbal || '—'}</strong>
                        &nbsp;|&nbsp; Coord.: <strong>${periodo.coordenador || '—'}</strong>
                    </small>
                </div>
                <button onclick="document.getElementById('cont-detalhe-modal').remove()"
                        style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted,#64748b);">&times;</button>
            </div>

            <div style="padding:12px 20px;display:flex;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--border-color,#e2e8f0);">
                <div style="flex:1;min-width:120px;background:rgba(37,99,235,.08);padding:10px;border-radius:8px;">
                    <div style="font-size:11px;opacity:.7;">Movimentações</div>
                    <div style="font-size:18px;font-weight:700;">${movs.length}</div>
                </div>
                <div style="flex:1;min-width:120px;background:rgba(16,185,129,.08);padding:10px;border-radius:8px;">
                    <div style="font-size:11px;opacity:.7;">Total Entrada</div>
                    <div style="font-size:18px;font-weight:700;">${_fmtPeso(totEnt)}</div>
                </div>
                <div style="flex:1;min-width:120px;background:rgba(245,158,11,.08);padding:10px;border-radius:8px;">
                    <div style="font-size:11px;opacity:.7;">Total Saída</div>
                    <div style="font-size:18px;font-weight:700;">${_fmtPeso(totSai)}</div>
                </div>
                <div style="flex:1;min-width:120px;background:rgba(99,102,241,.08);padding:10px;border-radius:8px;">
                    <div style="font-size:11px;opacity:.7;">Líquido</div>
                    <div style="font-size:18px;font-weight:700;">${_fmtPeso(totLiq)}</div>
                </div>
            </div>

            <div style="overflow:auto;flex:1;padding:0 20px;">
                <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
                    <thead style="position:sticky;top:0;background:var(--card-background,#fff);">
                        <tr style="text-align:left;border-bottom:2px solid var(--border-color,#e2e8f0);">
                            <th style="padding:8px 6px;">Entrada</th><th>Sisplan</th><th>Placa</th>
                            <th>Navio</th><th>Cliente</th><th>Produto</th>
                            <th style="text-align:right">Peso Ent.</th><th style="text-align:right">Peso Saí.</th>
                            <th style="text-align:right">Líquido</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>

            <div style="padding:14px 20px;border-top:1px solid var(--border-color,#e2e8f0);display:flex;justify-content:space-between;gap:8px;">
                <button onclick="window.excluirPeriodoSemSisplan(${periodo.id})"
                        style="padding:9px 16px;border-radius:6px;border:1px solid #dc2626;background:transparent;color:#dc2626;font-weight:600;cursor:pointer;">🗑 Excluir Período</button>
                <div style="display:flex;gap:8px;">
                <button onclick="window.gerarRelatorioPeriodoPDF()"
                        style="padding:9px 16px;border-radius:6px;border:1px solid var(--borda-botao,#cbd5e1);background:var(--fundo-botao,#e2e8f0);font-weight:600;cursor:pointer;">▤ Relatório PDF</button>
                <button onclick="window.gerarRelatorioPeriodoCSV()"
                        style="padding:9px 16px;border-radius:6px;border:none;background:var(--excel-blue,#1140b0);color:#fff;font-weight:600;cursor:pointer;">▦ CSV (Excel)</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
};

window.gerarRelatorioPeriodoPDF = function() {
    const ctx = window._detalhePeriodoAtual;
    if (!ctx) return;
    const { periodo, movs } = ctx;

    if (!movs.length) {
        document.getElementById('cont-detalhe-modal')?.remove(); 
        abrirModalSistema({
            titulo: 'Relatório Vazio',
            mensagem: 'Nenhuma movimentação encontrada neste período.',
            botoes: [{ texto: 'OK', estilo: 'info', acao: () => {} }]
        });
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('BALANÇA PORTUÁRIA - RELATÓRIO DE MOVIMENTAÇÃO DE CARGA - SEM SISPLAN', 14, 15);
    doc.setFontSize(9);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 22);
    doc.text(
        'Período: ' + _formatarDataHora(periodo.dataInicio) +
        ' até ' + (periodo.dataFim ? _formatarDataHora(periodo.dataFim) : 'Em aberto') +
        '   |   operadorbal: ' + (periodo.operadorbal || '—') +
        '   |   Coord.: ' + (periodo.coordenador || '—'),
        14, 27
    );

    let totEnt = 0, totSai = 0;
    const body = movs.map(m => {
        const ent = _pesoNum(m.entrada);
        const sai = _pesoNum(m.saida);
        totEnt += ent;
        totSai += sai;
        const liq = m.saidaVazia ? 'VAZIO' : (m.saida ? _fmtPeso(Math.abs(ent - sai)) : '---');

        return [
            _formatarDataHora(m.dataEntrada),
            m.sisplan || 'S/N',
            m.di || '-',
            m.tipo || '',
            m.embarcacao || '',
            m.clientes || '',
            m.mercadoria || '',
            m.placa || '',
            m.transportadora || 'AVULSO',
            m.motorista || '',
            m.entrada || '0',
            m.saidaVazia ? 'VAZIO' : (m.saida || '0'),
            liq
        ];
    });

    doc.autoTable({
        startY: 32,
        head: [['Data', 'Sisplan', 'DI/DUIMP', 'Operação', 'Navio', 'Cliente', 'Produto', 'Placa', 'Transportadora', 'Motorista', 'Entrada (kg)', 'Saída (kg)', 'Líquido (kg)']],
        body,
        theme: 'striped',
        styles: { fontSize: 6.0, cellPadding: 1.5, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [44, 62, 80], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
        tableWidth: 'auto',
        margin: { left: 6, right: 6 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Total de movimentações: ${movs.length}`, 14, finalY);
    doc.text(
        `Peso Entrada: ${_fmtPeso(totEnt)}   |   Peso Saída: ${_fmtPeso(totSai)}   |   Líquido: ${_fmtPeso(totEnt - totSai)}`,
        14, finalY + 5
    );

    doc.save(`relatorio_periodo_sem_sisplan_${periodo.id}.pdf`);
};

window.gerarRelatorioPeriodoCSV = function() {
    const ctx = window._detalhePeriodoAtual;
    if (!ctx) return;
    const { periodo, movs } = ctx;

    if (!movs.length) {
        document.getElementById('cont-detalhe-modal')?.remove(); 
        abrirModalSistema({
            titulo: 'Exportação Vazia',
            mensagem: 'Nenhuma movimentação encontrada neste período.',
            botoes: [{ texto: 'OK', estilo: 'info', acao: () => {} }]
        });
        return;
    }

    const header = ['Data Entrada', 'Sisplan', 'DI/DUIMP', 'Operação', 'Navio', 'Cliente', 'Produto', 'Placa', 'Transportadora', 'Motorista', 'Entrada (kg)', 'Saída (kg)', 'Líquido (kg)', 'Data Saída', 'operadorbal', 'Observações'];

    const linhas = movs.map(m => {
        const ent = _pesoNum(m.entrada);
        const sai = _pesoNum(m.saida);
        const liquido = m.saidaVazia ? 'VAZIO' : (m.saida ? _fmtPeso(Math.abs(ent - sai)) : '---');

        return [
            m.dataEntrada ? _formatarDataHora(m.dataEntrada) : '',
            m.sisplan || 'S/N',
            m.di || '',
            m.tipo || '',
            m.embarcacao || '',
            m.clientes || '',
            m.mercadoria || '',
            m.placa || '',
            m.transportadora || 'AVULSO',
            m.motorista || '',
            m.entrada || '',
            m.saidaVazia ? 'VAZIO' : (m.saida || ''),
            liquido,
            m.dataSaida ? _formatarDataHora(m.dataSaida) : '',
            m.operadorbal || periodo.operadorbal || '',
            (m.observacoes || '').replace(/;/g, ',')
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    });

    const csv = '\uFEFF' + [header.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_periodo_sem_sisplan_${periodo.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};


window.excluirPeriodoSemSisplan = async function(periodoId) {
    const periodo = (window._cacheContingencias || []).find(c => c.id === periodoId) || await db.contingencias.get(periodoId);
    if (!periodo) return;

    abrirModalSistema({
        titulo: "⊙ Área Restrita",
        mensagem: `Digite a senha para excluir o período de ${_formatarDataHora(periodo.dataInicio)} até ${periodo.dataFim ? _formatarDataHora(periodo.dataFim) : 'Em aberto'}:`,
        conteudoExtra: '<input type="password" id="senhaExclusaoPeriodo" style="width:100%; padding:10px; margin-top:6px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">',
        enterIndex: 0,
        botoes: [
            { texto: "Confirmar", estilo: "danger", acao: () => {
                const senha = window._modalInputs?.['senhaExclusaoPeriodo']
                            || document.getElementById('senhaExclusaoPeriodo')?.value || '';
                if (senha === _SENHA_CADASTRO_RAPIDO) {
                    _confirmarExclusaoPeriodo(periodo);
                } else {
                    abrirModalSistema({ titulo: "Erro", mensagem: "Senha incorreta!", botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }] });
                }
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
    setTimeout(() => document.getElementById('senhaExclusaoPeriodo')?.focus(), 150);
};

function _confirmarExclusaoPeriodo(periodo) {
    const ehAberto = !periodo.dataFim;
    abrirModalSistema({
        titulo: ehAberto ? '⚠ Excluir Período Em Aberto?' : '⚠ Confirmar Exclusão de Período',
        mensagem: ehAberto
            ? 'Este período ainda está EM ABERTO. Excluí-lo agora pode causar inconsistência se alguém estiver lançando dados nele neste momento.\n\nAs movimentações já registradas NÃO serão apagadas — apenas deixarão de estar vinculadas a este período (continuam disponíveis no histórico geral). Deseja continuar?'
            : 'As movimentações já registradas neste período NÃO serão apagadas — apenas o registro do período (datas / operador / coordenador) será removido. Deseja continuar?',
        botoes: [
            { texto: 'Excluir Período', estilo: 'danger', acao: () => { _executarExclusaoPeriodo(periodo); } },
            { texto: 'Cancelar', estilo: 'info', acao: () => {} }
        ]
    });
}

async function _executarExclusaoPeriodo(periodo) {
    try {
        const todas = await db.movimentacoes.toArray();
        const vinculadas = todas.filter(m => m.periodoId === periodo.id);
        for (const m of vinculadas) {
            await db.movimentacoes.update(m.id, {
                ...m,
                periodoId: null,
                _periodoExcluidoInfo: `Período #${periodo.id} (${_formatarDataHora(periodo.dataInicio)} a ${periodo.dataFim ? _formatarDataHora(periodo.dataFim) : 'Em aberto'}) excluído em ${_formatarDataHora(new Date().toISOString())}`
            });
        }

        await db.contingencias.delete(periodo.id);

        await db.logs.add({
            data: new Date().toISOString(),
            operadorbal: window.coordenadorSessaoAtual || '-',
            acao: `Período Sem SISPLAN EXCLUÍDO — Início: ${_formatarDataHora(periodo.dataInicio)} | Fim: ${periodo.dataFim ? _formatarDataHora(periodo.dataFim) : 'Em aberto'} | ${vinculadas.length} movimentação(ões) desvinculada(s), mantidas no histórico.`,
            placa: '-'
        });

        
        const eraSessaoAtiva = String(periodo.id) === sessionStorage.getItem('sisplan_periodo_id');
        if (eraSessaoAtiva) {
            sessionStorage.removeItem('sisplan_liberado_sessao');
            sessionStorage.removeItem('sisplan_coordenador_sessao');
            sessionStorage.removeItem('sisplan_operadorbal_sessao');
            _limparPeriodoSessao();
        }

        document.getElementById('cont-detalhe-modal')?.remove();
        await _renderizarListaPeriodos();

        abrirModalSistema({
            titulo: '✔ Período Excluído',
            mensagem: eraSessaoAtiva
                ? 'O período foi removido com sucesso. Como era o período em uso nesta sessão, a tela será recarregada.'
                : 'O período foi removido com sucesso. As pesagens já lançadas continuam no histórico do sistema.',
            botoes: [{ texto: 'OK', estilo: 'info', acao: () => { if (eraSessaoAtiva) location.reload(); } }]
        });
    } catch(e) {
        console.warn('Erro ao excluir período:', e);
        abrirModalSistema({ titulo: 'Erro', mensagem: 'Não foi possível excluir o período: ' + e.message, botoes: [{ texto: 'OK', estilo: 'danger', acao: () => {} }] });
    }
}

window.verificarTravaSisplan = verificarTravaSisplan;

async function _iniciarContingencia() {
    try {
        if (typeof window.carregarListasDoIndexedDB === 'function') {
            await window.carregarListasDoIndexedDB();
        }
    } catch (e) {
        console.warn('Erro ao carregar cadastros antes da contingência:', e);
    }

    if (typeof verificarTravaSisplan === 'function') {
        verificarTravaSisplan();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _iniciarContingencia);
} else {
    _iniciarContingencia();
}

const _SENHA_CADASTRO_RAPIDO = "123456";

const _GLOBAL_LISTA = { operadorbal: 'listaoperadoresbal', coordenador: 'listaCoordenadores' };

window.cadastroRapidoContingencia = function(tipo) {
    const rotulo = tipo === 'operadorbal' ? 'operadorbal' : 'Coordenador';

    abrirModalSistema({
        titulo: "⊙ Área Restrita",
        mensagem: `Digite a senha para cadastrar um ${rotulo}:`,
        conteudoExtra: '<input type="password" id="senhaCadRapido" style="width:100%; padding:10px; margin-top:6px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">',
        enterIndex: 0,
        botoes: [
            { texto: "Confirmar", estilo: "danger", acao: () => {
                const senha = window._modalInputs?.['senhaCadRapido']
                            || document.getElementById('senhaCadRapido')?.value || '';
                if (senha === _SENHA_CADASTRO_RAPIDO) {
                    _formNomeCadastroRapido(tipo, rotulo);
                } else {
                    abrirModalSistema({ titulo: "Erro", mensagem: "Senha incorreta!", botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }] });
                }
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
    setTimeout(() => document.getElementById('senhaCadRapido')?.focus(), 150);
};

function _formNomeCadastroRapido(tipo, rotulo) {
    abrirModalSistema({
        titulo: `Cadastrar ${rotulo}`,
        mensagem: `Digite o nome do ${rotulo.toLowerCase()}:`,
        conteudoExtra: `<input type="text" id="nomeCadRapido" placeholder="Nome completo..." style="width:100%; padding:10px; margin-top:6px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">`,
        enterIndex: 0,
        botoes: [
            { texto: "Salvar", estilo: "danger", acao: () => {
                const nome = (window._modalInputs?.['nomeCadRapido']
                            || document.getElementById('nomeCadRapido')?.value || '').trim();
                if (!nome) {
                    abrirModalSistema({ titulo: "Atenção", mensagem: "Digite um nome antes de salvar!", botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }] });
                    return;
                }
                _salvarCadastroRapido(tipo, nome, rotulo);
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
    setTimeout(() => document.getElementById('nomeCadRapido')?.focus(), 150);
}

function _salvarCadastroRapido(tipo, nome, rotulo) {
    const nomeGlobal = _GLOBAL_LISTA[tipo];
    if (!window[nomeGlobal] || !Array.isArray(window[nomeGlobal])) window[nomeGlobal] = [];
    const lista = window[nomeGlobal];

    if (lista.some(n => String(n).trim().toLowerCase() === nome.toLowerCase())) {
        abrirModalSistema({ titulo: "Já existe", mensagem: `Este ${rotulo.toLowerCase()} já está cadastrado.`, botoes: [{ texto: "OK", estilo: "info", acao: () => {} }] });
        return;
    }

    lista.push(nome);
    lista.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    if (typeof salvar === 'function') salvar();
    if (typeof popularSelects === 'function') popularSelects();

    _recarregarDropdownContingencia(tipo, nome);

    abrirModalSistema({
        titulo: "✔ Sucesso",
        mensagem: `${rotulo} cadastrado e já selecionado!`,
        botoes: [{ texto: "OK", estilo: "info", acao: () => {} }]
    });
}

function _recarregarDropdownContingencia(tipo, nomeSelecionado) {
    const mapa = {
        operadorbal:    { ddId: 'dd-operadorbal',    hiddenId: 'cont-operadorbal',    lista: 'listaoperadoresbal',    placeholder: '-- Selecione o operadorbal --' },
        coordenador: { ddId: 'dd-coordenador', hiddenId: 'cont-coordenador', lista: 'listaCoordenadores', placeholder: '-- Selecione o Coordenador --' }
    };
    const cfg = mapa[tipo];
    if (!cfg) return;

    const listaEl = document.getElementById(cfg.ddId + '-lista');
    if (!listaEl) return; // dropdown não está na tela (ex.: outro modal) — ignora

    const lista = [...new Set(window[cfg.lista] || [])].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    listaEl.innerHTML =
        `<div class="cont-dd-item cont-dd-placeholder" onclick="selecionarDropdown('${cfg.ddId}','${cfg.hiddenId}','','${cfg.placeholder}')">${cfg.placeholder}</div>` +
        lista.map(o => `<div class="cont-dd-item" onclick="selecionarDropdown('${cfg.ddId}','${cfg.hiddenId}','${o}','${o}')">${o}</div>`).join('');

    if (nomeSelecionado) {
        window.selecionarDropdown(cfg.ddId, cfg.hiddenId, nomeSelecionado, nomeSelecionado);
    }
}

if (typeof window.electronAPI !== 'undefined' && window.electronAPI.onSolicitarFechamento) {
    window.electronAPI.onSolicitarFechamento(() => {
        if (typeof window.exibirModalFechamento === 'function') {
            window.exibirModalFechamento();
        }
    });
}
