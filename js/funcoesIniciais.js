function popularTiposOperacao() {
    const select = document.getElementById("tipo");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione...</option>';

    if (typeof TIPOS_OPERACAO !== 'undefined' && Array.isArray(TIPOS_OPERACAO)) {
        TIPOS_OPERACAO.forEach(tipo => {
            select.innerHTML += `<option value="${tipo}">${tipo}</option>`;
        });
    }
}

if (!window.crypto) {
    window.crypto = {};
}

if (!crypto.randomUUID) {
    crypto.randomUUID = function () {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    };
}

window.onload = function () {
    
    try {
        const btnDark = document.getElementById('btn-darkmode');
        
        const temaSalvo = sessionStorage.getItem('balanca_tema_escuro');
        const isDark = temaSalvo === 'true';

        if (isDark) {
            document.body.classList.add('dark-mode');
            if (btnDark) {
                btnDark.innerHTML = "☼";
                btnDark.title = "Ativar Modo Claro";
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (btnDark) {
                btnDark.innerHTML = "☾";
                btnDark.title = "Ativar Modo Escuro";
            }
        }
    } catch (e) {
        console.warn("Aviso no carregamento inicial do tema:", e);
    }

    if (typeof restaurarAutoBackup === 'function') restaurarAutoBackup();
    popularTiposOperacao();
    avisarImpressoraContingencia();

    (async () => {
        try {
            
            if (typeof window.carregarListasDoIndexedDB === 'function') {
                await window.carregarListasDoIndexedDB();
            }

            if (typeof popularSelects === 'function') popularSelects();

            const operadorbalSessao = sessionStorage.getItem('sisplan_operadorbal_sessao');
            const selectoperadorbal = document.getElementById('operadorbalAtivo');
            if (operadorbalSessao && selectoperadorbal) {
                selectoperadorbal.value = operadorbalSessao;
            }

            if (typeof atualizarDatalists === 'function') atualizarDatalists();

            if (typeof db !== 'undefined' && db.movimentacoes && typeof _recarregarDados === 'function') {
                await _recarregarDados();
                console.log(`Registros carregados: ${dados.length}`);
            }

        } catch (erro) {
            console.error('Erro ao carregar dados iniciais:', erro);
        }

        if (typeof render === 'function') render();
    })();

    document.getElementById('placa')?.addEventListener('blur', function() {
        const placaDigitada = this.value.trim().toUpperCase();
        if (placaDigitada.length < 7) return;

        if (typeof dados !== 'undefined' && Array.isArray(dados)) {
            const ultimoRegistro = [...dados]
                .reverse()
                .find(d => d.placa === placaDigitada && d.motorista && d.transportadora);

            if (ultimoRegistro) {
                const campoMotorista = document.getElementById('motorista');
                const campoTransp = document.getElementById('transportadora');

                if (campoMotorista && !campoMotorista.value) {
                    campoMotorista.value = ultimoRegistro.motorista;
                }
                if (campoTransp && (!campoTransp.value || campoTransp.value === "AVULSO")) {
                    campoTransp.value = ultimoRegistro.transportadora || "AVULSO";
                }
            }
        }
    });
};

function avisarImpressoraContingencia() {
    if (sessionStorage.getItem('bp_aviso_impressora_exibido') === 'true') return;

    if (typeof abrirModalSistema !== 'function') return;

    // A tela de trava do SISPLAN (#trava-sisplan-modal) é criada de forma
    // assíncrona e pode aparecer/reaparecer depois do carregamento inicial,
    // usando o mesmo z-index do nosso aviso. Por isso esperamos ela ser
    // fechada (ou nunca aparecer) antes de mostrar o aviso da impressora,
    // garantindo que ele não fique escondido atrás da tela de contingência.
    let tentativas = 0;
    const aguardar = setInterval(() => {
        tentativas++;
        const travaAberta = !!document.getElementById('trava-sisplan-modal');

        if (!travaAberta || tentativas > 150) { // até ~60s de espera
            clearInterval(aguardar);
            sessionStorage.setItem('bp_aviso_impressora_exibido', 'true');

            abrirModalSistema({
                titulo: "⚠ Verifique a Impressora",
                mensagem: "Este sistema é usado em contingência, quando a rede ou o Sisplan estão fora do ar. " +
                           "Como a impressora também é conectada pela rede, ela pode estar indisponível nesse momento. " +
                           "Antes de imprimir qualquer ticket, confira se a impressora está respondendo e, se necessário, " +
                           "conecte-a diretamente ao computador da balança por cabo (USB/local).",
                botoes: [
                    { texto: "Entendido", estilo: "info", acao: () => {} }
                ]
            });
        }
    }, 400);
}

function alternarModoEscuro() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const btnDark = document.getElementById('btn-darkmode');
    const isDark = body.classList.contains('dark-mode');

    sessionStorage.setItem('balanca_tema_escuro', isDark ? 'true' : 'false');
    
    if (isDark) {
        
        if (btnDark) {
            btnDark.innerHTML = "☼"; 
            btnDark.title = "Ativar Modo Claro";
        }
    } else {
        
        if (btnDark) {
            btnDark.innerHTML = "☾"; 
            btnDark.title = "Ativar Modo Escuro";
        }
    }
}