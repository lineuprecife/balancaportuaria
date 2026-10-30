function validarCamposOperacao() {
    const tipo = document.getElementById('tipo')?.value || "";

    if (!tipo) {
        return ["Tipo de Operação"];
    }

    const regra = (typeof regrasOperacao !== 'undefined' && regrasOperacao[tipo]) ? regrasOperacao[tipo] : null;

    if (!regra) {
        return [];
    }

    const faltando = [];

    const placa = document.getElementById('placa')?.value.trim() || "";
    const motorista = document.getElementById('motorista')?.value.trim() || "";
    const cliente = document.getElementById('cliente')?.value.trim() || ""; 
    const transportadora = document.getElementById('transportadora')?.value.trim() || ""; 
    const embarcacao = document.getElementById('embarcacao')?.value.trim() || "";
    const mercadoria = document.getElementById('mercadoria')?.value.trim() || "";
    const di = document.getElementById('di')?.value.trim() || "";
    const pesoEntrada = document.getElementById('entrada')?.value.trim() || "";
    const operadorbal = document.getElementById('operadorbalAtivo')?.value.trim() || "";

    if (regra.placa && !placa) faltando.push("Placa");
    if (regra.motorista && !motorista) faltando.push("Motorista");
    if (regra.cliente && !cliente) faltando.push("Cliente");
    
    if (!transportadora) faltando.push("Transportadora");

    if (regra.embarcacao && !embarcacao) faltando.push("Embarcação");
    if (regra.mercadoria && !mercadoria) faltando.push("Mercadoria");

    const limiteFixoNoronha = typeof CLIENTE_FIXO_NORONHA !== 'undefined' ? CLIENTE_FIXO_NORONHA : "EMBARCAÇÕES NORONHA";
    const clienteNoronha = cliente.toUpperCase() === limiteFixoNoronha.toUpperCase();

    if (regra.di && !clienteNoronha && !di)
    faltando.push("DI");

if (!pesoEntrada)
    faltando.push("Peso de Entrada");

if (!operadorbal)
    faltando.push("operador da Balança");

return faltando;
}

function validaroperadorbalAtivo() {

    const operadorbal = document.getElementById('operadorbalAtivo')?.value.trim() || "";

    if (!operadorbal) {
        abrirModalSistema({
            titulo: "Acesso Restrito",
            mensagem: "Selecione o operador da Balança antes de realizar alterações no sistema.",
            botoes: [
                { 
                    texto: "Entendido", 
                    estilo: "danger", 
                    acao: () => {
                        const el = document.getElementById('operadorbalAtivo');
                        if (el) el.focus();
                    } 
                }
            ]
        });

        return false;
    }

    return true;
}

// Faixa de peso considerada plausível para um veículo/carga no porto.
// Ajuste estes dois números se algum tipo de carga legítima ficar fora
// da faixa (ex: cargas muito leves ou muito pesadas de aferição).
const PESO_MIN_KG_ACEITAVEL = 300;
const PESO_MAX_KG_ACEITAVEL = 150000;

// Verifica se um valor de peso (já com o "." de milhar, ex: "15.000")
// está dentro da faixa plausível. Serve tanto para o peso de entrada
// quanto o de saída.
function _pesoDentroDaFaixa(valorFormatado) {
    const numero = parseFloat((valorFormatado || '').toString().replace(/\./g, ''));
    if (!numero || isNaN(numero)) return false;
    return numero >= PESO_MIN_KG_ACEITAVEL && numero <= PESO_MAX_KG_ACEITAVEL;
}

// Verifica se o peso digitado é, na prática, o número do registro (Sisplan)
// digitado por engano no campo errado — ex: o operador quis digitar o
// Sisplan mas o cursor estava no campo de peso. Compara os dígitos puros.
function _pesoParecComRegistro(valorFormatadoPeso, valorSisplan) {
    const digitosPeso     = (valorFormatadoPeso || '').toString().replace(/\D/g, '');
    const digitosSisplan  = (valorSisplan || '').toString().replace(/\D/g, '');
    return !!digitosPeso && !!digitosSisplan && digitosPeso === digitosSisplan;
}

// Usada antes de salvar/registrar qualquer peso (entrada ou saída).
// Retorna:
//   { tipo: 'bloqueio', mensagem }  → erro certo, não deixa salvar (ex: peso
//                                     igual ao número do Sisplan — não existe
//                                     caso legítimo para isso).
//   { tipo: 'aviso',    mensagem }  → parece errado, mas pode ser uma carga
//                                     fora do comum de verdade; o operador
//                                     pode confirmar e salvar assim mesmo.
//   null                            → peso ok.
function validarPesoOuMotivoErro(valorFormatadoPeso, valorSisplan, rotuloCampo) {
    if (_pesoParecComRegistro(valorFormatadoPeso, valorSisplan)) {
        return {
            tipo: 'bloqueio',
            mensagem: `O ${rotuloCampo} informado (${valorFormatadoPeso} kg) é igual ao número do registro Sisplan. Confira se não digitou o Sisplan no campo de peso por engano.`
        };
    }
    if (!_pesoDentroDaFaixa(valorFormatadoPeso)) {
        return {
            tipo: 'aviso',
            mensagem: `O ${rotuloCampo} informado (${valorFormatadoPeso || '0'} kg) está fora da faixa normalmente esperada (${PESO_MIN_KG_ACEITAVEL} a ${PESO_MAX_KG_ACEITAVEL} kg). Confira se o valor está correto antes de confirmar.`
        };
    }
    return null;
}

function verificarPlacaEmTransito(placaAtual) {
    if (!placaAtual) return false;
    
    return dados.some((d, idx) => {

        if (typeof editIdx !== 'undefined' && editIdx === idx) return false;
        
        const mesmaPlaca = d.placa && d.placa.trim().toUpperCase() === placaAtual.trim().toUpperCase();
        const semSaida = !d.saida && !d.saidaVazia;
        const naoCancelado = !d.cancelado;

        return mesmaPlaca && semSaida && naoCancelado;
    });
}