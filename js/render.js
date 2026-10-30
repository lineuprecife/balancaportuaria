let estadoOrdenacao = { coluna: 'dataEntrada', direcao: 'desc' };

function ordenarDados(coluna) {
    if (estadoOrdenacao.coluna === coluna) {
        estadoOrdenacao.direcao = estadoOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        estadoOrdenacao.coluna  = coluna;
        estadoOrdenacao.direcao = 'asc';
    }
    render();
}

function render() {
    const tb = document.getElementById('tbody');
    if (!tb) return;

    // Por padrão a tabela "TRÂNSITO NO PORTO" mostra só quem ainda está de
    // fato em trânsito (sem saída/vazio/cancelamento registrado). Isso é o
    // que a tela deveria mostrar pelo nome, e de quebra evita que a tabela
    // cresça sem limite conforme o período acumula centenas de pesagens já
    // encerradas — quem quiser ver tudo mesmo assim pode marcar a caixinha.
    const mostrarEncerrados = document.getElementById('chkMostrarEncerrados')?.checked;
    const base = mostrarEncerrados
        ? dados
        : dados.filter(d => !d.saida && !d.saidaVazia && !d.cancelado);

    const ordenados = [...base].sort((a, b) => {
        let valA = (a[estadoOrdenacao.coluna] || "").toString().toLowerCase();
        let valB = (b[estadoOrdenacao.coluna] || "").toString().toLowerCase();
        if (!isNaN(valA) && !isNaN(valB)) { valA = parseFloat(valA); valB = parseFloat(valB); }
        return estadoOrdenacao.direcao === 'asc'
            ? (valA > valB ? 1 : -1)
            : (valA < valB ? 1 : -1);
    });

    // Monta todas as linhas num array e injeta o HTML de uma vez só no
    // final. Antes era usado "tb.innerHTML += ..." dentro do laço, o que
    // faz o navegador serializar e reconstruir a tabela inteira a cada
    // linha adicionada (custo que cresce a cada nova pesagem, ficando bem
    // perceptível com centenas de registros). Essa era a causa principal
    // da lentidão ao salvar — o formulário fica travado enquanto o
    // navegador recalcula a tabela toda várias vezes seguidas.
    const linhasHtml = [];

    ordenados.forEach(d => {
        const id   = d.id;
        const eVal = parseFloat((d.entrada || "0").replace(/\./g, "")) || 0;
        const sVal = parseFloat((d.saida   || "0").replace(/\./g, "")) || 0;

        const liq = d.cancelado
            ? "CANCELADO"
            : d.saidaVazia
            ? "VAZIO"
            : d.saida
            ? formatarMilhar(Math.abs(eVal - sVal))
            : "---";

        const dataEntrada = (d.dataEntrada || d.data)
            ? new Date(d.dataEntrada || d.data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
            : "-";

        const dataSaida = d.dataSaida
            ? new Date(d.dataSaida).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
            : null;

        let celulaSaida;
if (d.saidaVazia) {
    celulaSaida = `<span class="badge-saida-vazia">VAZIO</span>`;
} else if (d.saida) {
    celulaSaida = `<strong>${d.saida}</strong>`;
} else {
    celulaSaida = `<span style="color:var(--text-muted);">---</span>`;
}

const botoesSaida = (!d.saida && !d.saidaVazia && !d.cancelado)
    ? `<button class="btn-saida" onclick="registrarSaida(${id})" title="Registrar Saída">Registrar Saída</button>
       <button class="btn-vazio" onclick="marcarVazio(${id})" title="Registrar Vazio">Registrar Vazio</button>`
    : ``;

const ehViraComTara = d.tipo === (typeof TIPO_OPERACAO_VIRA !== 'undefined' ? TIPO_OPERACAO_VIRA : 'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)') && !!d.entrada;
const tituloDuplicar = ehViraComTara ? "Nova viagem (VIRA) — só peso carregado, tara reaproveitada" : "Duplicar entrada";
const iconeDuplicar  = ehViraComTara ? "🔁" : "⧉";

        linhasHtml.push(`
        <tr>
            <td title="ENT: ${dataEntrada}${dataSaida ? ` | SAÍ: ${dataSaida}` : ''}">
    <div>ENT: ${dataEntrada}</div>
    ${dataSaida ? `<div>SAÍ: ${dataSaida}</div>` : ''}
</td>
            <td title="${d.sisplan || 'S/N'}">${d._rmProvisorio ? `<span style="color:var(--brand-blue);font-weight:700;">${d.sisplan}</span>` : (d.sisplan || 'S/N')}</td>
            <td title="${d.di || '-'}">${d.di || '-'}</td>
            <td class="col-operacao" title="${d.tipo || ''}">${d.tipo || ''}</td>
            <td style="font-weight:600;" title="${d.embarcacao || ''}">${d.embarcacao || ''}</td>
            <td title="${d.clientes || ''}">${d.clientes || ''}</td>
            <td style="font-weight:bold;" title="${d.mercadoria || ''}">${d.mercadoria || ''}</td>
            <td style="font-weight:bold;" title="${d.placa || ''}">${d.placa || ''}</td>
            <td style="font-style:bold;color:var(--text-primary);" title="${d.transportadora || '-'}">${d.transportadora || '-'}</td>
            <td class="col-motorista" title="${d.motorista || ''}">${d.motorista || ''}</td>
            <td style="font-weight:bold;" title="${d.entrada || '0'}">${d.entrada || '0'}</td>
            <td style="text-align:center;">${celulaSaida}</td>
            <td style="font-weight:bold;" title="${liq}">${liq}</td>
            <td class="acoes-cell">
                ${botoesSaida}
                <button class="btn-acao" onclick="gerarRegistroEntrada(dados.find(x=>x.id===${id}))" title="Registro de Entrada">▤</button>
                <button class="btn-acao" onclick="gerarTicket(dados.find(x=>x.id===${id}))"        title="Ticket de Pesagem">🖨</button>
                <button class="btn-acao" onclick="duplicar(${id})"   title="${tituloDuplicar}">${iconeDuplicar}</button>
                <button class="btn-acao" onclick="editar(${id})"     title="Editar">✎</button>
                <button class="btn-acao" onclick="del(${id})"        title="Excluir">✕</button>
            </td>
        </tr>`);
    });

    tb.innerHTML = linhasHtml.join('');

    atualizarSetasCabecalho();
    _atualizarContagemTransito(base.length, dados.length, mostrarEncerrados);
}

function _atualizarContagemTransito(qtdExibida, qtdTotalPeriodo, mostrandoEncerrados) {
    const el = document.getElementById('transito-contagem');
    if (!el) return;
    el.textContent = mostrandoEncerrados
        ? `${qtdTotalPeriodo} registro(s) do período.`
        : `${qtdExibida} em trânsito agora (de ${qtdTotalPeriodo} no período).`;
}

function atualizarSetasCabecalho() {
    document.querySelectorAll('thead th[data-col]').forEach(th => {
        const seta = th.querySelector('.seta');
        if (!seta) return;
        if (th.dataset.col === estadoOrdenacao.coluna) {
            seta.textContent = estadoOrdenacao.direcao === 'asc' ? ' ▲' : ' ▼';
            th.classList.add('col-ordenada');
        } else {
            seta.textContent = ' ↕';
            th.classList.remove('col-ordenada');
        }
    });
}
