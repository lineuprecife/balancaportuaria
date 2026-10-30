/*
 * Busca de registro anterior — permite encontrar rapidamente uma pesagem já
 * lançada no período Sem SISPLAN atual (aberto ou já encerrado dentro dele)
 * para registrar a saída ou duplicá-la como base de uma nova entrada, mesmo
 * quando não se tem o número Sisplan em mãos (busca também por placa,
 * motorista e DI).
 *
 * Respeita o mesmo recorte de período usado na tabela de trânsito
 * (_filtrarPorPeriodoAtual): registros de períodos Sem SISPLAN anteriores,
 * já encerrados, não aparecem aqui.
 */
(function () {

    let _ultimoTermo = '';
    let _debounceTimer = null;

    function _formatarDataHoraBusca(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        if (isNaN(d)) return '—';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
    }

    function _statusRegistro(r) {
        if (r.cancelado)   return { texto: 'CANCELADO', cor: '#94a3b8' };
        if (r.saidaVazia)  return { texto: 'VAZIO',      cor: '#94a3b8' };
        if (r.saida)       return { texto: 'ENCERRADO',  cor: '#64748b' };
        return { texto: 'EM TRÂNSITO', cor: '#16a34a' };
    }

    async function _buscar(termo) {
        const termoUpper = termo.trim().toUpperCase();
        if (!termoUpper) return [];

        const todos = await db.movimentacoes.toArray();
        const doPeriodoAtual = (typeof window._filtrarPorPeriodoAtual === 'function')
            ? window._filtrarPorPeriodoAtual(todos)
            : todos;

        const resultados = doPeriodoAtual.filter(r => {
            const campos = [r.placa, r.motorista, r.sisplan, r.di];
            return campos.some(c => (c || '').toString().toUpperCase().includes(termoUpper));
        });

        resultados.sort((a, b) => new Date(b.dataEntrada || b.data || 0) - new Date(a.dataEntrada || a.data || 0));

        return resultados.slice(0, 25);
    }

    function _renderResultados(lista, termo) {
        const container = document.getElementById('busca-registro-resultados');
        if (!container) return;

        window._buscaResultadosAtuais = lista;

        if (!termo.trim()) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        if (lista.length === 0) {
            container.innerHTML = `<div style="padding:12px; opacity:.7;">Nenhum registro encontrado para "${termo}".</div>`;
            container.style.display = 'block';
            return;
        }

        container.innerHTML = lista.map((r, idx) => {
            const status = _statusRegistro(r);
            const podeRegistrarSaida = !r.saida && !r.saidaVazia && !r.cancelado;

            const ehViraComTara = r.tipo === (typeof TIPO_OPERACAO_VIRA !== 'undefined' ? TIPO_OPERACAO_VIRA : 'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)') && !!r.entrada;
        const rotuloDuplicar = ehViraComTara ? "🔁 Nova Virada (só peso carregado)" : "Duplicar";

        return `
            <div class="busca-registro-item" style="display:flex; align-items:center; justify-content:space-between; gap:10px;
                        padding:10px 12px; border-bottom:1px solid var(--border-color, #e2e8f0); flex-wrap:wrap;">
                <div style="min-width:220px;">
                    <div style="font-weight:700;">${r.placa || '-'} <span style="font-weight:400;">— ${r.motorista || ''}</span></div>
                    <div style="font-size:12px; opacity:.75;">
                        ENT: ${_formatarDataHoraBusca(r.dataEntrada || r.data)}
                        · Sisplan: ${r.sisplan || 'S/N'} · DI: ${r.di || '-'}
                        · <span style="color:${status.cor}; font-weight:600;">${status.texto}</span>
                    </div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${podeRegistrarSaida ? `
                        <button type="button" class="btn-saida" onclick="window._buscaAcao('saida', ${idx})">Registrar Saída</button>
                        <button type="button" class="btn-vazio" onclick="window._buscaAcao('vazio', ${idx})">Vazio</button>
                    ` : ''}
                    <button type="button" class="btn-secundario" onclick="window._buscaAcao('duplicar', ${idx})">${rotuloDuplicar}</button>
                </div>
            </div>`;
        }).join('');

        container.style.display = 'block';
    }

    async function _executarBusca(termo) {
        _ultimoTermo = termo;
        const resultados = await _buscar(termo);
        // Evita mostrar um resultado antigo se o operador já digitou outra coisa.
        if (termo === _ultimoTermo) _renderResultados(resultados, termo);
    }

    window._atualizarBuscaRegistroAnterior = function () {
        const input = document.getElementById('busca-registro-input');
        if (input && input.value.trim()) _executarBusca(input.value);
    };

    window._buscaAcao = function (tipo, idx) {
        const r = (window._buscaResultadosAtuais || [])[idx];
        if (!r) return;

        if (tipo === 'saida'    && typeof registrarSaida === 'function') registrarSaida(r.id, r);
        if (tipo === 'vazio'    && typeof marcarVazio     === 'function') marcarVazio(r.id, r);
        if (tipo === 'duplicar' && typeof duplicar        === 'function') duplicar(r.id, r);
    };

    function _inicializar() {
        const input = document.getElementById('busca-registro-input');
        if (!input || input.dataset.buscaIniciada) return;
        input.dataset.buscaIniciada = '1';

        input.addEventListener('input', function () {
            const termo = this.value;
            clearTimeout(_debounceTimer);
            if (!termo.trim()) {
                _renderResultados([], '');
                return;
            }
            _debounceTimer = setTimeout(() => _executarBusca(termo), 250);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(_inicializar, 300));
    } else {
        setTimeout(_inicializar, 300);
    }

})();
