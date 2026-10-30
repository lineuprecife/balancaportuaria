const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    movimentacoes: {
        getAll:      ()         => ipcRenderer.invoke('db:movimentacoes:getAll'),
        add:         (p)        => ipcRenderer.invoke('db:movimentacoes:add', p),
        update:      (id, p)    => ipcRenderer.invoke('db:movimentacoes:update', id, p),
        delete:      (id)       => ipcRenderer.invoke('db:movimentacoes:delete', id),
        clear:       ()         => ipcRenderer.invoke('db:movimentacoes:clear'),
        importarLote:(arr)      => ipcRenderer.invoke('db:movimentacoes:importarLote', arr),
    },
    logs: {
        add:    (log) => ipcRenderer.invoke('db:logs:add', log),
        getAll: ()    => ipcRenderer.invoke('db:logs:getAll'),
        clear:  ()    => ipcRenderer.invoke('db:logs:clear'),
    },
    contingencias: {
        getAll: ()       => ipcRenderer.invoke('db:contingencias:getAll'),
        add:    (c)      => ipcRenderer.invoke('db:contingencias:add', c),
        update: (id, c)  => ipcRenderer.invoke('db:contingencias:update', id, c),
        delete: (id)     => ipcRenderer.invoke('db:contingencias:delete', id),
        clear:  ()       => ipcRenderer.invoke('db:contingencias:clear'),
    },
    cadastros: {
        get:    (tipo)        => ipcRenderer.invoke('db:cadastros:get', tipo),
        set:    (tipo, lista) => ipcRenderer.invoke('db:cadastros:set', tipo, lista),
        getAll: ()            => ipcRenderer.invoke('db:cadastros:getAll'),
    },
    backup: {
        
        exportarAuto: (json, nome) => ipcRenderer.invoke('db:backup:exportarAuto', json, nome),
        
        exportar:     (json, nome) => ipcRenderer.invoke('db:backup:exportar', json, nome),
        salvarPDF:    (nome, b64)  => ipcRenderer.invoke('db:arquivo:salvarPDF', nome, b64),
        
        backupCompleto: ()         => ipcRenderer.invoke('db:backup:completo'),
    },
    getPastas:       () => ipcRenderer.invoke('app:getPastas'),
    getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),

    imprimirHtml: (html) => ipcRenderer.invoke('app:imprimirHtml', html),

    confirmarFechamento: () => ipcRenderer.send('app:confirmarFechamento'),

    onSolicitarFechamento: (callback) => ipcRenderer.on('app:solicitarFechamento', callback),
});
