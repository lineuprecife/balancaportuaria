
let dados = window.dados;

function _substituirLista(alvo, novos) {
    if (typeof window.substituirLista === 'function') {
        return window.substituirLista(alvo, novos);
    }
    if (!Array.isArray(alvo)) return;
    alvo.length = 0;
    if (Array.isArray(novos)) novos.forEach(i => alvo.push(i));
}

let editIdx = -1;

const CLIENTE_FIXO_NORONHA = 'EMBARCAÇÕES NORONHA';

const regrasOperacao = {
    'EMBARCAÇÃO->FORA DO PORTO(DESCARGA)': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: true },
    'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: false },
    'ARMAZÉM DO PORTO->FORA DO PORTO (EXPEDIÇÃO)': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: true },
    'ARMAZÉM DO PORTO->ARMAZÉM DO PORTO': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: true },
    'ARMAZÉM DO PORTO->EMBARCAÇÃO': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: true },
    'FORA DO PORTO->ARMAZÉM DO PORTO': { placa: true, motorista: true, cliente: true, embarcacao: false, mercadoria: true, di: false },
    'FORA DO PORTO->EMBARCAÇÃO(EMBARQUE)': { placa: true, motorista: true, cliente: true, embarcacao: true, mercadoria: true, di: true },
    'ARMAZÉM/PÁTIO DE TERCEIROS->FORA DO PORTO(EXPEDIÇÃO DE TERCEIROS)': { placa: true, motorista: true, cliente: true, embarcacao: false, mercadoria: true, di: false },
    'APENAS PESAGEM DE AFERIÇÃO': { placa: true, motorista: true, cliente: false, embarcacao: false, mercadoria: false, di: false },
    'ENTRADA PARA SERVIÇOS': { placa: true, motorista: true, cliente: false, embarcacao: false, mercadoria: false, di: false }
};

const TIPOS_OPERACAO = [
    'EMBARCAÇÃO->FORA DO PORTO(DESCARGA)',
    'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)',
    'ARMAZÉM DO PORTO->FORA DO PORTO (EXPEDIÇÃO)',
    'ARMAZÉM/PÁTIO DE TERCEIROS->FORA DO PORTO(EXPEDIÇÃO DE TERCEIROS)',
    'FORA DO PORTO->EMBARCAÇÃO(EMBARQUE)',
    'APENAS PESAGEM DE AFERIÇÃO',
    'ENTRADA PARA SERVIÇOS',
    'ARMAZÉM DO PORTO->ARMAZÉM DO PORTO',
    'ARMAZÉM DO PORTO->EMBARCAÇÃO',
    'FORA DO PORTO->ARMAZÉM DO PORTO',
];

window.salvar = async function () {
    if (typeof window.electronAPI === 'undefined') return;

    const mapa = [
        ['clientes',        'listaclientess'],
        ['mercadorias',     'listaMercadorias'],
        ['embarcacoes',     'listaEmbarcacoes'],
        ['motoristas',      'listaMotoristas'],
        ['placas',          'listaPlacas'],
        ['transportadoras', 'listaTransportadoras'],
        ['operadoresbal',      'listaoperadoresbal'],
        ['coordenadores',   'listaCoordenadores'],
    ];
    for (const [chave, varGlobal] of mapa) {
        await window.electronAPI.cadastros.set(chave, window[varGlobal] || []);
    }
    console.log('[BP] Cadastros salvos automaticamente em C:\\BalancaPortuaria\\dados_cadastros\\cadastros_balanca.json');
};

window.carregarListasDoIndexedDB = async function () {
    if (typeof window.electronAPI === 'undefined') return;

    const mapa = [
        ['clientes',        'listaclientess'],
        ['mercadorias',     'listaMercadorias'],
        ['embarcacoes',     'listaEmbarcacoes'],
        ['motoristas',      'listaMotoristas'],
        ['placas',          'listaPlacas'],
        ['transportadoras', 'listaTransportadoras'],
        ['operadoresbal',      'listaoperadoresbal'],
        ['coordenadores',   'listaCoordenadores'],
    ];
    for (const [chave, varGlobal] of mapa) {
        try {
            const lista = await window.electronAPI.cadastros.get(chave);
            if (Array.isArray(lista) && lista.length > 0) {
                _substituirLista(window[varGlobal], lista);
            }
        } catch (e) {  }
    }

    if (!window.listaclientess.includes(CLIENTE_FIXO_NORONHA)) {
        window.listaclientess.push(CLIENTE_FIXO_NORONHA);
    }
};
