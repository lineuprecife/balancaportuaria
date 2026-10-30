
async function migrarDadosAntigos() {
    
    try {
        const rows = await db.movimentacoes.toArray();
        if (rows.length > 0) return; 

        const dadosAntigos = localStorage.getItem('balanca_db_v2');
        if (!dadosAntigos) return;

        const parsed = JSON.parse(dadosAntigos);
        if (!Array.isArray(parsed) || parsed.length === 0) return;

        console.log(`Migrando ${parsed.length} registros do localStorage para SQLite...`);
        for (const m of parsed) {
            const { id: _ignorado, ...semId } = m;
            await db.movimentacoes.add(semId);
        }

        localStorage.removeItem('balanca_db_v2');
        console.log('Migração concluída.');

    } catch (e) {
        console.warn('Migração de dados antigos ignorada:', e.message);
    }
}

async function iniciarBanco() {
    try {
        await migrarDadosAntigos();

        if (typeof _recarregarDados === 'function') {
            await _recarregarDados();
            console.log(`${dados.length} registros carregados (filtrados pelo período vigente).`);
        } else if (typeof dados !== 'undefined') {
            const rows = await db.movimentacoes.toArray();
            dados.length = 0;
            rows.forEach(r => dados.push(r));
            console.log(`${dados.length} registros carregados.`);
        }

    } catch (erro) {
        console.error('Erro ao iniciar banco:', erro);
    }
}

iniciarBanco();

window.salvarLista   = (tipo, lista) => window.electronAPI.cadastros.set(tipo, lista);
window.carregarLista = (tipo)        => window.electronAPI.cadastros.get(tipo);
