
function abrirAuditoria() {
    
    const inputHTML = `
        <input type="password" id="senha-auditoria"
               placeholder="Digite seu nome como senha"
               style="width:100%; padding:10px; border-radius:var(--radius-sm);
                      border:1px solid var(--border-input); box-sizing:border-box;
                      font-size:14px; background:var(--bg-input); color:var(--text-primary);
                      font-family:var(--font-body); outline:none; margin-top:4px;">`;

    abrirModalSistema({
        titulo:        "Acesso Restrito — Auditoria",
        mensagem:      "Esta área é restrita. Informe seu nome como senha:",
        conteudoExtra: inputHTML,
        enterIndex:    0,
        botoes: [
            {
                texto:  "Acessar",
                estilo: "danger",
                acao: () => {
                    const digitado = (window._modalInputs?.['senha-auditoria'] || document.getElementById('senha-auditoria')?.value || '').trim();

                    if (digitado !== '123456') {
                        abrirModalSistema({
                            titulo:     "Acesso Negado",
                            mensagem:   "Senha incorreta. Somente auditores cadastrados têm acesso à auditoria.",
                            enterIndex: 0,
                            botoes: [{ texto: "Fechar", estilo: "danger", acao: () => {} }]
                        });
                        return;
                    }

                    if (typeof db !== 'undefined') {
                        const nomeoperadorbal = document.getElementById('operadorbalAtivo')?.value || 'Auditor';
                        db.logs.add({
                            data:     new Date().toISOString(),
                            operadorbal: nomeoperadorbal,
                            acao:     "Acesso à Auditoria",
                            placa:    "-"
                        });
                    }

                    _exibirAuditoria();
                }
            },
            { texto: "Cancelar", estilo: "info",   acao: () => {} }
        ]
    });

    setTimeout(() => document.getElementById('senha-auditoria')?.focus(), 150);
}

async function _exibirAuditoria() {
    try {
        document.getElementById('auditoria-modal')?.remove();

        const logs          = await db.logs.orderBy("data").reverse().toArray();
        const contingencias = await db.contingencias.orderBy("dataInicio").reverse().toArray();

        const thStyle = `padding:9px 12px; text-align:left; font-size:10.5px; font-weight:700;
                         letter-spacing:0.06em; text-transform:uppercase; color:#a8c4e0; white-space:nowrap;`;

        const overlay = document.createElement('div');
        overlay.id        = 'auditoria-modal';
        overlay.className = 'cont-overlay';

        overlay.innerHTML = `
        <div style="background:var(--card-background); border:1px solid var(--border-color);
                    border-radius:var(--radius-lg); box-shadow:var(--shadow-lg);
                    width:95%; max-width:1060px; height:88vh;
                    display:flex; flex-direction:column; overflow:hidden;
                    animation:fadeUp 0.22s ease both;">

            <div style="padding:16px 20px; background:var(--bg-table-head);
                        display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h2 style="margin:0; font-size:16px; color:#a8c4e0; font-family:var(--font-body);
                            font-weight:700; letter-spacing:0.04em; text-transform:uppercase;">
                    ≡ Painel de Controle e Auditoria Global
                </h2>
                <button onclick="fecharAuditoria()" title="Fechar"
                        style="background:none; border:none; font-size:22px; cursor:pointer;
                               color:var(--text-muted); padding:2px 6px; border-radius:4px;">✕</button>
            </div>

            <div style="display:flex; gap:6px; padding:10px 16px;
                        background:var(--bg-sidebar-dark); border-bottom:1px solid var(--border-color); flex-shrink:0;">
                <button id="aud-btn-cont" onclick="audAba('cont')"
                    style="padding:7px 16px; font-size:12px; font-weight:700; font-family:var(--font-body);
                           border-radius:var(--radius-sm); border:1px solid var(--brand-blue);
                           background:var(--brand-blue); color:#fff; cursor:pointer;">
                    ⚠ Períodos Sem Sisplan (${contingencias.length})
                </button>
                <button id="aud-btn-logs" onclick="audAba('logs')"
                    style="padding:7px 16px; font-size:12px; font-weight:700; font-family:var(--font-body);
                           border-radius:var(--radius-sm); border:1px solid var(--border-color);
                           background:var(--fundo-botao); color:var(--texto-botao); cursor:pointer;">
                    Ações de Usuários (${logs.length})
                </button>
            </div>

            <div style="flex:1; overflow-y:auto; padding:0;">
                <div id="aud-tab-cont">
                    <table style="width:100%; border-collapse:collapse; font-size:13px; font-family:var(--font-body);">
                        <thead>
                            <tr style="background:var(--bg-table-head); position:sticky; top:0; z-index:2;">
                                <th style="${thStyle}">Data Início</th>
                                <th style="${thStyle}">Horário Início</th>
                                <th style="${thStyle}">Data Fechamento</th>
                                <th style="${thStyle}">Horário Fechamento</th>
                                <th style="${thStyle}">Coordenador</th>
                                <th style="${thStyle}">operadorbal</th>
                                <th style="${thStyle}">Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${contingencias.length === 0
                                ? `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted);">Nenhum período sem Sisplan registrado.</td></tr>`
                                : contingencias.map((c, i) => {
                                    const dataFimStr  = c.dataFim  ? new Date(c.dataFim).toLocaleDateString('pt-BR')  : '<span style="color:var(--brand-blue);font-weight:700;">Em aberto</span>';
                                    const horaFimStr  = c.horarioFim || (c.dataFim ? new Date(c.dataFim).toLocaleTimeString('pt-BR') : '-');
                                    return `
                                <tr style="border-bottom:1px solid var(--border-color);background:${i%2===0?'var(--bg-table-row-alt)':'transparent'};">
                                    <td style="padding:8px 12px;font-weight:700;">${new Date(c.dataInicio).toLocaleDateString('pt-BR')}</td>
                                    <td style="padding:8px 12px;">${c.horarioInicio||'-'}</td>
                                    <td style="padding:8px 12px;font-weight:700;">${dataFimStr}</td>
                                    <td style="padding:8px 12px;">${horaFimStr}</td>
                                    <td style="padding:8px 12px;color:var(--brand-blue);font-weight:700;">◉ ${c.coordenador}</td>
                                    <td style="padding:8px 12px;">◉ ${c.operadorbal||'-'}</td>
                                    <td style="padding:8px 12px;font-style:italic;">${c.motivo||'-'}</td>
                                </tr>`;}).join('')}
                        </tbody>
                    </table>
                </div>

                <div id="aud-tab-logs" style="display:none;">
                    <table style="width:100%; border-collapse:collapse; font-size:13px; font-family:var(--font-body);">
                        <thead>
                            <tr style="background:var(--bg-table-head); position:sticky; top:0; z-index:2;">
                                <th style="${thStyle}">Data/Hora</th>
                                <th style="${thStyle}">operadorbal</th>
                                <th style="${thStyle}">Ação Executada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.length === 0
                                ? `<tr><td colspan="3" style="padding:24px;text-align:center;color:var(--text-muted);">Nenhuma ação registrada.</td></tr>`
                                : logs.map((log, i) => `
                                <tr style="border-bottom:1px solid var(--border-color);background:${i%2===0?'var(--bg-table-row-alt)':'transparent'};">
                                    <td style="padding:8px 12px;font-size:12px;white-space:nowrap;">${new Date(log.data).toLocaleString('pt-BR')}</td>
                                    <td style="padding:8px 12px;font-size:12px;">◉ ${log.operadorbal||'-'}</td>
                                    <td style="padding:8px 12px;font-size:12px;">${log.acao||'-'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                        </div>

            <!-- ── RODAPÉ COM AÇÕES PERIGOSAS ── -->
            <div style="padding:12px 20px; background:var(--bg-table-head);
                        border-top:1px solid var(--border-color); flex-shrink:0;
                        display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <span style="font-size:11px; color:var(--text-muted); font-style:italic;">
                    ⚠ A exclusão total apaga movimentações, logs e períodos sem Sisplan. Ação irreversível.
                </span>
                <button onclick="window.audExcluirTodosRegistros()"
                        style="padding:8px 16px; font-size:12px; font-weight:700; font-family:var(--font-body);
                               border-radius:var(--radius-sm); border:1px solid #dc2626;
                               background:#dc2626; color:#fff; cursor:pointer; white-space:nowrap;">
                    🗑 Excluir Todos os Registros
                </button>
            </div>
        </div>`;

        document.body.appendChild(overlay);

    } catch (erro) {
        console.error("Erro ao abrir auditoria:", erro);
    }
}

function audAba(aba) {
    document.getElementById('aud-tab-logs').style.display = aba === 'logs' ? 'block' : 'none';
    document.getElementById('aud-tab-cont').style.display = aba === 'cont' ? 'block' : 'none';
    const btns = { logs: document.getElementById('aud-btn-logs'), cont: document.getElementById('aud-btn-cont') };
    for (const [key, btn] of Object.entries(btns)) {
        if (!btn) continue;
        const ativo = key === aba;
        btn.style.background  = ativo ? 'var(--brand-blue)' : 'var(--fundo-botao)';
        btn.style.color       = ativo ? '#fff'              : 'var(--texto-botao)';
        btn.style.borderColor = ativo ? 'var(--brand-blue)' : 'var(--border-color)';
    }
}

function fecharAuditoria() {
    document.getElementById('auditoria-modal')?.remove();
}

window.audExcluirTodosRegistros = function () {
    
    abrirModalSistema({
        titulo:     "⚠ Exclusão Total de Registros",
        mensagem:   "Você está prestes a APAGAR PERMANENTEMENTE todas as movimentações, " +
                    "logs de auditoria e períodos sem Sisplan.\n\nEsta ação NÃO pode ser desfeita. Deseja continuar?",
        enterIndex: 0,
        botoes: [
            {
                texto: "Continuar",
                estilo: "danger",
                acao: () => _audConfirmarSenhaExclusao()
            },
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
};

function _audConfirmarSenhaExclusao() {
    const inputHTML = `
        <input type="password" id="senha-exclusao-total"
               placeholder="Digite a senha para confirmar"
               style="width:100%; padding:10px; border-radius:var(--radius-sm);
                      border:1px solid var(--border-input); box-sizing:border-box;
                      font-size:14px; background:var(--bg-input); color:var(--text-primary);
                      font-family:var(--font-body); outline:none; margin-top:4px;">`;

    abrirModalSistema({
        titulo:        "Confirmação Final",
        mensagem:      "Para confirmar a exclusão TOTAL, digite a senha de auditoria:",
        conteudoExtra: inputHTML,
        enterIndex:    0,
        botoes: [
            {
                texto:  "Excluir Tudo",
                estilo: "danger",
                acao: () => {
                    const senha = (window._modalInputs?.['senha-exclusao-total']
                                || document.getElementById('senha-exclusao-total')?.value || '').trim();

                    if (senha !== '123456') {
                        abrirModalSistema({
                            titulo:   "Senha Incorreta",
                            mensagem: "A exclusão foi cancelada por senha inválida.",
                            botoes: [{ texto: "Fechar", estilo: "danger", acao: () => {} }]
                        });
                        return;
                    }
                    _audExecutarExclusaoTotal();
                }
            },
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });

    setTimeout(() => document.getElementById('senha-exclusao-total')?.focus(), 150);
}

async function _audExecutarExclusaoTotal() {
    try {
        const nomeoperadorbal = document.getElementById('operadorbalAtivo')?.value || 'Auditor';

        if (typeof db !== 'undefined') {
            await db.movimentacoes.clear();
            await db.contingencias.clear();
            await db.logs.clear();

            await db.logs.add({
                data:     new Date().toISOString(),
                operadorbal: nomeoperadorbal,
                acao:     "🗑 EXCLUSÃO TOTAL de registros (movimentações, logs e períodos sem Sisplan).",
                placa:    "-"
            });
        }

        if (typeof window.turno_encerrarPeriodo === 'function') {
            try { await window.turno_encerrarPeriodo(); } catch (e) {}
        }

        fecharAuditoria();

        abrirModalSistema({
            titulo:   "✔ Registros Excluídos",
            mensagem: "Todos os registros foram apagados com sucesso.",
            botoes: [{ texto: "OK", estilo: "success", acao: () => {} }]
        });

    } catch (erro) {
        console.error("Erro ao excluir registros:", erro);
        abrirModalSistema({
            titulo:   "Erro",
            mensagem: "Ocorreu um erro ao excluir os registros. Verifique o console.",
            botoes: [{ texto: "Fechar", estilo: "danger", acao: () => {} }]
        });
    }
}

window.abrirAuditoria  = abrirAuditoria;
window.fecharAuditoria = fecharAuditoria;
window.audAba          = audAba;
