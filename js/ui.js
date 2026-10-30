
function abrirModal(tipo) {
    const tipoNormalizado = tipo.toUpperCase();

    if (tipoNormalizado.includes("COORDENADOR") || tipoNormalizado.includes("operadorbal")) {
        abrirModalSistema({
            titulo: "⊙ Área Restrita",
            mensagem: "Digite a senha de autorização:",
            conteudoExtra: '<input type="password" id="senhaAuth" style="width:100%; padding:8px; margin-top:10px;">',
            enterIndex: 0,
            botoes: [
                { texto: "Confirmar", estilo: "danger", acao: () => {
                    const senha = window._modalInputs?.['senhaAuth']
                                  || document.getElementById('senhaAuth')?.value
                                  || '';
                    if (senha === "123456") {
                        abrirFormularioCadastro(tipo);
                    } else {
                        abrirModalSistema({ titulo: "Erro", mensagem: "Senha incorreta!", botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }] });
                    }
                }},
                { texto: "Cancelar", estilo: "info", acao: () => {} }
            ]
        });
    } else {
        abrirFormularioCadastro(tipo);
    }
}

function abrirFormularioCadastro(tipo) {
    abrirModalSistema({
        titulo: "Gerenciando: " + tipo.toUpperCase(),
        mensagem: "Preencha o campo abaixo:",
        
        conteudoExtra: `
            <input type="text" id="cadNome" placeholder="Digite o nome aqui..." 
            style="width:100%; padding:10px; margin:15px 0; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
        `,
        enterIndex: 0,
        botoes: [
            { 
                texto: "Salvar", 
                estilo: "primary", 
                acao: () => {
                    
                    const nome = (window._modalInputs?.['cadNome']
                                  || document.getElementById('cadNome')?.value
                                  || '').trim();

                    if (!nome) {
                        abrirModalSistema({
                            titulo: "Atenção",
                            mensagem: "Digite um nome antes de salvar!",
                            botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
                        });
                        return;
                    }

                    if (typeof salvarNovoRegistro === 'function') {
                        salvarNovoRegistro(tipo, nome);
                    }
                }
            },
            { 
                texto: "Cancelar", 
                estilo: "danger", 
                acao: () => {} 
            }
        ]
    });

    setTimeout(() => document.getElementById('cadNome')?.focus(), 150);
}

function popularSelects() {
    const valoresAtuais = {
        tipo: document.getElementById('tipo')?.value || "",
        cliente: document.getElementById('cliente')?.value || "",
        transportadora: document.getElementById('transportadora')?.value || "",
        mercadoria: document.getElementById('mercadoria')?.value || "",
        operadorbalAtivo: document.getElementById('operadorbalAtivo')?.value || "",
        coordenadorAtivo: document.getElementById('coordenadorAtivo')?.value || "", 
        placa: document.getElementById('placa')?.value || "",
        motorista: document.getElementById('motorista')?.value || "",
        embarcacao: document.getElementById('embarcacao')?.value || "",
        filtroCliente: document.getElementById('filtroCliente')?.value || "",
        filtroNavio: document.getElementById('filtroNavio')?.value || "",
        filtroTransportadora: document.getElementById('filtroTransportadora')?.value || ""
    };

    function preencherSelect(id, lista, primeira = "Selecione...") {
        const select = document.getElementById(id);
        if (!select) return;

        let opcoesAdicionais = "";
        if (id === 'transportadora') {
            opcoesAdicionais = `<option value="AVULSO">SEM TRANSPORTADORA (AVULSO)</option>`;
        }

        const dadosLista = typeof lista !== 'undefined' ? lista : [];

        let itensOrdenados = [...new Set(dadosLista)]
            .filter(Boolean)
            .filter(item => item !== "AVULSO")
            .sort();

        if (id === 'cliente' || id === 'filtroCliente') {
            const fixoUpper = (typeof CLIENTE_FIXO_NORONHA !== 'undefined' ? CLIENTE_FIXO_NORONHA : 'EMBARCAÇÕES NORONHA').toUpperCase();
            const idxFixo = itensOrdenados.findIndex(item => item.toUpperCase() === fixoUpper);
            if (idxFixo > -1) {
                const [fixo] = itensOrdenados.splice(idxFixo, 1);
                itensOrdenados.unshift(fixo);
            }
        }

        select.innerHTML =
            `<option value="">${primeira}</option>` +
            opcoesAdicionais +
            itensOrdenados
                .map(item => `<option value="${item}">${item}</option>`)
                .join('');

        if (valoresAtuais[id]) {
            select.value = valoresAtuais[id];
        }
    }

    function preencherDatalist(id, lista) {
        const dl = document.getElementById(id);
        if (!dl) return;
        const dadosLista = typeof lista !== 'undefined' ? lista : [];
        dl.innerHTML = [...new Set(dadosLista)]
            .filter(Boolean)
            .sort()
            .map(item => `<option value="${item}">`)
            .join('');
    }

    preencherDatalist('lista-clientes', typeof listaclientess !== 'undefined' ? listaclientess : []);
    preencherDatalist('lista-mercadorias', typeof listaMercadorias !== 'undefined' ? listaMercadorias : []);
    preencherSelect('operadorbalAtivo', typeof listaoperadoresbal !== 'undefined' ? listaoperadoresbal : [], "Selecione...");

    preencherSelect('coordenadorAtivo', typeof listaCoordenadores !== 'undefined' ? listaCoordenadores : [], "Selecione o Coordenador...");

    preencherDatalist('lista-placas', typeof listaPlacas !== 'undefined' ? listaPlacas : []);
    preencherDatalist('lista-motoristas', typeof listaMotoristas !== 'undefined' ? listaMotoristas : []);
    preencherDatalist('lista-embarcacoes', typeof listaEmbarcacoes !== 'undefined' ? listaEmbarcacoes : []);

    if (typeof listaTiposOperacoes !== 'undefined') {
        preencherSelect('tipo', listaTiposOperacoes);
    } else if (document.getElementById('tipo') && valoresAtuais.tipo) {
        document.getElementById('tipo').value = valoresAtuais.tipo;
    }

    preencherDatalist('lista-transportadoras', [
        'AVULSO',
        ...(typeof listaTransportadoras !== 'undefined' ? listaTransportadoras : [])
    ]);
    if (valoresAtuais.transportadora) {
        const campoTransp = document.getElementById('transportadora');
        if (campoTransp && !campoTransp.value) campoTransp.value = valoresAtuais.transportadora;
    }

    const fReq = document.getElementById('filtroCliente');
    if (fReq && typeof listaclientess !== 'undefined') {
        const fixoUpper = (typeof CLIENTE_FIXO_NORONHA !== 'undefined' ? CLIENTE_FIXO_NORONHA : 'EMBARCAÇÕES NORONHA').toUpperCase();
        let itensCliente = [...new Set(listaclientess)].sort();
        const idxFixoC = itensCliente.findIndex(item => item.toUpperCase() === fixoUpper);
        if (idxFixoC > -1) {
            const [fixoC] = itensCliente.splice(idxFixoC, 1);
            itensCliente.unshift(fixoC);
        }
        fReq.innerHTML = '<option value="">Todos</option>' + itensCliente.map(i => `<option value="${i}">${i}</option>`).join('');
        if (valoresAtuais.filtroCliente) fReq.value = valoresAtuais.filtroCliente;
    }

    const fNavio = document.getElementById('filtroNavio');
    if (fNavio && typeof listaEmbarcacoes !== 'undefined') {
        fNavio.innerHTML = '<option value="">Todos</option>' + [...new Set(listaEmbarcacoes)].sort().map(i => `<option value="${i}">${i}</option>`).join('');
        if (valoresAtuais.filtroNavio) fNavio.value = valoresAtuais.filtroNavio;
    }

    const fTransportadora = document.getElementById('filtroTransportadora');
    if (fTransportadora) {
        const listaTransp = typeof listaTransportadoras !== 'undefined' ? listaTransportadoras : [];
        fTransportadora.innerHTML =
            '<option value="">Todas</option>' +
            '<option value="AVULSO">SEM TRANSPORTADORA (AVULSO)</option>' +
            [...new Set(listaTransp)].filter(Boolean).sort().filter(i => i !== 'AVULSO').map(i => `<option value="${i}">${i}</option>`).join('');

        if (valoresAtuais.filtroTransportadora) fTransportadora.value = valoresAtuais.filtroTransportadora;
    }
}

function atualizarDatalists() {
    const listEl = document.getElementById('lista-dis');

    if (listEl && Array.isArray(dados)) {
        
        const doPeriodo  = dados.map(d => d.di).filter(Boolean);
        const doHistorico = window._todosDIsHistorico ? [...window._todosDIsHistorico] : [];
        const valores = [...new Set([...doPeriodo, ...doHistorico])];

        listEl.innerHTML = valores
            .sort()
            .map(v => `<option value="${v}">`)
            .join('');
    } else {
        console.warn("atualizarDatalists: 'dados' não está pronto ou não é um array.", dados);
    }
}

function openNav() {
    const sidebar = document.getElementById("mySidebar");
    if (!sidebar) return;
    sidebar.style.width = "320px";
    document.body.classList.add("sidebar-open");
    if (typeof renderListaGerencia === "function") renderListaGerencia();
    setTimeout(() => { document.addEventListener("click", _fecharSidebarFora); }, 50);
}

function closeNav() {
    const sidebar = document.getElementById("mySidebar");
    if (sidebar) sidebar.style.width = "0";
    document.body.classList.remove("sidebar-open");
    document.removeEventListener("click", _fecharSidebarFora);
    const btn = document.querySelector("button[onclick*=\"alternarSidebar\"]");
    if (btn) btn.classList.remove("sidebar-aberta");
}

function _fecharSidebarFora(e) {
    const sidebar   = document.getElementById('mySidebar');
    const btnToggle = document.querySelector('button[onclick*="alternarSidebar"]');
    const modalSistema = document.getElementById('modal-sistema-padrao');

    if (sidebar && sidebar.contains(e.target)) return;
    if (btnToggle && btnToggle.contains(e.target)) return;
    // Não fechar quando o clique for dentro do modal de editar/excluir/senha
    // (ex: cadastros gerenciados pelo menu lateral), já que esse modal é
    // renderizado fora da sidebar no DOM.
    if (modalSistema && modalSistema.contains(e.target)) return;
    closeNav();
}

function alternarSidebar(botao) {
    const sidebar = document.getElementById('mySidebar');
    if (!sidebar) return;

    const estaAberto = botao.classList.contains('sidebar-aberta');

    if (estaAberto) {
        closeNav();
    } else {
        botao.classList.add('sidebar-aberta');
        openNav();
    }
}

function alternarAba(idAba, botaoAlvo) {

    if (idAba === 'cadastros') {
        openNav();
        return;
    }

    document
        .querySelectorAll('.secao-aba')
        .forEach(secao => {
            secao.classList.add('hidden');
        });

    const abaAtiva =
        document.getElementById('aba-' + idAba);

    if (abaAtiva) {

        abaAtiva.classList.remove('hidden');

        setTimeout(() => {
            window.dispatchEvent(
                new Event('resize')
            );
        }, 100);

    } else {

        console.error(
            "Aba não encontrada: aba-" + idAba
        );

        return;
    }

    document
        .querySelectorAll('.menu-classic-item')
        .forEach(btn =>
            btn.classList.remove('active')
        );

    if (botaoAlvo) {
        botaoAlvo.classList.add('active');
    }

    if (idAba === 'pesagem') {
        const abaTransito = document.getElementById('aba-transito');
        if (abaTransito) {
            abaTransito.classList.remove('hidden');
        }

        setTimeout(async () => {

            try {

                if (
                    typeof db !== 'undefined' &&
                    db.movimentacoes
                ) {
                    if (typeof _recarregarDados === 'function') {
                        await _recarregarDados();
                    } else {
                        dados = await db.movimentacoes.toArray();
                    }
                }

                if (
                    typeof atualizarDatalists ===
                    'function'
                ) {

                    atualizarDatalists();
                }

                if (
                    typeof render ===
                    'function'
                ) {

                    render();
                }

            } catch (erro) {

                console.error(
                    'Erro ao recarregar pesagens:',
                    erro
                );
            }

        }, 150);
    }

    if (
        idAba === 'relatorios' &&
        typeof renderizarRelatorios === 'function'
    ) {

        setTimeout(() => {

            renderizarRelatorios();

        }, 100);
    }
}

function gerenciarListaRapido(tipo) {
    const isPlaca = tipo === 'placa';

    abrirModalSistema({
        titulo:        `Novo Cadastro: ${tipo.toUpperCase()}`,
        mensagem:      `Digite o nome para adicionar à lista de ${tipo}:`,
        conteudoExtra: `<input type="text" id="novoItemRapido"
                               ${isPlaca ? 'oninput="window.formatarPlacaInput(this)"' : ''}
                               placeholder="${isPlaca ? 'Ex: ABC-1234 ou ABC1D23' : ''}"
                               style="width:100%; padding:10px; margin-top:6px; box-sizing:border-box;
                                      border:1px solid var(--border-input); border-radius:var(--radius-sm);
                                      background:var(--bg-input); color:var(--text-primary);
                                      font-family:var(--font-body); font-size:14px; outline:none;">`,
        enterIndex: 0,
        botoes: [
            {
                texto:  "Salvar",
                estilo: "danger",
                acao: () => {
                    let valor = (window._modalInputs?.['novoItemRapido'] || document.getElementById('novoItemRapido')?.value || '').trim().toUpperCase();
                    if (!valor) return;

                    if (isPlaca) {
                        valor = valor.replace(/[^A-Z0-9]/g, '');
                        if (valor.length > 3) valor = valor.slice(0, 3) + '-' + valor.slice(3, 7);
                    }

                    const mapaListas = {
                        'placa':          { lista: typeof listaPlacas          !== 'undefined' ? listaPlacas          : null, id: 'placa' },
                        'motorista':      { lista: typeof listaMotoristas      !== 'undefined' ? listaMotoristas      : null, id: 'motorista' },
                        'transportadora': { lista: typeof listaTransportadoras !== 'undefined' ? listaTransportadoras : null, id: 'transportadora' },
                        'clientes':       { lista: typeof listaclientess       !== 'undefined' ? listaclientess       : null, id: 'cliente' },
                        'mercadoria':     { lista: typeof listaMercadorias     !== 'undefined' ? listaMercadorias     : null, id: 'mercadoria' },
                        'embarcacao':     { lista: typeof listaEmbarcacoes     !== 'undefined' ? listaEmbarcacoes     : null, id: 'embarcacao' },
                        'operadorbal':       { lista: typeof listaoperadoresbal      !== 'undefined' ? listaoperadoresbal      : null, id: 'operadorbalAtivo' },
                        'coordenador':    { lista: typeof listaCoordenadores   !== 'undefined' ? listaCoordenadores   : null, id: null }
                    };

                    const cfg = mapaListas[tipo];
                    if (cfg && cfg.lista) {
                        if (!cfg.lista.includes(valor)) cfg.lista.push(valor);
                    } else {
                        abrirModalSistema({ titulo: "Erro", mensagem: "Tipo de cadastro inválido.", enterIndex: 0, botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }] });
                        return;
                    }

                    if (typeof salvar              === 'function') salvar();
                    if (typeof popularSelects      === 'function') popularSelects();
                    if (typeof renderListaGerencia === 'function') renderListaGerencia();

                    const campo = document.getElementById(cfg.id);
                    if (campo) campo.value = valor;

                    abrirModalSistema({ titulo: "Sucesso", mensagem: "Cadastro realizado com sucesso!", enterIndex: 0, botoes: [{ texto: "OK", estilo: "info", acao: () => {} }] });
                }
            },
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });

    setTimeout(() => document.getElementById('novoItemRapido')?.focus(), 150);
}

window.gerenciarListaRapido = gerenciarListaRapido;

function abrirModalSistema(config) {
    
    document.getElementById("modal-sistema-padrao")?.remove();

    const isDark = document.body.classList.contains('dark-mode');

    const modal = document.createElement("div");
    modal.id = "modal-sistema-padrao";
    modal.style.cssText = `
        position: fixed; top:0; left:0; width:100vw; height:100vh; 
        background: rgba(0,0,0,0.6); z-index: 100050; 
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div style="background: ${isDark ? '#1e293b' : '#ffffff'}; 
                    padding: 25px; border-radius: 12px; 
                    width: min(440px, 92vw); box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    text-align: center; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                    max-height: 90vh; overflow-y: auto; box-sizing: border-box;">
            <h3 style="margin: 0 0 10px 0; font-family: sans-serif; color: ${isDark ? '#f8fafc' : '#1e293b'};">
                ${config.titulo}
            </h3>
            <p style="margin: 0 0 20px 0; color: ${isDark ? '#cbd5e1' : '#64748b'};">
                ${config.mensagem}
            </p>
            <div style="margin-bottom: 20px;">${config.conteudoExtra || ''}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;" id="modal-acoes"></div>
        </div>
    `;

    document.body.appendChild(modal);

    const containerBotoes = modal.querySelector("#modal-acoes");
    const botoesEl = [];

    config.botoes.forEach((btn, idx) => {
        const b = document.createElement("button");
        b.innerText = btn.texto;
        b.style.cssText = `
            padding: 10px 16px; border: none; border-radius: 6px;
            cursor: pointer; font-weight: 600; color: white;
            transition: opacity 0.2s; flex: 1 1 auto; min-width: fit-content;
        `;
        b.style.background = btn.estilo === 'danger' ? '#00428c' : '#53aff5';
        b.onmouseover = () => b.style.opacity = '0.9';
        b.onmouseout  = () => b.style.opacity = '1';
        b.onclick = () => {
            
            window._modalInputs = {};
            modal.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
                window._modalInputs[el.id] = el.value;
            });
            modal.remove();
            btn.acao();
        };
        botoesEl.push(b);
        containerBotoes.appendChild(b);
    });

    const enterIdx = typeof config.enterIndex === 'number'
        ? config.enterIndex
        : botoesEl.length - 1;

    const _enterHandler = (e) => {
        if (e.key === 'Enter') {
            if (document.activeElement?.tagName === 'TEXTAREA') return;
            e.preventDefault();
            document.removeEventListener('keydown', _enterHandler);
            botoesEl[enterIdx]?.click();
        }
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', _enterHandler);
            modal.remove();
        }
    };
    document.addEventListener('keydown', _enterHandler);

    const _obs = new MutationObserver(() => {
        if (!document.getElementById('modal-sistema-padrao')) {
            document.removeEventListener('keydown', _enterHandler);
            _obs.disconnect();
        }
    });
    _obs.observe(document.body, { childList: true });
}

function validarEConfirmarCadastro() {
    if (typeof salvarNovoRegistro === 'function') {
        salvarNovoRegistro();
    } else {
        abrirModalSistema({
            titulo: "Erro de Configuração",
            mensagem: "A função de salvamento não foi carregada corretamente. Por favor, contate o suporte.",
            botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
        });
    }
}

/* ── CustomSelect: substitui <select> nativos por dropdowns customizados ────
   Resolve o bug do Chromium/Windows que exibe triângulos (seta nativa)
   repetidos no modo escuro. O <select> original é mantido oculto e
   sincronizado, então todo código existente (.value, .innerHTML, events)
   continua funcionando sem nenhuma alteração. ─────────────────────────── */

(function () {

    // IDs dos selects do formulário principal e filtros que devem ser
    // convertidos. A sidebar (switchLista) e operadorbalAtivo ficam fora
    // pois têm estilo próprio e não sofrem o bug da mesma forma.
    const IDS_ALVO = [
        'tipo',
        'filtroNavio', 'filtroCliente', 'filtroTransportadora'
    ];

    // Guarda referência wrapper por id
    const _wrappers = {};

    function criarWrapper(select) {
        const id = select.id;

        // Evitar duplicação
        if (_wrappers[id]) return;

        // Ocultar o select nativo (mas mantê-lo no DOM)
        select.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
        select.setAttribute('tabindex', '-1');
        select.setAttribute('aria-hidden', 'true');

        // Wrapper externo
        const wrapper = document.createElement('div');
        wrapper.className = 'csel-wrapper';
        wrapper.dataset.selId = id;

        // Botão trigger (aparência visual)
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'csel-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const texto = document.createElement('span');
        texto.className = 'csel-texto';
        // Ler opção selecionada inicial
        const optSel = select.options[select.selectedIndex];
        texto.textContent = optSel ? optSel.text : 'Selecione...';
        if (optSel && optSel.value !== '') texto.classList.add('csel-selecionado');

        const seta = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        seta.setAttribute('viewBox', '0 0 12 12');
        seta.setAttribute('class', 'csel-seta');
        seta.innerHTML = '<path d="M6 8L1 3h10z"/>';

        trigger.appendChild(texto);
        trigger.appendChild(seta);

        // Lista de opções
        const lista = document.createElement('div');
        lista.className = 'csel-lista';
        lista.setAttribute('role', 'listbox');

        wrapper.appendChild(trigger);
        wrapper.appendChild(lista);

        // Inserir wrapper antes do select no DOM
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select); // mover select para dentro do wrapper

        _wrappers[id] = { wrapper, trigger, texto, lista, select };

        // Construir lista de opções a partir do select
        function reconstruirLista() {
            lista.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                const item = document.createElement('div');
                item.className = 'csel-item';
                item.textContent = opt.text;
                item.dataset.value = opt.value;
                if (opt.value === select.value) item.classList.add('csel-item-ativo');
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    select.value = opt.value;
                    // Disparar evento change no select nativo
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    sincronizarTexto();
                    fechar();
                });
                lista.appendChild(item);
            });
        }

        function sincronizarTexto() {
            const optAtual = select.options[select.selectedIndex];
            if (optAtual) {
                texto.textContent = optAtual.text;
                texto.classList.toggle('csel-selecionado', optAtual.value !== '');
            }
            // Marcar item ativo
            lista.querySelectorAll('.csel-item').forEach(el => {
                el.classList.toggle('csel-item-ativo', el.dataset.value === select.value);
            });
        }

        function abrir() {
            // Fechar outros abertos
            document.querySelectorAll('.csel-wrapper.aberto').forEach(w => {
                if (w !== wrapper) w.classList.remove('aberto');
            });
            reconstruirLista();
            wrapper.classList.add('aberto');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function fechar() {
            wrapper.classList.remove('aberto');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (wrapper.classList.contains('aberto')) fechar();
            else abrir();
        });

        // Fechar ao clicar fora
        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) fechar();
        });

        // Observar mudanças no select nativo (popularSelects altera innerHTML)
        const observer = new MutationObserver(function () {
            sincronizarTexto();
        });
        observer.observe(select, { childList: true, attributes: true, subtree: false });

        // Permitir reset via .value externo (ex: após salvar pesagem)
        const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (desc) {
            Object.defineProperty(select, 'value', {
                get: function () { return desc.get.call(this); },
                set: function (v) {
                    desc.set.call(this, v);
                    sincronizarTexto();
                },
                configurable: true
            });
        }
    }

    function inicializarTodos() {
        IDS_ALVO.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.tagName === 'SELECT' && !_wrappers[id]) {
                criarWrapper(el);
            }
        });
    }

    // Inicializar após DOM pronto e após popularSelects ter rodado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(inicializarTodos, 200);
        });
    } else {
        setTimeout(inicializarTodos, 200);
    }

    // Re-checar quando popularSelects for chamado (ele pode ser chamado
    // depois do carregamento assíncrono do IndexedDB)
    const _popOrig = window.popularSelects;
    if (typeof _popOrig === 'function') {
        window.popularSelects = function () {
            _popOrig.apply(this, arguments);
            // Sincronizar textos dos wrappers já criados
            setTimeout(function () {
                IDS_ALVO.forEach(id => {
                    const w = _wrappers[id];
                    if (!w) {
                        const el = document.getElementById(id);
                        if (el) criarWrapper(el);
                    } else {
                        // Re-sincronizar texto
                        const optAtual = w.select.options[w.select.selectedIndex];
                        if (optAtual) {
                            w.texto.textContent = optAtual.text;
                            w.texto.classList.toggle('csel-selecionado', optAtual.value !== '');
                        }
                    }
                });
            }, 50);
        };
    }

    window._cselInicializar = inicializarTodos;

})();

/* ── CustomAutocomplete: autocomplete para placa e motorista ─────────────
   Lista flutua no <body> com position:fixed + getBoundingClientRect.
   Background hardcoded para modo claro/escuro — sem depender de var() CSS.
   Seleção via pointerdown (não blur) para evitar race condition. ──────── */

(function () {

    const CAMPOS_AC = [
        { inputId: 'placa',          datalistId: 'lista-placas',          upper: true,  formatar: true  },
        { inputId: 'motorista',      datalistId: 'lista-motoristas',      upper: true,  formatar: false },
        { inputId: 'transportadora', datalistId: 'lista-transportadoras', upper: true,  formatar: false },
        { inputId: 'cliente',        datalistId: 'lista-clientes',        upper: true,  formatar: false },
        { inputId: 'mercadoria',     datalistId: 'lista-mercadorias',     upper: true,  formatar: false },
        { inputId: 'embarcacao',     datalistId: 'lista-embarcacoes',     upper: true,  formatar: false },
        { inputId: 'di',             datalistId: 'lista-dis',             upper: true,  formatar: false }
    ];

    let _lista      = null;
    let _inputAtivo = null;
    let _cfgAtiva   = null;
    let _itemFocado = -1;
    let _clicandoItem = false;  // flag para evitar fechar no blur

    function isDark() {
        return document.body.classList.contains('dark-mode');
    }

    function getLista() {
        if (!_lista) {
            _lista = document.createElement('div');
            _lista.id = 'cac-lista-global';
            // Estilos inline garantem fundo opaco independente de CSS cascade
            Object.assign(_lista.style, {
                position:     'fixed',
                display:      'none',
                zIndex:       '999999',
                maxHeight:    '220px',
                overflowY:    'auto',
                borderRadius: '6px',
                border:       '1px solid #2a3a52',
                boxShadow:    '0 8px 28px rgba(0,0,0,0.45)',
                fontFamily:   'IBM Plex Sans, system-ui, sans-serif',
                fontSize:     '13.5px',
                cursor:       'pointer',
            });
            document.body.appendChild(_lista);
        }
        // Atualizar cores conforme tema atual
        _lista.style.background = isDark() ? '#162033' : '#ffffff';
        _lista.style.color      = isDark() ? '#c8d8ec' : '#1e293b';
        _lista.style.border     = isDark() ? '1px solid #2a3a52' : '1px solid #cbd5e1';
        return _lista;
    }

    function posicionar(input) {
        const lista = getLista();
        const r = input.getBoundingClientRect();
        lista.style.left  = r.left + 'px';
        lista.style.width = r.width + 'px';
        lista.style.top   = (r.bottom + 3) + 'px';
    }

    function getOpcoes(datalistId) {
        const dl = document.getElementById(datalistId);
        if (!dl) return [];
        return Array.from(dl.options).map(o => o.value).filter(Boolean);
    }

    function mostrar(input, cfg, filtro) {
        const lista = getLista();
        const termo = (filtro || '').toUpperCase();
        const opcoes = getOpcoes(cfg.datalistId);
        const filtradas = termo.length === 0
            ? opcoes.slice(0, 60)
            : opcoes.filter(o => o.toUpperCase().includes(termo)).slice(0, 60);

        if (filtradas.length === 0) { fechar(); return; }

        _inputAtivo = input;
        _cfgAtiva   = cfg;
        _itemFocado = -1;
        lista.innerHTML = '';

        const corItemHover = isDark() ? '#1e2f45' : '#f1f5f9';
        const corTexto     = isDark() ? '#c8d8ec' : '#1e293b';
        const corBorda     = isDark() ? '#2a3a52' : '#e2e8f0';

        filtradas.forEach((val, idx) => {
            const item = document.createElement('div');
            item.textContent = val;
            item.dataset.idx = idx;
            Object.assign(item.style, {
                padding:      '8px 12px',
                borderBottom: `1px solid ${corBorda}`,
                color:        corTexto,
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
            });

            // pointerdown em vez de click — dispara antes do blur do input
            item.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                _clicandoItem = true;
                input.value = cfg.upper ? val.toUpperCase() : val;
                if (cfg.formatar && typeof window.formatarPlacaInput === 'function') {
                    window.formatarPlacaInput(input);
                }
                input.dispatchEvent(new Event('input',  { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                fechar();
                input.focus();
                _clicandoItem = false;
                // Trigger blur para preencher motorista automaticamente
                setTimeout(() => input.dispatchEvent(new Event('blur', { bubbles: true })), 80);
            });

            item.addEventListener('pointerenter', function () {
                lista.querySelectorAll('[data-idx]').forEach(el => el.style.background = '');
                item.style.background = corItemHover;
                _itemFocado = idx;
            });
            item.addEventListener('pointerleave', function () {
                item.style.background = '';
            });

            lista.appendChild(item);
        });

        posicionar(input);
        lista.style.display = 'block';
    }

    function fechar() {
        if (_lista) { _lista.style.display = 'none'; _lista.innerHTML = ''; }
        _inputAtivo = null;
        _cfgAtiva   = null;
        _itemFocado = -1;
    }

    function moverFoco(dir) {
        if (!_lista) return;
        const itens = _lista.querySelectorAll('[data-idx]');
        if (!itens.length) return;
        const corHover  = isDark() ? '#1e2f45' : '#f1f5f9';
        const corNormal = isDark() ? '#162033' : '#ffffff';
        itens[_itemFocado]?.style && (itens[_itemFocado].style.background = corNormal);
        _itemFocado = Math.max(0, Math.min(itens.length - 1, _itemFocado + dir));
        itens[_itemFocado].style.background = corHover;
        itens[_itemFocado].scrollIntoView({ block: 'nearest' });
    }

    function criarAutocomplete(cfg) {
        const input = document.getElementById(cfg.inputId);
        if (!input) return;

        // Remover vínculo nativo com datalist
        input.removeAttribute('list');

        input.addEventListener('input', function () {
            mostrar(this, cfg, this.value);
        });

        input.addEventListener('focus', function () {
            mostrar(this, cfg, this.value);
        });

        input.addEventListener('blur', function () {
            if (_clicandoItem) return;  // item sendo clicado — não fechar ainda
            setTimeout(fechar, 120);
        });

        input.addEventListener('keydown', function (e) {
            if (!_lista || _lista.style.display !== 'block') return;
            if (e.key === 'ArrowDown') { e.preventDefault(); moverFoco(+1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); moverFoco(-1); }
            if (e.key === 'Enter') {
                const itens = _lista.querySelectorAll('[data-idx]');
                if (_itemFocado >= 0 && itens[_itemFocado]) {
                    e.preventDefault();
                    itens[_itemFocado].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                }
            }
            if (e.key === 'Escape') fechar();
        });
    }

    // Fechar ao clicar fora
    document.addEventListener('pointerdown', function (e) {
        if (_lista && !_lista.contains(e.target) && e.target !== _inputAtivo) fechar();
    });

    window.addEventListener('resize', function () {
        if (_lista && _lista.style.display === 'block' && _inputAtivo) posicionar(_inputAtivo);
    });

    function inicializarAC() {
        CAMPOS_AC.forEach(cfg => {
            const input = document.getElementById(cfg.inputId);
            if (input && !input.dataset.cacIniciado) {
                input.dataset.cacIniciado = '1';
                criarAutocomplete(cfg);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(inicializarAC, 300));
    } else {
        setTimeout(inicializarAC, 300);
    }

})();
