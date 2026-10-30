// Calcula os totais (peso líquido movimentado = |entrada - saída|) do
// conjunto já filtrado, discriminados por DI/DUIMP, além do total geral.
// Registros sem saída registrada (ainda em trânsito) não entram na soma do
// líquido — só são contados à parte, em "pendentes". Vazios entram na
// contagem mas com líquido zero (não houve carga).
function _calcularResumoPorDi(lista) {
    const porDi = new Map();

    let totalEntrada = 0, totalSaida = 0, totalLiquido = 0;
    let qtdConcluidos = 0, qtdVazios = 0, qtdPendentes = 0;

    lista.forEach(d => {
        const chaveDi = (d.di || '').trim() || 'SEM DI/DUIMP';
        if (!porDi.has(chaveDi)) {
            porDi.set(chaveDi, { di: chaveDi, qtd: 0, entrada: 0, saida: 0, liquido: 0, vazios: 0, pendentes: 0 });
        }
        const grupo = porDi.get(chaveDi);
        grupo.qtd++;

        const ent = parseFloat(String(d.entrada || "0").replace(/\./g, "")) || 0;

        if (d.saidaVazia) {
            grupo.vazios++;
            qtdVazios++;
        } else if (d.saida) {
            const sai = parseFloat(String(d.saida || "0").replace(/\./g, "")) || 0;
            const liq = Math.abs(ent - sai);
            grupo.entrada += ent;
            grupo.saida   += sai;
            grupo.liquido += liq;
            totalEntrada  += ent;
            totalSaida    += sai;
            totalLiquido  += liq;
            qtdConcluidos++;
        } else {
            grupo.pendentes++;
            qtdPendentes++;
        }
    });

    const linhasPorDi = [...porDi.values()].sort((a, b) => a.di.localeCompare(b.di, 'pt-BR'));

    return {
        porDi: linhasPorDi,
        geral: {
            qtdRegistros: lista.length,
            qtdConcluidos, qtdVazios, qtdPendentes,
            totalEntrada, totalSaida, totalLiquido
        }
    };
}

function gerarNomeRelatorio(extensao) {
    const navio = document.getElementById('filtroNavio')?.value.trim();
    const cliente = document.getElementById('filtroCliente')?.value.trim();
    const transportadora = document.getElementById('filtroTransportadora')?.value.trim();
    const di = document.getElementById('filtroDi')?.value.trim();
    const dataInicio = document.getElementById('filtroInicio')?.value;
    const dataFim = document.getElementById('filtroFim')?.value;

    let partes = ["relatorio"];

    if (navio) partes.push("NAVIO_" + navio);
    else if (cliente) partes.push("CLIENTE_" + cliente);
    else if (transportadora) partes.push("TRANSPORTADORA_" + transportadora);
    else if (di) partes.push("DI_" + di);
    else partes.push("GERAL");

    if (dataInicio && dataFim) {
        const ini = dataInicio.split("-").reverse().join("-");
        const fim = dataFim.split("-").reverse().join("-");
        partes.push(ini + "_a_" + fim);
    } else if (dataInicio) {
        partes.push("a_partir_" + dataInicio.split("-").reverse().join("-"));
    } else if (dataFim) {
        partes.push("ate_" + dataFim.split("-").reverse().join("-"));
    } else {
        partes.push(new Date().toLocaleDateString('pt-BR').replace(/\//g, '-'));
    }

    let nome = partes.join("_").replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
    return nome + "." + extensao;
}

function gerarPDF() {
    const filtrados = obterDadosFiltrados();
    const dataInicio = document.getElementById('filtroInicio')?.value;
    const dataFim = document.getElementById('filtroFim')?.value;

    if (!dataInicio && !dataFim) {
        abrirModalSistema({
            titulo: "Atenção",
            mensagem: "É obrigatório informar pelo menos uma DATA para gerar o relatório.",
            botoes: [{ 
                texto: "Entendido", 
                estilo: "info", 
                acao: () => { console.log("Usuário alertado sobre falta de data"); } 
            }]
        });
        return;
    }

    if (!filtrados.length) {
        abrirModalSistema({
            titulo: "Relatório Vazio",
            mensagem: "Nenhum registro encontrado para os filtros selecionados.",
            botoes: [{ 
                texto: "OK", 
                estilo: "info", 
                acao: () => { console.log("Usuário alertado sobre lista vazia"); } 
            }]
        });
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.setFontSize(14);
    doc.text("BALANÇA PORTUÁRIA - RELATÓRIO DE MOVIMENTAÇÃO DE CARGA - SEM SISPLAN", 14, 15);
    doc.setFontSize(9);
    doc.text("Gerado em: " + new Date().toLocaleString(), 14, 22);

    const linhas = filtrados.map(d => {
        const ent = parseFloat(String(d.entrada || "0").replace(/\./g, "")) || 0;
        const sai = parseFloat((d.saida || "0").replace(/\./g, "")) || 0;
        const liq = d.saidaVazia ? "VAZIO" : d.saida ? formatarMilhar(Math.abs(ent - sai)) : "---";

        return [
            new Date(d.dataEntrada || d.data).toLocaleDateString(),
            d.sisplan || "S/N",
            d.di || "-",
            d.tipo || "",
            d.embarcacao || "",
            d.clientes || "",
            d.mercadoria || "",
            d.placa || "",
            d.transportadora || "AVULSO",
            d.motorista || "",
            d.entrada || "0",
            d.saida || "0",
            liq
        ];
    });

    doc.autoTable({
        startY: 28,
        head: [["Data", "Sisplan", "DI/DUIMP", "Operação", "Navio", "Cliente", "Produto", "Placa", "Transportadora", "Motorista", "Entrada (kg)", "Saída (kg)", "Líquido (kg)"]],
        body: linhas,
        theme: "striped",
        styles: { fontSize: 6.0, cellPadding: 1.5, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [44, 62, 80], fontSize: 6.5, fontStyle: 'bold', halign: 'center' },
        tableWidth: 'auto',
        margin: { left: 6, right: 6 }
    });

    const resumo = _calcularResumoPorDi(filtrados);
    const linhasResumo = resumo.porDi.map(g => [
        g.di,
        String(g.qtd),
        formatarMilhar(g.entrada),
        formatarMilhar(g.saida),
        formatarMilhar(g.liquido),
        g.vazios ? String(g.vazios) : "-",
        g.pendentes ? String(g.pendentes) : "-"
    ]);
    linhasResumo.push([
        "TOTAL GERAL",
        String(resumo.geral.qtdRegistros),
        formatarMilhar(resumo.geral.totalEntrada),
        formatarMilhar(resumo.geral.totalSaida),
        formatarMilhar(resumo.geral.totalLiquido),
        resumo.geral.qtdVazios ? String(resumo.geral.qtdVazios) : "-",
        resumo.geral.qtdPendentes ? String(resumo.geral.qtdPendentes) : "-"
    ]);

    doc.autoTable({
        startY: (doc.lastAutoTable?.finalY || 28) + 8,
        head: [["DI/DUIMP", "Qtd.", "Total Entrada (kg)", "Total Saída (kg)", "Total Líquido (kg)", "Vazios", "Pendentes"]],
        body: linhasResumo,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [44, 62, 80], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
        didParseCell: (dataCell) => {
            if (dataCell.row.index === linhasResumo.length - 1) {
                dataCell.cell.styles.fontStyle = 'bold';
                dataCell.cell.styles.fillColor = [230, 230, 230];
            }
        },
        tableWidth: 'auto',
        margin: { left: 6, right: 6 }
    });

    doc.save(gerarNomeRelatorio("pdf"));
}

function exportarCSV() {
    const filtrados = obterDadosFiltrados();
    const dataInicio = document.getElementById('filtroInicio')?.value;
    const dataFim = document.getElementById('filtroFim')?.value;

    if (!dataInicio && !dataFim) {
        abrirModalSistema({
            titulo: "Atenção",
            mensagem: "É obrigatório informar pelo menos uma DATA para exportar.",
            botoes: [{ 
                texto: "Entendido", 
                estilo: "info", 
                acao: () => {} 
            }]
        });
        return;
    }

    if (!filtrados.length) {
        abrirModalSistema({
            titulo: "Exportação Vazia",
            mensagem: "Nenhum registro encontrado para os filtros selecionados.",
            botoes: [{ 
                texto: "OK", 
                estilo: "info", 
                acao: () => {} 
            }]
        });
        return;
    }

    let csv = [];
    csv.push(["Data Entrada", "Sisplan", "DI/DUIMP", "Operação", "Navio", "Cliente", "Produto", "Placa", "Transportadora", "Motorista", "Entrada (kg)", "Saída (kg)", "Líquido (kg)", "Data Saída", "operadorbal", "Observações"].join(";"));

    filtrados.forEach(d => {
        const ent = parseFloat(String(d.entrada || "0").replace(/\./g, '')) || 0;
        const sai = parseFloat((d.saida || "0").replace(/\./g, '')) || 0;
        const liquido = d.saidaVazia ? "VAZIO" : d.saida ? formatarMilhar(Math.abs(ent - sai)) : "---";

        csv.push([
            d.dataEntrada ? new Date(d.dataEntrada).toLocaleString() : "",
            d.sisplan || "S/N",
            d.di || "",
            d.tipo || "",
            d.embarcacao || "",
            d.clientes || "",
            d.mercadoria || "",
            d.placa || "",
            d.transportadora || "AVULSO",
            d.motorista || "",
            d.entrada || "",
            d.saidaVazia ? "VAZIO" : (d.saida || ""),
            liquido,
            d.dataSaida ? new Date(d.dataSaida).toLocaleString() : "",
            d.operadorbal || "",
            (d.observacoes || "").replace(/;/g, ",")
        ].join(";"));
    });

    const resumo = _calcularResumoPorDi(filtrados);

    csv.push([]);
    csv.push(["RESUMO POR DI/DUIMP"].join(";"));
    csv.push(["DI/DUIMP", "Qtd.", "Total Entrada (kg)", "Total Saída (kg)", "Total Líquido (kg)", "Vazios", "Pendentes"].join(";"));

    resumo.porDi.forEach(g => {
        csv.push([
            g.di,
            g.qtd,
            formatarMilhar(g.entrada),
            formatarMilhar(g.saida),
            formatarMilhar(g.liquido),
            g.vazios || 0,
            g.pendentes || 0
        ].join(";"));
    });

    csv.push([
        "TOTAL GERAL",
        resumo.geral.qtdRegistros,
        formatarMilhar(resumo.geral.totalEntrada),
        formatarMilhar(resumo.geral.totalSaida),
        formatarMilhar(resumo.geral.totalLiquido),
        resumo.geral.qtdVazios,
        resumo.geral.qtdPendentes
    ].join(";"));

    const blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = gerarNomeRelatorio("csv");
    link.click();
}

function mostrarResumoFiltro() {
    const painel = document.getElementById('resumo-filtro-painel');
    if (!painel) return;

    const filtrados = obterDadosFiltrados();
    if (!filtrados.length) {
        painel.innerHTML = `<div style="padding:10px; opacity:.7;">Nenhum registro para os filtros atuais.</div>`;
        return;
    }

    const resumo = _calcularResumoPorDi(filtrados);

    const linhasHtml = resumo.porDi.map(g => `
        <tr>
            <td>${g.di}</td>
            <td style="text-align:center;">${g.qtd}</td>
            <td style="text-align:right;">${formatarMilhar(g.entrada)}</td>
            <td style="text-align:right;">${formatarMilhar(g.saida)}</td>
            <td style="text-align:right; font-weight:600;">${formatarMilhar(g.liquido)}</td>
            <td style="text-align:center;">${g.vazios || '-'}</td>
            <td style="text-align:center;">${g.pendentes || '-'}</td>
        </tr>
    `).join('');

    painel.innerHTML = `
        <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:var(--bg-input);">
                        <th style="padding:6px; text-align:left;">DI/DUIMP</th>
                        <th style="padding:6px;">Qtd.</th>
                        <th style="padding:6px; text-align:right;">Entrada (kg)</th>
                        <th style="padding:6px; text-align:right;">Saída (kg)</th>
                        <th style="padding:6px; text-align:right;">Líquido (kg)</th>
                        <th style="padding:6px;">Vazios</th>
                        <th style="padding:6px;">Pendentes</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml}
                    <tr style="font-weight:700; border-top:2px solid var(--border-color, #cbd5e1);">
                        <td style="padding:6px;">TOTAL GERAL</td>
                        <td style="padding:6px; text-align:center;">${resumo.geral.qtdRegistros}</td>
                        <td style="padding:6px; text-align:right;">${formatarMilhar(resumo.geral.totalEntrada)}</td>
                        <td style="padding:6px; text-align:right;">${formatarMilhar(resumo.geral.totalSaida)}</td>
                        <td style="padding:6px; text-align:right;">${formatarMilhar(resumo.geral.totalLiquido)}</td>
                        <td style="padding:6px; text-align:center;">${resumo.geral.qtdVazios || '-'}</td>
                        <td style="padding:6px; text-align:center;">${resumo.geral.qtdPendentes || '-'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
window.mostrarResumoFiltro = mostrarResumoFiltro;

window.exportarExcel = exportarCSV;
window.gerarPDF = gerarPDF;