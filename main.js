
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

// Corrige um bug conhecido do Chromium/Windows envolvendo a GPU, que causa
// corrupção visual (ex: a setinha do <select> "carimbada" repetidas vezes
// preenchendo a caixa toda, mais visível em telas escuras) ao abrir popups
// nativos como a lista de um <select>. Precisa ser chamado antes de
// app.whenReady()/app.requestSingleInstanceLock(). O app passa a renderizar
// via CPU; como este sistema não tem gráficos pesados, não há perda
// perceptível de desempenho.
app.disableHardwareAcceleration();

// Evita que o sistema seja aberto duas vezes ao mesmo tempo (ex: dois
// perfis do Windows com troca rápida de usuário, ou duplo-clique repetido
// no atalho). Como todos os dados ficam em arquivos JSON compartilhados
// sem trava entre processos, duas instâncias rodando ao mesmo tempo
// poderiam sobrescrever os dados uma da outra. Se já existir uma instância
// aberta, esta nova apenas foca a janela existente e se fecha.
let janelaPrincipal = null;

const podeSerInstanciaUnica = app.requestSingleInstanceLock();

if (!podeSerInstanciaUnica) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (janelaPrincipal) {
            if (janelaPrincipal.isMinimized()) janelaPrincipal.restore();
            janelaPrincipal.focus();
        }
    });
}

const PASTA_BASE          = 'C:\\BalancaPortuaria';
const PASTA_CADASTROS     = path.join(PASTA_BASE, 'dados_cadastros');
const PASTA_MOVIMENTACOES = path.join(PASTA_BASE, 'dados_movimentacoes');
const PASTA_BACKUPS       = path.join(PASTA_BASE, 'backups');
const PASTA_RELATORIOS    = path.join(PASTA_BASE, 'relatorios');
const PASTA_LOGS          = path.join(PASTA_BASE, 'logs');

const ARQUIVO_CADASTROS     = path.join(PASTA_CADASTROS,     'cadastros_balanca.json');
const ARQUIVO_MOVIMENTACOES = path.join(PASTA_MOVIMENTACOES, 'movimentacoes.json');
const ARQUIVO_CONTINGENCIAS = path.join(PASTA_MOVIMENTACOES, 'contingencias.json');
const ARQUIVO_LOGS          = path.join(PASTA_MOVIMENTACOES, 'logs.json');
const ARQUIVO_PROXIMO_ID    = path.join(PASTA_MOVIMENTACOES, 'proximoId.json');

function garantirPastas() {
    const pastaBaseJaExistia = fs.existsSync(PASTA_BASE);

    [
        PASTA_BASE,
        PASTA_CADASTROS,
        PASTA_MOVIMENTACOES,
        PASTA_BACKUPS,
        PASTA_RELATORIOS,
        PASTA_LOGS
    ].forEach(p => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    // Garante que qualquer usuário do Windows (qualquer perfil) tenha
    // permissão de leitura/escrita em C:\BalancaPortuaria. Sem isso, um
    // perfil diferente do que criou a pasta pode não conseguir gravar nela
    // e o app parece "iniciar zerado" para esse usuário.
    if (process.platform === 'win32' && !pastaBaseJaExistia) {
        const { exec } = require('child_process');
        exec(`icacls "${PASTA_BASE}" /grant *S-1-1-0:(OI)(CI)M /T`, (err) => {
            if (err) console.error('[BP] Não foi possível ajustar permissões da pasta:', err.message);
            else console.log('[BP] Permissões da pasta C:\\BalancaPortuaria liberadas para todos os usuários.');
        });
    }
}

function lerJSON(caminho, padrao) {
    try {
        if (fs.existsSync(caminho)) {
            const raw = fs.readFileSync(caminho, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error(`[BP] Erro ao ler ${caminho}:`, e.message);
        
        const bak = caminho + '.bak';
        try {
            if (fs.existsSync(bak)) {
                const rawBak = fs.readFileSync(bak, 'utf8');
                console.log(`[BP] Recuperado de backup: ${bak}`);
                return JSON.parse(rawBak);
            }
        } catch (e2) {  }
    }
    return padrao;
}

function gravarJSON(caminho, dados) {
    const json = JSON.stringify(dados, null, 2);
    
    const tmp = caminho + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    
    if (fs.existsSync(caminho)) {
        try { fs.copyFileSync(caminho, caminho + '.bak'); } catch(e) {  }
    }
    fs.renameSync(tmp, caminho);
}

function lerCadastros() {
    const raw = lerJSON(ARQUIVO_CADASTROS, {});
    
    if (raw && raw.listas && typeof raw.listas === 'object') {
        const achatado = { ...raw.listas };
        for (const [k, v] of Object.entries(raw)) {
            if (k !== 'listas' && k.startsWith('_config_')) achatado[k] = v;
        }
        return achatado;
    }
    return raw;
}

function gravarCadastros(dados) {
    garantirPastas();
    gravarJSON(ARQUIVO_CADASTROS, dados);
}

let estado = {
    movimentacoes: [],
    logs:          [],
    contingencias: [],
    cadastros:     {},
    proximoId:     { mov: 1, log: 1, cont: 1 }
};

function carregarEstado() {
    garantirPastas();

    if (!fs.existsSync(ARQUIVO_CADASTROS)) {
        gravarJSON(ARQUIVO_CADASTROS, {});
    }

    estado.movimentacoes = lerJSON(ARQUIVO_MOVIMENTACOES, []);
    estado.logs          = lerJSON(ARQUIVO_LOGS,          []);
    estado.contingencias = lerJSON(ARQUIVO_CONTINGENCIAS, []);
    estado.cadastros     = lerCadastros();
    estado.proximoId     = lerJSON(ARQUIVO_PROXIMO_ID, { mov: 1, log: 1, cont: 1 });

    const maxMov  = estado.movimentacoes.reduce((m, r) => Math.max(m, r.id || 0), 0);
    const maxLog  = estado.logs.reduce((m, r) => Math.max(m, r.id || 0), 0);
    const maxCont = estado.contingencias.reduce((m, r) => Math.max(m, r.id || 0), 0);
    estado.proximoId.mov  = Math.max(estado.proximoId.mov,  maxMov  + 1);
    estado.proximoId.log  = Math.max(estado.proximoId.log,  maxLog  + 1);
    estado.proximoId.cont = Math.max(estado.proximoId.cont, maxCont + 1);

    console.log(`[BP] Dados carregados: ${estado.movimentacoes.length} movimentações`);
    console.log(`[BP] Pasta de dados: ${PASTA_BASE}`);
}

function salvarMovimentacoes() { gravarJSON(ARQUIVO_MOVIMENTACOES, estado.movimentacoes); }
function salvarLogs()          { gravarJSON(ARQUIVO_LOGS,          estado.logs); }
function salvarContingencias() { gravarJSON(ARQUIVO_CONTINGENCIAS, estado.contingencias); }
function salvarCadastros()     { gravarCadastros(estado.cadastros); }
function salvarProximoId()     { gravarJSON(ARQUIVO_PROXIMO_ID,    estado.proximoId); }

let _backupTimer = null;

function agendarBackupAutomatico() {
    if (_backupTimer) clearTimeout(_backupTimer);
    
    _backupTimer = setInterval(() => {
        realizarBackupAutomatico();
    }, 30 * 60 * 1000);
}

function realizarBackupAutomatico() {
    try {
        const dataHora = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
        const nomeArq  = `backup_auto_${dataHora}.json`;
        const destino  = path.join(PASTA_BACKUPS, nomeArq);

        const backup = {
            sistema:        'Balança Portuária — Porto do Recife',
            versao:         '5.0-electron-auto',
            dataExportacao: new Date().toISOString(),
            tipo:           'automatico',
            cadastros:      estado.cadastros,
            movimentacoes:  estado.movimentacoes,
            contingencias:  estado.contingencias,
            logs:           estado.logs
        };

        fs.writeFileSync(destino, JSON.stringify(backup, null, 2), 'utf8');

        _limparBackupsAntigos();

        console.log(`[BP] Backup automático: ${nomeArq}`);
    } catch (e) {
        console.error('[BP] Erro no backup automático:', e.message);
    }
}

function _limparBackupsAntigos() {
    try {
        const arquivos = fs.readdirSync(PASTA_BACKUPS)
            .filter(f => f.startsWith('backup_auto_'))
            .sort();
        
        while (arquivos.length > 30) {
            const antigo = arquivos.shift();
            try { fs.unlinkSync(path.join(PASTA_BACKUPS, antigo)); } catch(e) {  }
        }
    } catch(e) {  }
}

// O renderer grava um snapshot ("auto_pesagem_*.json") a cada pesagem salva,
// como rede de segurança extra além do movimentacoes.json principal. Antes,
// esses arquivos nunca eram apagados: depois de centenas de pesagens, a pasta
// de backups acumulava milhares de arquivos (cada um com o histórico
// inteiro), o que ia deixando toda gravação progressivamente mais pesada.
// Mantemos só os mais recentes, do mesmo jeito que já era feito para os
// backups automáticos de 30 em 30 minutos.
function _limparAutoPesagemAntigos() {
    try {
        const arquivos = fs.readdirSync(PASTA_BACKUPS)
            .filter(f => f.startsWith('auto_pesagem_'))
            .sort();

        while (arquivos.length > 50) {
            const antigo = arquivos.shift();
            try { fs.unlinkSync(path.join(PASTA_BACKUPS, antigo)); } catch(e) {  }
        }
    } catch(e) {  }
}

function criarJanela() {
    Menu.setApplicationMenu(null);

    const win = new BrowserWindow({
        width: 1400, height: 900, minWidth: 900, minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        title: 'Balança Portuária — Porto do Recife',
        icon: path.join(__dirname, 'assets', 'icone-balanca.ico'),
        webPreferences: {
            preload:          path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration:  false,
        }
    });

    janelaPrincipal = win;

    win.loadFile(path.join(__dirname, 'index.html'));

    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
    });

    win.webContents.setWindowOpenHandler(() => ({
        action: 'allow',
        overrideBrowserWindowOptions: {
            title:  'Balança Portuária — Impressão',
            width:  900, height: 700,
            autoHideMenuBar: true,
            icon:   path.join(__dirname, 'assets', 'icone-balanca.ico'),
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        }
    }));

    let _podeFechjar = false;

    win.on('close', (e) => {
        if (_podeFechjar) {
            salvarMovimentacoes();
            salvarContingencias();
            salvarCadastros();
            salvarLogs();
            salvarProximoId();
            return;
        }
        e.preventDefault();
        win.webContents.send('app:solicitarFechamento');
    });

    ipcMain.on('app:confirmarFechamento', () => {
        _podeFechjar = true;
        win.close();
    });
}

app.whenReady().then(() => {
    carregarEstado();
    criarJanela();
    agendarBackupAutomatico();
});

app.on('window-all-closed', () => {
    if (_backupTimer) clearInterval(_backupTimer);
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('db:movimentacoes:getAll', () => estado.movimentacoes);

ipcMain.handle('db:movimentacoes:add', (_, pesagem) => {
    const id = estado.proximoId.mov++;
    estado.movimentacoes.push({ ...pesagem, id });
    salvarMovimentacoes();
    salvarProximoId();
    return { id };
});

ipcMain.handle('db:movimentacoes:update', (_, id, pesagem) => {
    const idx = estado.movimentacoes.findIndex(r => r.id === id);
    if (idx !== -1) estado.movimentacoes[idx] = { ...estado.movimentacoes[idx], ...pesagem, id };
    salvarMovimentacoes();
    return { ok: true };
});

ipcMain.handle('db:movimentacoes:delete', (_, id) => {
    estado.movimentacoes = estado.movimentacoes.filter(r => r.id !== id);
    salvarMovimentacoes();
    return { ok: true };
});

ipcMain.handle('db:movimentacoes:clear', () => {
    estado.movimentacoes = [];
    salvarMovimentacoes();
    return { ok: true };
});

ipcMain.handle('db:movimentacoes:importarLote', (_, movs) => {
    estado.movimentacoes = [];
    for (const m of movs) {
        const { id: _ignorado, ...semId } = m;
        const id = estado.proximoId.mov++;
        estado.movimentacoes.push({ ...semId, id });
    }
    salvarMovimentacoes();
    salvarProximoId();
    return { ok: true, total: estado.movimentacoes.length };
});

ipcMain.handle('db:logs:add', (_, log) => {
    const id = estado.proximoId.log++;
    estado.logs.push({ ...log, id });
    salvarLogs();
    salvarProximoId();
    return { id };
});

ipcMain.handle('db:logs:getAll', () => estado.logs);

ipcMain.handle('db:logs:clear', () => {
    estado.logs = [];
    salvarLogs();
    return { ok: true };
});

ipcMain.handle('db:contingencias:getAll', () => estado.contingencias);

ipcMain.handle('db:contingencias:add', (_, c) => {
    const id = estado.proximoId.cont++;
    estado.contingencias.push({ ...c, id });
    salvarContingencias();
    salvarProximoId();
    return { id };
});

ipcMain.handle('db:contingencias:update', (_, id, c) => {
    const idx = estado.contingencias.findIndex(r => r.id === id);
    if (idx !== -1) estado.contingencias[idx] = { ...estado.contingencias[idx], ...c };
    salvarContingencias();
    return { ok: true };
});

ipcMain.handle('db:contingencias:delete', (_, id) => {
    estado.contingencias = estado.contingencias.filter(r => r.id !== id);
    salvarContingencias();
    return { ok: true };
});

ipcMain.handle('db:contingencias:clear', () => {
    estado.contingencias = [];
    salvarContingencias();
    return { ok: true };
});

ipcMain.handle('db:cadastros:get', (_, tipo) => estado.cadastros[tipo] || []);

ipcMain.handle('db:cadastros:set', (_, tipo, lista) => {
    estado.cadastros[tipo] = lista;
    salvarCadastros();
    return { ok: true };
});

ipcMain.handle('db:cadastros:getAll', () => estado.cadastros);

ipcMain.handle('db:backup:exportarAuto', (_, conteudoJson, nomeArquivo) => {
    garantirPastas();
    const destino = path.join(PASTA_BACKUPS, nomeArquivo);
    fs.writeFileSync(destino, conteudoJson, 'utf8');
    _limparAutoPesagemAntigos();
    return { ok: true, caminho: destino };
});

ipcMain.handle('db:backup:exportar', (_, conteudoJson, nomeArquivo) => {
    garantirPastas();
    const destino = path.join(PASTA_BACKUPS, nomeArquivo);
    fs.writeFileSync(destino, conteudoJson, 'utf8');
    return { ok: true, caminho: destino };
});

ipcMain.handle('db:arquivo:salvarPDF', (_, nomeArquivo, base64Data) => {
    garantirPastas();
    const destino = path.join(PASTA_RELATORIOS, nomeArquivo);
    fs.writeFileSync(destino, Buffer.from(base64Data, 'base64'));
    return { ok: true, caminho: destino };
});

ipcMain.handle('app:getPastas', () => ({
    base:          PASTA_BASE,
    cadastros:     PASTA_CADASTROS,
    movimentacoes: PASTA_MOVIMENTACOES,
    backups:       PASTA_BACKUPS,
    relatorios:    PASTA_RELATORIOS
}));

ipcMain.handle('app:getUserDataPath', () => PASTA_BASE);

ipcMain.handle('db:backup:completo', () => {
    try {
        realizarBackupAutomatico();
        return { ok: true, caminho: PASTA_BACKUPS };
    } catch(e) {
        return { ok: false, erro: e.message };
    }
});

const os   = require('os');
ipcMain.handle('app:imprimirHtml', async (_, htmlContent) => {
    const assetsDir = path.join(__dirname, 'assets').split(path.sep).join('/');
    let htmlFixed = htmlContent.replace(/src="assets\//g, `src="file:///${assetsDir}/`);

    if (!/<title>/i.test(htmlFixed)) {
        htmlFixed = htmlFixed.replace('<head>', '<head><title>Balança Portuária</title>');
    } else {
        htmlFixed = htmlFixed.replace(/<title>.*?<\/title>/i, '<title>Balança Portuária</title>');
    }

    const tmpFile = path.join(os.tmpdir(), `BalancaPortuaria_Impressao_${Date.now()}.html`);
    fs.writeFileSync(tmpFile, htmlFixed, 'utf8');

    // Abre o ticket no navegador padrão do Windows (Edge/Chrome/etc) em vez de
    // numa janela do Electron. A visualização e o diálogo de impressão do
    // navegador são mais estáveis e conhecidos do que os do Electron. O
    // usuário imprime pelo botão da própria página ou por Ctrl+P.
    await shell.openPath(tmpFile);

    // Apaga o arquivo temporário depois de um tempo (dá margem para o
    // navegador abrir e o usuário imprimir antes da limpeza).
    setTimeout(() => {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
    }, 15 * 60 * 1000);

    return { ok: true };
});
