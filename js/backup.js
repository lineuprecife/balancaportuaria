
function _coletarListas() {
    return {
        clientes:        window.listaclientess       || [],
        mercadorias:     window.listaMercadorias      || [],
        embarcacoes:     window.listaEmbarcacoes      || [],
        motoristas:      window.listaMotoristas       || [],
        placas:          window.listaPlacas           || [],
        transportadoras: window.listaTransportadoras  || [],
        operadoresbal:      window.listaoperadoresbal       || [],
        coordenadores:   window.listaCoordenadores    || []
    };
}

// Antes, esta função gravava um arquivo novo com o histórico inteiro de
// pesagens A CADA salvamento (entrada, edição, saída, vazio). Com centenas
// de registros, isso significava reescrever um arquivo cada vez maior no
// disco em praticamente toda ação do operador — um dos principais motivos
// do sistema "travar" ao salvar. O arquivo movimentacoes.json principal
// (gravado pelo processo main a cada ação, via db:movimentacoes:*) já
// garante que nada é perdido, então este backup extra passa a rodar no
// máximo 1 vez a cada _INTERVALO_MIN_BACKUP_MS — continua protegendo contra
// perda de dados, só que sem repetir a gravação pesada em toda pesagem.
let _ultimoBackupSilenciosoEm = 0;
const _INTERVALO_MIN_BACKUP_MS = 90 * 1000;

async function autoBackupSilencioso() {
    const agora = Date.now();
    if (agora - _ultimoBackupSilenciosoEm < _INTERVALO_MIN_BACKUP_MS) return;
    _ultimoBackupSilenciosoEm = agora;

    try {
        const movimentacoes = await db.movimentacoes.toArray();
        const backup = {
            sistema:        'Balança Portuária — Porto do Recife',
            versao:         '5.0-electron-auto',
            dataExportacao: new Date().toISOString(),
            tipo:           'auto-pesagem',
            listas:         _coletarListas(),
            movimentacoes
        };
        const json     = JSON.stringify(backup, null, 2);
        const dataHora = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
        await window.electronAPI.backup.exportarAuto(json, `auto_pesagem_${dataHora}.json`);
    } catch (e) {
        console.warn('[BP] Auto-backup silencioso falhou:', e.message);
    }
}

async function exportarBackupCompleto() {
    try {
        const resultado = await window.electronAPI.backup.backupCompleto();
        abrirModalSistema({
            titulo:   'Backup Realizado',
            mensagem: `Backup automático gerado com sucesso em:\nC:\\BalancaPortuaria\\backups`,
            botoes:   [{ texto: 'OK', estilo: 'info', acao: () => {} }]
        });
    } catch (erro) {
        abrirModalSistema({
            titulo:   'Erro ao Gerar Backup',
            mensagem: 'Não foi possível gerar o backup: ' + erro.message,
            botoes:   [{ texto: 'Fechar', estilo: 'danger', acao: () => {} }]
        });
    }
}

async function restaurarDeBackup(dadosBackup) {
    if (!dadosBackup) return;

    const temMovimentacoes = Array.isArray(dadosBackup.movimentacoes) && dadosBackup.movimentacoes.length > 0;

    const listas = dadosBackup.listas || dadosBackup.cadastros || {};
    if (listas && typeof listas === 'object') {
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
            if (Array.isArray(listas[chave])) {
                _substituirLista(window[varGlobal], listas[chave]);
                await window.electronAPI.cadastros.set(chave, listas[chave]);
            }
        }
    }

    if (temMovimentacoes) {
        await window.electronAPI.movimentacoes.importarLote(dadosBackup.movimentacoes);
        const rows = await db.movimentacoes.toArray();
        dados.length = 0;
        rows.forEach(r => dados.push(r));
    }

    if (typeof render           === 'function') render();
    if (typeof popularSelects   === 'function') popularSelects();
}

async function restaurarAutoBackup() {
    
    console.log('[BP] Sistema de auto-recuperação iniciado.');
}

async function verificarPrimeiroAcesso() {
    const rows = await db.movimentacoes.toArray();
    return rows.length === 0;
}
