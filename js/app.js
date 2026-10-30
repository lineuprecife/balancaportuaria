window.appState = {
    dados: [],
    listas: {
        clientess: [],
        mercadorias: [],
        embarcacoes: [],
        motoristas: [],
        placas: [],
        operadoresbal: [],
        coordenadores: [],
        transportadoras: []
    }
};

window.dados = window.appState.dados;

window.listaclientess      = window.appState.listas.clientess;
window.listaMercadorias    = window.appState.listas.mercadorias;
window.listaEmbarcacoes    = window.appState.listas.embarcacoes;
window.listaMotoristas     = window.appState.listas.motoristas;
window.listaPlacas         = window.appState.listas.placas;
window.listaoperadoresbal     = window.appState.listas.operadoresbal;
window.listaCoordenadores  = window.appState.listas.coordenadores;
window.listaTransportadoras = window.appState.listas.transportadoras;

window.substituirLista = function (listaAlvo, novosItens) {
    if (!Array.isArray(listaAlvo)) return;
    listaAlvo.length = 0;
    if (Array.isArray(novosItens)) {
        novosItens.forEach(item => listaAlvo.push(item));
    }
};

window.exporGlobal = function (nome, referencia) {
    window[nome] = referencia;
};
