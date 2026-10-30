
function renderListaGerencia() {
    const tipo = document.getElementById('switchLista').value;
    const container = document.getElementById('listaGerencia');
    let listaAtual;

    if      (tipo === 'clientes')       listaAtual = listaclientess;
    else if (tipo === 'embarcacao')     listaAtual = listaEmbarcacoes;
    else if (tipo === 'motorista')      listaAtual = listaMotoristas;
    else if (tipo === 'placa')          listaAtual = listaPlacas;
    else if (tipo === 'operadorbal')       listaAtual = listaoperadoresbal;
    else if (tipo === 'transportadora') listaAtual = typeof listaTransportadoras !== 'undefined' ? listaTransportadoras : [];
    else if (tipo === 'coordenador')    listaAtual = typeof listaCoordenadores   !== 'undefined' ? listaCoordenadores   : [];
    else                                listaAtual = listaMercadorias;

    container.innerHTML = "";

    [...new Set(listaAtual)].sort().forEach(item => {
        container.innerHTML += `
        <div class="item-gerencia">
            <span>${item}</span>
            <div>
                <button class="btn-icon-gerencia" onclick="editarItemLista('${tipo}', '${item}')">✎</button>
                <button class="btn-icon-gerencia" onclick="excluirItemLista('${tipo}', '${item}')">✕</button>
            </div>
        </div>`;
    });
}

const _tiposProtegidos = ['operadorbal', 'coordenador'];

function _pedirSenhaProtecao(acao) {
        const inputHTML = `
        <input type="password" id="senha-cad-input"
               placeholder="Digite seu nome como senha"
               style="width:100%; padding:10px; border-radius:var(--radius-sm);
                      border:1px solid var(--border-input); box-sizing:border-box;
                      font-size:14px; background:var(--bg-input); color:var(--text-primary);
                      font-family:var(--font-body); outline:none; margin-top:4px;">`;

    abrirModalSistema({
        titulo:        "Confirmação de Identidade",
        mensagem:      "Esta operação é restrita. Informe seu nome como senha:",
        conteudoExtra: inputHTML,
        enterIndex:    0,
        botoes: [
            {
                texto: "Confirmar",
                estilo: "danger",
                acao: () => {
                    const digitado = (window._modalInputs?.['senha-cad-input'] || document.getElementById('senha-cad-input')?.value || '').trim();

                    if (digitado !== '123456') {
                        abrirModalSistema({
                            titulo:     "Acesso Negado",
                            mensagem:   "Senha incorreta. Somente auditores cadastrados podem realizar esta operação.",
                            enterIndex: 0,
                            botoes: [{ texto: "Fechar", estilo: "danger", acao: () => {} }]
                        });
                        return;
                    }
                    acao();
                }
            },
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });

    setTimeout(() => document.getElementById('senha-cad-input')?.focus(), 150);
}

function excluirItemLista(tipo, valor) {
    const executar = () => {
        abrirModalSistema({
            titulo:     "Confirmar Exclusão",
            mensagem:   `Deseja realmente excluir "${valor}" permanentemente?`,
            enterIndex: 0,
            botoes: [
                { texto: "Sim, Excluir", estilo: "danger", acao: () => {
                    if      (tipo === 'clientes')       listaclientess       = listaclientess.filter(i => i !== valor);
                    else if (tipo === 'embarcacao')     listaEmbarcacoes     = listaEmbarcacoes.filter(i => i !== valor);
                    else if (tipo === 'motorista')      listaMotoristas      = listaMotoristas.filter(i => i !== valor);
                    else if (tipo === 'placa')          listaPlacas          = listaPlacas.filter(i => i !== valor);
                    else if (tipo === 'operadorbal')       listaoperadoresbal      = listaoperadoresbal.filter(i => i !== valor);
                    else if (tipo === 'transportadora') listaTransportadoras = listaTransportadoras.filter(i => i !== valor);
                    else if (tipo === 'coordenador')    listaCoordenadores   = listaCoordenadores.filter(i => i !== valor);
                    else                                listaMercadorias     = listaMercadorias.filter(i => i !== valor);
                    salvar();
                    renderListaGerencia();
                }},
                { texto: "Cancelar",    estilo: "info",   acao: () => {} }
            ]
        });
    };

    if (_tiposProtegidos.includes(tipo)) {
        _pedirSenhaProtecao(executar);
    } else {
        executar();
    }
}

function editarItemLista(tipo, antigo) {
    const executar = () => {
        
        const valorInicial = antigo;

        const inputHTML = `
            <input type="text" id="edit-item-input"
                   value="${valorInicial}"
                   ${tipo === 'placa' ? 'oninput="formatarPlacaInput(this)"' : ''}
                   style="width:100%; padding:10px; border-radius:var(--radius-sm);
                          border:1px solid var(--border-input); box-sizing:border-box;
                          font-size:14px; background:var(--bg-input); color:var(--text-primary);
                          font-family:var(--font-body); outline:none; margin-top:4px;">`;

        abrirModalSistema({
            titulo:        `Editar ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
            mensagem:      `Alterando: "${antigo}"`,
            conteudoExtra: inputHTML,
            enterIndex:    0,
            botoes: [
                {
                    texto:  "Salvar",
                    estilo: "danger",
                    acao: () => {
                        let novo = (window._modalInputs?.['edit-item-input'] || document.getElementById('edit-item-input')?.value || '').trim().toUpperCase();
                        if (!novo || novo === antigo) return;

                        if (tipo === 'placa') novo = _formatarPlacaStr(novo);

                        if      (tipo === 'clientes')       listaclientess       = listaclientess.map(i => i === antigo ? novo : i);
                        else if (tipo === 'embarcacao')     listaEmbarcacoes     = listaEmbarcacoes.map(i => i === antigo ? novo : i);
                        else if (tipo === 'motorista')      listaMotoristas      = listaMotoristas.map(i => i === antigo ? novo : i);
                        else if (tipo === 'operadorbal')       listaoperadoresbal      = listaoperadoresbal.map(i => i === antigo ? novo : i);
                        else if (tipo === 'transportadora') listaTransportadoras = listaTransportadoras.map(i => i === antigo ? novo : i);
                        else if (tipo === 'coordenador')    listaCoordenadores   = listaCoordenadores.map(i => i === antigo ? novo : i);
                        else if (tipo === 'placa')          listaPlacas          = listaPlacas.map(i => i === antigo ? novo : i);
                        else                                listaMercadorias     = listaMercadorias.map(i => i === antigo ? novo : i);

                        if (typeof salvar          === 'function') salvar();
                        if (typeof renderListaGerencia === 'function') renderListaGerencia();
                        if (typeof popularSelects  === 'function') popularSelects();
                    }
                },
                { texto: "Cancelar", estilo: "info", acao: () => {} }
            ]
        });

        setTimeout(() => document.getElementById('edit-item-input')?.focus(), 150);
    };

    if (_tiposProtegidos.includes(tipo)) {
        _pedirSenhaProtecao(executar);
    } else {
        executar();
    }
}

function _formatarPlacaStr(v) {
    v = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3, 7);
    return v;
}

window.formatarPlacaInput = function(el) {
    const posCursor = el.selectionStart;
    const tamAntigo = el.value.length;

    el.value = _formatarPlacaStr(el.value);

    let novaPos = posCursor + (el.value.length - tamAntigo);
    if (novaPos < 0) novaPos = 0;
    if (novaPos > el.value.length) novaPos = el.value.length;

    el.setSelectionRange(novaPos, novaPos);
};

function adicionarregistroItemLista() {
    const tipo = document.getElementById('switchLista').value;
    gerenciarListaRapido(tipo);
}
