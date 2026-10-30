
const api = window.electronAPI;

const db = {

    movimentacoes: {
        toArray:  ()        => api.movimentacoes.getAll(),
        add:      (obj)     => api.movimentacoes.add(obj).then(r => r.id),
        update:   (id, obj) => api.movimentacoes.update(id, obj),
        delete:   (id)      => api.movimentacoes.delete(id),
        put:      (obj)     => api.movimentacoes.update(obj.id, obj),
        get:      (id)      => api.movimentacoes.getAll().then(rows => rows.find(r => r.id === id)),
        bulkAdd:  (arr)     => Promise.all(arr.map(o => api.movimentacoes.add(o))),
        clear:    ()        => api.movimentacoes.clear(),
        orderBy:  ()        => ({ reverse: () => ({ toArray: () => api.movimentacoes.getAll().then(r => [...r].reverse()) }) }),
        where:    (campo)   => ({
            equals: (valor) => ({
                toArray: () => api.movimentacoes.getAll().then(rows => rows.filter(r => r[campo] === valor)),
                delete:  ()  => api.movimentacoes.getAll().then(rows =>
                    Promise.all(rows.filter(r => r[campo] === valor).map(r => api.movimentacoes.delete(r.id)))),
            })
        }),
    },

    logs: {
        toArray: ()    => api.logs.getAll(),
        add:     (obj) => api.logs.add(obj),
        clear:   ()    => api.logs.clear(),
        orderBy: ()    => ({ reverse: () => ({ toArray: () => api.logs.getAll().then(r => [...r].reverse()) }) }),
    },

        contingencias: {
        toArray: ()        => api.contingencias.getAll(),
        add:     (obj)     => api.contingencias.add(obj).then(r => r.id),
        update:  (id, obj) => api.contingencias.update(id, obj),
        delete:  (id)      => api.contingencias.delete(id),
        clear:   ()        => api.contingencias.clear(),

        get:     (id)      => api.contingencias.getAll()
                                .then(rows => rows.find(r => r.id === id || r.id == id) || null),

        filter:  (fn)      => ({
            toArray: () => api.contingencias.getAll().then(rows => (rows || []).filter(fn))
        }),

        orderBy: (campo)   => ({
            reverse: () => ({
                toArray: () => api.contingencias.getAll().then(rows => {
                    const lista = [...(rows || [])];
                    if (campo) {
                        lista.sort((a, b) => {
                            const av = a[campo], bv = b[campo];
                            if (av === bv) return 0;
                            return av > bv ? -1 : 1;   
                        });
                        return lista;
                    }
                    return lista.reverse();
                })
            }),
            toArray: () => api.contingencias.getAll().then(rows => {
                const lista = [...(rows || [])];
                if (campo) {
                    lista.sort((a, b) => {
                        const av = a[campo], bv = b[campo];
                        if (av === bv) return 0;
                        return av > bv ? 1 : -1;
                    });
                }
                return lista;
            })
        }),
    },

    configuracoes: {
        get: (chave) => api.cadastros.get('_config_' + chave),
        put: (obj)   => api.cadastros.set('_config_' + obj.chave, obj.valor),
    },

    open: () => Promise.resolve(),
};

window.db = db;

