function garantirClienteNoronha() {

    if (
        typeof listaclientess !== 'undefined'
    ) {

        if (
            !listaclientess.includes(
                CLIENTE_FIXO_NORONHA
            )
        ) {

            listaclientess.push(
                CLIENTE_FIXO_NORONHA
            );
        }
    }
}

function limparFormulario() {

    editIdx = -1;

    const cardForm = document.getElementById('card-form-pesagem');
    if (cardForm) cardForm.classList.remove('modo-edicao-ativo');

    const campos = [
        'tipo', 'sisplan', 'di', 'placa', 'motorista', 
        'transportadora', 'embarcacao', 'entrada', 'saida', 
        'observacoes', 'cliente', 'mercadoria',
        'dataEntrada', 'dataSaida'
    ];

    campos.forEach(id => {

        const el =
            document.getElementById(id);

        if (el) {
            el.value = "";
        }
    });

    const campoEntradaData = document.getElementById('dataEntrada');
    const campoSaidaData = document.getElementById('dataSaida');

    if (campoEntradaData) {
        campoEntradaData.disabled = true;
        campoEntradaData.value = "";
    }

    if (campoSaidaData) {
        campoSaidaData.disabled = true;
        campoSaidaData.value = "";
    }

    const btnSalvar =
        document.getElementById(
            'btnSalvar'
        );

    if (btnSalvar) {

        btnSalvar.textContent =
            "Salvar Pesagem";

        btnSalvar.classList.remove(
            'modo-edicao'
        );
    }

    const btnCancelar =
        document.getElementById(
            'btnCancelar'
        );

    if (btnCancelar) {

        btnCancelar.style.display =
            "none";
    }

    const containerPesoSaida =
        document.getElementById('container-peso-saida');
    if (containerPesoSaida) containerPesoSaida.style.display = "none";

    const containerDatas =
        document.getElementById('container-datas-edicao');
    if (containerDatas) containerDatas.style.display = "none";

    sincronizarSelectCliente();

    if (
        typeof popularSelects ===
        'function'
    ) {

        popularSelects();
    }

    if (
        typeof atualizarDatalists ===
        'function'
    ) {

        atualizarDatalists();
    }
}

function cancelarEdicao() {
    const cardForm = document.getElementById('card-form-pesagem');
    if (cardForm) cardForm.classList.remove('modo-edicao-ativo');
    limparFormulario();
}

function activarModoEdicaoBotao() {

    const btnSalvar =
        document.getElementById(
            'btnSalvar'
        );

    if (btnSalvar) {

        btnSalvar.textContent =
            "Salvar Edição";

        btnSalvar.classList.add(
            'modo-edicao'
        );
    }

    const btnCancelar =
        document.getElementById(
            'btnCancelar'
        );

    if (btnCancelar) {

        btnCancelar.style.display =
            "inline-block";
    }

    const containerPesoSaida =
        document.getElementById('container-peso-saida');
    if (containerPesoSaida) containerPesoSaida.style.display = "flex";

    const containerDatas =
        document.getElementById('container-datas-edicao');
    if (containerDatas) containerDatas.style.display = "grid";

    const campoEntradaManual = document.getElementById('dataEntrada');
    const campoSaidaManual   = document.getElementById('dataSaida');

    if (campoEntradaManual) { campoEntradaManual.disabled = false; campoEntradaManual.readOnly = false; campoEntradaManual.classList.remove('campo-bloqueado'); }
    if (campoSaidaManual)   { campoSaidaManual.disabled   = false; campoSaidaManual.readOnly   = false; campoSaidaManual.classList.remove('campo-bloqueado'); }

    const cardForm = document.getElementById('card-form-pesagem');
    if (cardForm) cardForm.classList.add('modo-edicao-ativo');
}

function adicionarNovoCliente() {
    
    const inputHTML = `
        <input type="text" id="novo-nome-cliente" 
               placeholder="Nome do cliente" 
               style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
    `;

    abrirModalSistema({
        titulo: "Adicionar Novo Cliente",
        mensagem: "Digite o nome do novo cliente:",
        conteudoExtra: inputHTML,
        botoes: [
            { 
                texto: "Salvar", 
                estilo: "success", 
                acao: () => {
                    const nome = document.getElementById('novo-nome-cliente').value.trim().toUpperCase();
                    
                    if (!nome) return;
                    if (listaclientess.includes(nome)) {
                        abrirModalSistema({
                            titulo: "Aviso",
                            mensagem: "Este cliente já existe na lista!",
                            botoes: [{ texto: "OK", estilo: "info", acao: () => {} }]
                        });
                        return;
                    }

                    listaclientess.push(nome);
                    listaclientess.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

                    if (typeof salvar === 'function') {
                        salvar();
                    }

                    sincronizarSelectCliente();
                    document.getElementById('cliente').value = nome;
                }
            },
            { 
                texto: "Cancelar", 
                estilo: "secondary", 
                acao: () => {} 
            }
        ]
    });
}

window.addEventListener(
    'load',
    () => {

        garantirClienteNoronha();

        sincronizarSelectCliente();
    }
);