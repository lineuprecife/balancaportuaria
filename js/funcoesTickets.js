
function _estilosImpressao() {
    return `
        body { font-family: Arial, sans-serif; background: #dcdcdc; margin: 0; padding: 20px; color: #000; }
        .no-print {
            display: block; margin: 0 auto 20px auto; padding: 12px 24px;
            background: #1a3d6c; color: white; border: none; border-radius: 5px;
            cursor: pointer; font-weight: bold; font-size: 14px;
        }
        @media print {
            body { background: white; padding: 0; }
            .no-print { display: none; }
        }
    `;
}

function _abrirJanela(titulo) {
    
    return { titulo };
}

async function _imprimirHtml(tituloOuWin, html) {
    
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.imprimirHtml) {
        await window.electronAPI.imprimirHtml(html);
        return;
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank', 'width=900,height=700');
    if (!win) { URL.revokeObjectURL(url); return; }
    win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 400); };
}

// Mapeamento direto (1:1) entre cada Tipo de Operação cadastrado em configuracoes.js
// (ver TIPOS_OPERACAO) e o texto de fluxo exibido no registro impresso.
// Antes, o fluxo era "adivinhado" procurando trechos como "ENTRADA"/"DESCARGA"/"EXPEDI"
// dentro do texto do tipo — isso fazia tipos diferentes colidirem no mesmo texto
// (ex.: "EMBARCAÇÃO->FORA DO PORTO(DESCARGA)" e "ENTRADA PARA SERVIÇOS" caíam
// incorretamente no fluxo de RECEPÇÃO). Agora cada tipo tem seu próprio texto fixo.
const FLUXO_POR_TIPO = {
    'EMBARCAÇÃO->FORA DO PORTO(DESCARGA)': 'EMBARCAÇÃO → FORA DO PORTO (DESCARGA)',
    'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)': 'EMBARCAÇÃO → ARMAZÉM DO PORTO (VIRA)',
    'ARMAZÉM DO PORTO->FORA DO PORTO (EXPEDIÇÃO)': 'ARMAZÉM DO PORTO → FORA DO PORTO (EXPEDIÇÃO)',
    'ARMAZÉM/PÁTIO DE TERCEIROS->FORA DO PORTO(EXPEDIÇÃO DE TERCEIROS)': 'ARMAZÉM/PÁTIO DE TERCEIROS → FORA DO PORTO (EXPEDIÇÃO DE TERCEIROS)',
    'FORA DO PORTO->EMBARCAÇÃO(EMBARQUE)': 'FORA DO PORTO → EMBARCAÇÃO (EMBARQUE)',
    'APENAS PESAGEM DE AFERIÇÃO': 'APENAS PESAGEM DE AFERIÇÃO',
    'ENTRADA PARA SERVIÇOS': 'ENTRADA PARA SERVIÇOS',
    'ARMAZÉM DO PORTO->ARMAZÉM DO PORTO': 'ARMAZÉM DO PORTO → ARMAZÉM DO PORTO',
    'ARMAZÉM DO PORTO->EMBARCAÇÃO': 'ARMAZÉM DO PORTO → EMBARCAÇÃO',
    'FORA DO PORTO->ARMAZÉM DO PORTO': 'FORA DO PORTO → ARMAZÉM DO PORTO (RECEPÇÃO)'
};

function gerarRegistroEntrada(item) {
    if (!item) return;
    const win = _abrirJanela('Registro de Entrada');
    if (!win) return;

    const dataRegistro = item.dataEntrada || item.data
        ? new Date(item.dataEntrada || item.data).toLocaleString('pt-BR')
        : "-";

    const tipoOriginal = item.tipo || "";
    const fluxo = FLUXO_POR_TIPO[tipoOriginal] || tipoOriginal.toUpperCase() || "MOVIMENTAÇÃO INTERNA";

    const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>Registro de Entrada</title>
    <style>
        ${_estilosImpressao()}
        .doc { width:790px; min-height:1000px; margin:0 auto; background:#fff; padding:40px 50px; box-sizing:border-box; border:1px solid #999; position:relative; }
        .topo { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom:1px solid #ddd; padding-bottom:15px; }
        .logo img { height:50px; }
        .logo-txt { font-size:12px; font-weight:bold; color:#1a3d6c; margin-top:4px; text-align:center; }
        .titulo-bloco { text-align:center; flex:1; padding:0 10px; }
        .titulo-bloco h1 { font-size:18px; font-weight:bold; margin:0 0 4px; }
        .titulo-bloco p  { font-size:11px; color:#000; margin:0; }
        .reg-bloco { text-align:right; width:140px; }
        .reg-rotulo { font-size:11px; color:#000; font-weight:bold; }
        .reg-num { font-size:22px; font-weight:bold; letter-spacing:1px; }
        .dados { font-size:12.5px; line-height:1.9; margin-bottom:25px; position:relative; }
        .info-linha { margin-bottom:2px; }
        .info-rot { display:inline-block; width:130px; color:#000; font-weight:bold; }
        .carimbos { position:absolute; right:0; top:0; display:flex; flex-direction:column; gap:12px; align-items:flex-end; }
        .carimbo-tara { border:3px solid #000; color:#000; padding:6px 20px; font-size:20px; font-weight:bold; transform:rotate(4deg); letter-spacing:1px; background:#fff; box-shadow:2px 2px 5px rgba(0,0,0,0.1); }
        hr { border:none; border-top:1.5px solid #000; margin:20px 0; }
        .corpo { font-size:12.5px; line-height:2.2; }
        .aviso { font-style:italic; margin:30px 0; font-size:12px; color:#000; }
        .obs { font-size:12.5px; margin-top:15px; }
        .obs-titulo { font-weight:bold; margin-bottom:4px; }
        .obs-texto { font-style:italic; color:#000; padding-left:5px; }
        @media print { .doc { border:none; padding:20px 10px; width:100%; } }
    </style></head><body>

    <div class="no-print" style="max-width:790px;margin:0 auto 14px auto;background:#fff3cd;border:1px solid #e0b030;color:#7a5c00;padding:10px 16px;border-radius:6px;font-size:13px;text-align:center;">
        ⚠ Impressora conectada pela rede pode estar indisponível em contingência. Verifique e, se necessário, conecte por cabo antes de imprimir.
    </div>
    <button class="no-print" onclick="window.print()">🖨 IMPRIMIR REGISTRO DE ENTRADA</button>

    <div class="doc">
        <div class="topo">
            <div class="logo">
                <img src="assets/logo-porto.png" style="height:60px;width:auto;display:block;margin:0 auto;">
                <div class="logo-txt">PORTO DO RECIFE S.A.</div>
            </div>
            <div class="titulo-bloco">
                <h1>AUTORIZAÇÃO DE ENTRADA / SAÍDA</h1>
                <p>${fluxo}</p>
            </div>
            <div class="reg-bloco">
                <div class="reg-rotulo">Registro nº</div>
                <div class="reg-num">${item.sisplan || "S/N"}</div>
            </div>
        </div>

        <div class="dados">
            <div class="info-linha"><span class="info-rot">Data Registro:</span>${dataRegistro}</div>
            <div class="info-linha"><span class="info-rot">Transportadora:</span>${item.transportadora || 'AVULSO'}</div>
            <div class="info-linha"><span class="info-rot">Placas:</span><strong>${item.placa || '-'}</strong></div>
            <div class="info-linha"><span class="info-rot">Motorista:</span>${item.motorista || '-'}</div>
            <div class="info-linha" style="margin-top:10px;"><span class="info-rot" style="font-weight:bold;">EMBARCAÇÃO:</span><strong>${(item.embarcacao || '-').toUpperCase()}</strong></div>

            <div class="carimbos">
                ${item.entrada ? `<div class="carimbo-tara">TARA OK</div>` : ''}
            </div>
        </div>

        <hr>

        <div class="corpo">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span><strong>DI — DECLARAÇÃO DE IMPORTAÇÃO</strong></span>
                <span><strong>${item.di || '-'}</strong></span>
            </div>
            <div><strong>CLIENTE:</strong> ${(item.clientes || '-').toUpperCase()}</div>
            <div><strong>MERCADORIA / PRODUTO:</strong> ${(item.mercadoria || '-').toUpperCase()}</div>
            ${item.entrada ? `<div><strong>PESO DE ENTRADA (TARA):</strong> ${item.entrada} KG</div>` : ''}
            <p class="aviso">Este documento deve ser apresentado ao operador da balança portuária quando da saída do veículo.</p>
        </div>

        <hr>

        <div class="obs">
            <div class="obs-titulo">Observações:</div>
            <div class="obs-texto">${item.observacoes || 'NENHUMA OBSERVAÇÃO REGISTRADA.'}</div>
        </div>
    </div>
    </body></html>`;

    _imprimirHtml(win, html);
}

function gerarTicket(item) {
    if (!item) return;
    const win = _abrirJanela('Ticket de Pesagem');
    if (!win) return;

    const ent = parseFloat((item.entrada || "0").replace(/\./g, "")) || 0;
    const sai = parseFloat((item.saida   || "0").replace(/\./g, "")) || 0;
    const liquido = item.saidaVazia ? "VAZIO" : item.saida ? formatarMilhar(Math.abs(ent - sai)) : "---";

    const dtEnt = item.dataEntrada || item.data
        ? new Date(item.dataEntrada || item.data).toLocaleString('pt-BR')
        : "-";
    const dtSai = item.dataSaida
        ? new Date(item.dataSaida).toLocaleString('pt-BR')
        : "-";

    const tipo = item.saida || item.saidaVazia
        ? "SEM SISPLAN — PESAGEM MANUAL DE SAÍDA"
        : "SEM SISPLAN — PESAGEM MANUAL DE ENTRADA";

    const vias = ["1ª Via — Motorista", "2ª Via — operador da Balança", "3ª Via — Arquivo"];

    let ticketsHtml = vias.map(via => `
    <div class="ticket">
        <div class="barra-topo">${tipo}</div>
        <div class="titulo">ENTRADA Nº ${item.sisplan || "S/N"}</div>

        ${item.saidaVazia ? `
        <div style="margin:0 auto 10px auto;width:fit-content;border:3px solid #0056b3;
            color:#0056b3;padding:6px 16px;font-size:18px;font-weight:bold;
            transform:rotate(-4deg);letter-spacing:1px;background:#fff;">
            SAINDO VAZIO
        </div>` : ''}

        <div class="cabecalho">
            <div class="logo-bloco">
                <img src="assets/logo-porto.png" style="height:40px;width:auto;display:block;margin:0 auto 4px auto;">
                <div style="font-size:10px;font-weight:bold;text-align:center;">PORTO DO RECIFE S.A.</div>
            </div>
            <div class="datas">
                Entrada: ${dtEnt}<br>
                ${item.dataSaida ? `Saída: ${dtSai}` : ''}
            </div>
        </div>

        <div class="linha"><div class="campo">Motorista:</div><div class="valor">${item.motorista || '-'}</div></div>
        <div class="linha"><div class="campo">Transportadora:</div><div class="valor">${item.transportadora || 'AVULSO'}</div></div>
        <div class="linha"><div class="campo">Veículo:</div><div class="valor">${item.placa || '-'}</div></div>
        <div class="linha"><div class="campo">Cliente:</div><div class="valor">${item.clientes || '-'}</div></div>
        <div class="linha"><div class="campo">Mercadoria:</div><div class="valor">${item.mercadoria || '-'}</div></div>
        <div class="linha"><div class="campo">Embarcação:</div><div class="valor">${item.embarcacao || '-'}</div></div>
        <div class="linha"><div class="campo">Operação:</div><div class="valor">${item.tipo || '-'}</div></div>
        <div class="linha"><div class="campo">DI/DUIMP:</div><div class="valor">${item.di || '-'}</div></div>

        <div class="blocos">
            <div class="bloco">
                <div class="bloco-titulo">Dados de Pesagem</div>
                <div class="peso-linha"><span>Peso Entrada (Tara):</span><span>${item.entrada || "---"} kg</span></div>
                <div class="peso-linha"><span>Peso Saída (Bruto):</span><span>${item.saidaVazia ? "VAZIO" : (item.saida || "---")} kg</span></div>
                <div class="peso-linha" style="margin-top:8px;padding-top:6px;border-top:1px dashed #777;font-size:14px;">
                    <span><b>Líquido:</b></span><span><b>${liquido} kg</b></span>
                </div>
            </div>
            <div class="bloco">
                <div class="bloco-titulo">Dados Complementares</div>
                <div class="peso-linha"><span>operadorbal:</span><span>${item.operadorbal || '-'}</span></div>
                <div class="peso-linha"><span>Sisplan:</span><span>${item.sisplan || 'S/N'}</span></div>
                <div class="peso-linha"><span>Observação:</span><span>${item.observacoes || '-'}</span></div>
            </div>
        </div>

        <div class="rodape">
            <div>OP0004RPT — Impresso em ${new Date().toLocaleDateString('pt-BR')}</div>
            <div>${via}</div>
        </div>
    </div>`).join('');

    const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>Ticket de Pesagem</title>
    <style>
        ${_estilosImpressao()}
        .ticket { width:760px; margin:0 auto 14px auto; background:#fff; padding:10px 14px; box-sizing:border-box; border:1px solid #999; }
        .barra-topo { background:#d6d6d6; text-align:center; font-weight:bold; font-size:11px; padding:2px; letter-spacing:1px; }
        .titulo { text-align:center; font-size:16px; font-weight:bold; margin:4px 0 8px; }
        .cabecalho { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .logo-bloco { font-size:10px; font-weight:bold; width:120px; text-align:center; }
        .datas { text-align:right; font-size:11px; line-height:1.5; }
        .linha { display:flex; font-size:12px; margin-bottom:3px; }
        .campo { width:110px; font-weight:bold; }
        .valor { flex:1; }
        .blocos { display:flex; justify-content:space-between; gap:14px; margin-top:10px; }
        .bloco { flex:1; }
        .bloco-titulo { text-align:center; border-bottom:1px solid #000; margin-bottom:5px; font-size:11px; padding-bottom:2px; }
        .peso-linha { display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; }
        .rodape { display:flex; justify-content:space-between; margin-top:8px; padding-top:4px; border-top:1px dashed #000; font-size:9px; }
        @media print {
            body { background:white; padding:0; }
            .ticket { border:none; width:100%; margin-bottom:4px; page-break-inside: avoid; }
            @page { size: A4; margin: 8mm; }
            html, body { height: auto; }
            .ticket { transform-origin: top left; }
        }
        @media print {
            .ticket { padding:6px 10px; }
            .titulo { font-size:14px; margin:2px 0 5px; }
            .linha { margin-bottom:1px; }
            .blocos { margin-top:6px; }
            .rodape { margin-top:5px; padding-top:3px; }
        }
    </style></head><body>
    <div class="no-print" style="max-width:760px;margin:0 auto 14px auto;background:#fff3cd;border:1px solid #e0b030;color:#7a5c00;padding:10px 16px;border-radius:6px;font-size:13px;text-align:center;">
        ⚠ Impressora conectada pela rede pode estar indisponível em contingência. Verifique e, se necessário, conecte por cabo antes de imprimir.
    </div>
    <button class="no-print" onclick="window.print()">🖨 IMPRIMIR TICKET (3 VIAS)</button>
    ${ticketsHtml}
    </body></html>`;

    _imprimirHtml(win, html);
}
