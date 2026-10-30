// Filtra uma lista de movimentações para o período Sem SISPLAN atual (mesma
// regra usada para popular a tabela de trânsito). Reaproveitada também pela
// busca de registro anterior, pra ela não trazer registros de períodos Sem
// SISPLAN antigos/já encerrados — só o período em que se está trabalhando
// agora (ou, fora de contingência, o histórico normal).
function _filtrarPorPeriodoAtual(lista) {
    const periodoIdStr = sessionStorage.getItem('sisplan_periodo_id');

    if (periodoIdStr) {
        const periodoId = Number(periodoIdStr);
        return lista.filter(d => d.periodoId === periodoId);
    }

    const periodoInicio = sessionStorage.getItem('sisplan_periodo_inicio');
    if (periodoInicio) {
        const dtInicio = new Date(periodoInicio);
        return lista.filter(d => {
            const dtEntrada = new Date(d.dataEntrada || d.data || 0);
            return dtEntrada >= dtInicio;
        });
    }

    return lista;
}

async function _recarregarDados() {
    const todos = await db.movimentacoes.toArray();

    // Aproveita que "todos" já é o histórico completo (não só do período
    // atual) para manter uma lista de todas as DIs/DUIMPs já digitadas,
    // usada pelo autocomplete do campo DI/DUIMP. Não faz nenhuma chamada
    // extra ao processo principal — só reaproveita o que já foi buscado.
    window._todosDIsHistorico = window._todosDIsHistorico || new Set();
    todos.forEach(d => { if (d.di) window._todosDIsHistorico.add(d.di); });

    dados = _filtrarPorPeriodoAtual(todos);
}


async function _gerarNumeroRM() {
    
    const todos = await db.movimentacoes.toArray();
    const numerosRM = todos
        .map(d => d.sisplan || '')
        .filter(s => /^RM\d{7}$/.test(s))
        .map(s => parseInt(s.slice(2), 10));
    const proximo = numerosRM.length > 0 ? Math.max(...numerosRM) + 1 : 1;
    return 'RM' + String(proximo).padStart(7, '0');
}

function _atualizarCadastroPlacaMotorista(placa, motorista) {
    const regraPlacaBrasil = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/;

    if (placa && regraPlacaBrasil.test(placa) && typeof listaPlacas !== 'undefined') {
        const placaFormatada = placa.includes('-') ? placa : placa.slice(0, 3) + '-' + placa.slice(3);
        const idx = listaPlacas.findIndex(p => p.replace('-', '') === placaFormatada.replace('-', ''));
        if (idx === -1) {
            listaPlacas.push(placaFormatada);
        } else {
            listaPlacas[idx] = placaFormatada;
        }
        if (typeof salvar === 'function') salvar();
    }

    if (motorista && typeof listaMotoristas !== 'undefined') {
        const idx = listaMotoristas.findIndex(m => m === motorista);
        if (idx === -1) {
            listaMotoristas.push(motorista);
        } else {
            listaMotoristas[idx] = motorista;
        }
        if (typeof salvar === 'function') salvar();
    }
}

// Antes, se o operador digitasse no campo Cliente um nome que ainda não
// existia no cadastro, a pesagem era salva normalmente mas o nome NÃO
// entrava na lista de clientes — só entrava se o operador clicasse no "+"
// ou usasse o gerenciador de cadastros à parte. Isso fazia parecer que o
// cadastro "sumia". Agora, ao salvar a pesagem, o cliente digitado é
// cadastrado automaticamente (se ainda não existir), do mesmo jeito que já
// acontecia com placa e motorista.
function _atualizarCadastroCliente(nomeCliente) {
    const nome = (nomeCliente || '').trim().toUpperCase();
    if (!nome || typeof listaclientess === 'undefined') return;

    const jaExiste = listaclientess.some(c => (c || '').trim().toUpperCase() === nome);
    if (!jaExiste) {
        listaclientess.push(nome);
        listaclientess.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        if (typeof salvar === 'function') salvar();
        if (typeof sincronizarSelectCliente === 'function') sincronizarSelectCliente();
    }
}

async function adicionarregistro() {
    const operadorbal = document.getElementById('operadorbalAtivo')?.value || "";

    if (!validaroperadorbalAtivo()) return;

    const tipo          = document.getElementById('tipo')?.value || "";
    const sisplan       = document.getElementById('sisplan')?.value || "";
    const di            = document.getElementById('di')?.value || "";
    const placa         = (document.getElementById('placa')?.value || "").trim().toUpperCase();
    const motorista     = (document.getElementById('motorista')?.value || "").trim().toUpperCase();
    const transportadora= document.getElementById('transportadora')?.value || "";
    const embarcacao    = document.getElementById('embarcacao')?.value || "";
    const clientes      = document.getElementById('cliente')?.value || "";
    const mercadoria    = document.getElementById('mercadoria')?.value || "";
    const observacoes   = document.getElementById('observacoes')?.value || "";
    const entrada       = document.getElementById('entrada')?.value || "";
    const dataEntrada = document.getElementById('dataEntrada')?.value || "";
    const dataSaida   = document.getElementById('dataSaida')?.value || "";

    if (dataEntrada && dataSaida) {
        if (new Date(dataSaida) < new Date(dataEntrada)) {
            abrirModalSistema({
                titulo: "Erro de Data",
                mensagem: "A data/hora de saída não pode ser menor que a de entrada.",
                botoes: [{ texto: "Corrigir", estilo: "danger", acao: () => {} }]
            });
            return;
        }
    }

    const faltando = validarCamposOperacao();
    if (faltando.length > 0) {
        abrirModalSistema({
            titulo: "Campos Incompletos",
            mensagem: "Preencha os campos obrigatórios: " + faltando.join(", "),
            botoes: [{ texto: "Entendido", estilo: "info", acao: () => {} }]
        });
        return;
    }

    if (typeof validarPesoOuMotivoErro === 'function') {
        const saidaDigitada = document.getElementById('saida')?.value || "";

        const checagens = [
            validarPesoOuMotivoErro(entrada, sisplan, "Peso de Entrada"),
            saidaDigitada ? validarPesoOuMotivoErro(saidaDigitada, sisplan, "Peso de Saída") : null
        ].filter(Boolean);

        const bloqueio = checagens.find(c => c.tipo === 'bloqueio');
        if (bloqueio) {
            abrirModalSistema({
                titulo: "Peso Incorreto",
                mensagem: bloqueio.mensagem,
                botoes: [{ texto: "Corrigir", estilo: "danger", acao: () => {} }]
            });
            return;
        }

        const aviso = checagens.find(c => c.tipo === 'aviso');
        if (aviso) {
            abrirModalSistema({
                titulo: "Confirme o Peso",
                mensagem: aviso.mensagem,
                botoes: [
                    { texto: "Salvar Assim Mesmo", estilo: "danger", acao: () => _continuarSalvamentoRegistro() },
                    { texto: "Corrigir", estilo: "info", acao: () => {} }
                ]
            });
            return;
        }
    }

    await _continuarSalvamentoRegistro();

    async function _continuarSalvamentoRegistro() {
    _atualizarCadastroPlacaMotorista(placa, motorista);
    _atualizarCadastroCliente(clientes);

    const pesagem = {
        tipo, sisplan, di, placa, motorista, transportadora,
        embarcacao, clientes, mercadoria, observacoes, entrada,
        saida: "",
        operadorbal,
        dataEntrada: dataEntrada || new Date().toISOString(),
        dataSaida: "",
        coordenador: window.coordenadorSessaoAtual || "NÃO CADASTRADO",
        saidaVazia: false,
        periodoId: (typeof window._periodoIdSessaoAtual === 'function') ? window._periodoIdSessaoAtual() : null
    };

    try {
        if (typeof editIdx !== 'undefined' && editIdx > -1) {
            
            const registroAtual = dados[editIdx];
            const idRegistro    = registroAtual.id;

            if (!pesagem.sisplan || pesagem.sisplan.trim() === '') {
                if (registroAtual._rmProvisorio && registroAtual.sisplan) {
                    pesagem.sisplan = registroAtual.sisplan;
                    pesagem._rmProvisorio = true;
                }
            } else {
                
                pesagem._rmProvisorio = false;
            }

            pesagem.saida      = document.getElementById('saida')?.value || registroAtual.saida || "";
            pesagem.dataSaida  = dataSaida
                ? new Date(dataSaida).toISOString()
                : registroAtual.dataSaida || "";
            pesagem.saidaVazia = registroAtual.saidaVazia || false;

            await db.movimentacoes.update(idRegistro, pesagem);
            if (typeof autoBackupSilencioso === 'function') autoBackupSilencioso();

            await db.logs.add({
                data: new Date().toISOString(),
                operadorbal,
                acao: `Pesagem Editada — Placa: ${placa} | Coord: ${pesagem.coordenador}`,
                placa
            });

            await _recarregarDados();

            abrirModalSistema({
                titulo: "Sucesso",
                mensagem: "Pesagem editada com sucesso!",
                botoes: [{ texto: "OK", estilo: "info", acao: () => {
                    if (typeof render === 'function') render();
                }}]
            });

        } else {
            
            if (verificarPlacaEmTransito(placa)) {
                abrirModalSistema({
                    titulo: "Placa em Trânsito",
                    mensagem: `A placa ${placa} já possui uma entrada sem saída registrada. Deseja continuar mesmo assim?`,
                    botoes: [
                        { texto: "Registrar Assim Mesmo", estilo: "danger", acao: async () => {
                            await _salvarNovaPesagem(pesagem, placa, operadorbal);
                        }},
                        { texto: "Cancelar", estilo: "info", acao: () => {} }
                    ]
                });
                return;
            }

            await _salvarNovaPesagem(pesagem, placa, operadorbal);
            return; 
        }

        if (typeof limparFormulario === 'function') limparFormulario();
        if (typeof render === 'function') render();

    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        abrirModalSistema({
            titulo: "Erro",
            mensagem: "Erro ao gravar dados: " + erro.message,
            botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
        });
    }
    }
}

async function _salvarNovaPesagem(pesagem, placa, operadorbal) {
    
    if (!pesagem.sisplan || pesagem.sisplan.trim() === '') {
        pesagem.sisplan = await _gerarNumeroRM();
        pesagem._rmProvisorio = true; 
    }

    const novoId = await db.movimentacoes.add(pesagem);
    pesagem.id   = novoId;
    if (typeof autoBackupSilencioso === 'function') autoBackupSilencioso();

    await db.logs.add({
        data: new Date().toISOString(),
        operadorbal,
        acao: `Nova Pesagem — Placa: ${placa} | Coord: ${pesagem.coordenador}`,
        placa
    });

    await _recarregarDados();

    const registroSalvo = dados.find(d => d.id === novoId);
    if (registroSalvo) {
        gerarRegistroEntrada(registroSalvo);
    }

    if (typeof limparFormulario === 'function') limparFormulario();
    if (typeof render === 'function') render();
}

function editar(id) {
    const idx = dados.findIndex(d => d.id === id);
    if (idx === -1) return;

    editIdx = idx;
    const d = dados[idx];

    const campos = {
        'tipo': d.tipo, 'sisplan': d.sisplan, 'di': d.di,
        'placa': d.placa, 'motorista': d.motorista,
        'transportadora': d.transportadora, 'embarcacao': d.embarcacao,
        'cliente': d.clientes, 'mercadoria': d.mercadoria,
        'observacoes': d.observacoes, 'entrada': d.entrada,
        'saida': d.saida
    };

    for (const [id, val] of Object.entries(campos)) {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    }

    const elEntrada = document.getElementById('dataEntrada');
    const elSaida   = document.getElementById('dataSaida');

    if (elEntrada) {
    elEntrada.value    = paraInputLocal(d.dataEntrada);
    elEntrada.disabled = false;
}
if (elSaida) {
    elSaida.value    = paraInputLocal(d.dataSaida);
    elSaida.disabled = false;
}

    if (typeof activarModoEdicaoBotao === 'function') activarModoEdicaoBotao();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function paraInputLocal(dataStr) {
    if (!dataStr) return '';
    const d = new Date(dataStr);
    if (isNaN(d)) return '';
    const off = d.getTimezoneOffset() * 60000; 
    return new Date(d - off).toISOString().slice(0, 16);
}

function del(id) {
    if (!validaroperadorbalAtivo()) return;

    const idx = dados.findIndex(d => d.id === id);
    if (idx === -1) return;

    const d = dados[idx];

    abrirModalSistema({
        titulo: "Excluir Registro",
        mensagem: `Excluir o registro da placa ${d.placa} de ${new Date(d.dataEntrada).toLocaleDateString()}? Esta ação não pode ser desfeita.`,
        botoes: [
            { texto: "Confirmar Exclusão", estilo: "danger", acao: async () => {
                await db.movimentacoes.delete(id);
                await db.logs.add({
                    data: new Date().toISOString(),
                    operadorbal: document.getElementById('operadorbalAtivo')?.value || "",
                    acao: `Registro Excluído — Placa: ${d.placa}`,
                    placa: d.placa
                });
                await _recarregarDados();
                render();
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
}

// Tipo de operação em que o caminhão só pesa vazio (tara) na primeira vez;
// nas viagens seguintes ele só passa carregado. Fica centralizado aqui para
// não espalhar a string exata da operação por vários arquivos.
const TIPO_OPERACAO_VIRA = 'EMBARCAÇÃO->ARMAZÉM DO PORTO(VIRA)';

function duplicar(id, registroDireto) {
    if (!validaroperadorbalAtivo()) return;

    const original = registroDireto || dados.find(d => d.id === id);
    if (!original) return;

    // Na operação VIRA a tara já é conhecida (foi pesada na primeira
    // entrada do caminhão); nas viagens seguintes o operador não deve
    // precisar pesar vazio de novo — só o peso carregado (saída). Então,
    // em vez do fluxo normal de "duplicar" (que pede peso de entrada),
    // vamos direto para um atalho que já reaproveita a tara e só pede o
    // peso de saída, salvando os dois de uma vez e imprimindo o ticket.
    // Esse atalho também oferece a opção de pesar uma tara nova, para
    // quando o caminhão sai do porto e volta depois (a tara antiga pode
    // não valer mais).
    if (original.tipo === TIPO_OPERACAO_VIRA && original.entrada) {
        _novaViradaCarregada(original);
        return;
    }

    _duplicarComNovaTara(original);
}

// Fluxo clássico de "duplicar": preenche o formulário com os dados do
// veículo mas deixa o peso de entrada em branco, para o operador pesar a
// tara do zero. É o fluxo padrão para qualquer operação que não seja VIRA,
// e também fica disponível dentro do atalho da VIRA para quando o caminhão
// precisa de uma tara nova (por exemplo: saiu do porto e voltou depois).
function _duplicarComNovaTara(original) {
    abrirModalSistema({
        titulo: "Duplicar Registro",
        mensagem: `Criar nova entrada para o mesmo veículo (${original.placa} — ${original.motorista})? O formulário será preenchido com os dados anteriores. Só adicione o novo peso de entrada.`,
        botoes: [
            { texto: "Sim, preencher formulário", estilo: "danger", acao: () => {
                
                editIdx = -1;

                const campos = {
                    'tipo': original.tipo, 'sisplan': '', 'di': original.di,
                    'placa': original.placa, 'motorista': original.motorista,
                    'transportadora': original.transportadora,
                    'embarcacao': original.embarcacao,
                    'cliente': original.clientes, 'mercadoria': original.mercadoria,
                    'observacoes': ''
                };
                for (const [campoId, val] of Object.entries(campos)) {
                    const el = document.getElementById(campoId);
                    if (el) el.value = val || "";
                }

                const elEntrada = document.getElementById('entrada');
                const elSaida   = document.getElementById('saida');
                const elDtEnt   = document.getElementById('dataEntrada');
                const elDtSai   = document.getElementById('dataSaida');
                if (elEntrada) elEntrada.value = "";
                if (elSaida)   elSaida.value   = "";
                if (elDtEnt) { elDtEnt.value = ""; elDtEnt.disabled = false; }
                if (elDtSai) { elDtSai.value = ""; elDtSai.disabled = false; }

                const btnSalvar   = document.getElementById('btnSalvar');
                const btnCancelar = document.getElementById('btnCancelar');
                if (btnSalvar)   { btnSalvar.textContent = "Salvar Pesagem"; btnSalvar.classList.remove('modo-edicao'); }
                if (btnCancelar) btnCancelar.style.display = "inline-block";

                window.scrollTo({ top: 0, behavior: 'smooth' });

                abrirModalSistema({
                    titulo: "Formulário Pronto",
                    mensagem: `Dados de ${original.placa} carregados. Informe o peso de entrada e salve a nova pesagem.`,
                    botoes: [{ texto: "Entendido", estilo: "info", acao: () => {} }]
                });
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
}

// Cria efetivamente o novo registro de uma "virada" (carregado ou vazio),
// reaproveitando a tara do registro original. Usado tanto para o caminhão
// que volta carregado quanto para o que encerra o ciclo saindo vazio.
async function _criarRegistroVirada(original, { sisplan, saidaPeso, saidaVazia, descricaoLog }) {
    if (!validaroperadorbalAtivo()) return;
    const operadorbal = document.getElementById('operadorbalAtivo')?.value || "";
    const agora = new Date().toISOString();

    const pesagem = {
        tipo: original.tipo,
        sisplan: sisplan || await _gerarNumeroRM(),
        di: original.di || "",
        placa: original.placa,
        motorista: original.motorista,
        transportadora: original.transportadora || "",
        embarcacao: original.embarcacao || "",
        clientes: original.clientes || "",
        mercadoria: original.mercadoria || "",
        observacoes: original.observacoes || "",
        entrada: original.entrada,
        saida: saidaVazia ? "" : saidaPeso,
        operadorbal,
        dataEntrada: agora,
        dataSaida: agora,
        coordenador: window.coordenadorSessaoAtual || "NÃO CADASTRADO",
        saidaVazia: !!saidaVazia,
        _rmProvisorio: !sisplan,
        periodoId: (typeof window._periodoIdSessaoAtual === 'function') ? window._periodoIdSessaoAtual() : null
    };

    const novoId = await db.movimentacoes.add(pesagem);
    pesagem.id = novoId;
    if (typeof autoBackupSilencioso === 'function') autoBackupSilencioso();

    await db.logs.add({
        data: agora,
        operadorbal,
        acao: descricaoLog,
        placa: original.placa
    });

    await _recarregarDados();
    if (typeof render === 'function') render();

    const todos = await db.movimentacoes.toArray();
    const salvo = todos.find(d => d.id === novoId);
    if (salvo) gerarTicket(salvo);
    if (typeof window._atualizarBuscaRegistroAnterior === 'function') window._atualizarBuscaRegistroAnterior();
}

// Atalho para a operação VIRA: reaproveita a tara (peso de entrada) já
// registrada anteriormente para o mesmo veículo/embarcação. Cobre os dois
// desfechos possíveis de uma nova viagem: o caminhão volta carregado (só
// pede o peso de saída) ou o caminhão encerra o ciclo saindo vazio (não
// pede peso nenhum, só fecha o ciclo). Em ambos os casos cria, de uma vez
// só, um novo registro já fechado (entrada + saída). O caminhão pode depois
// voltar para uma nova "virada" (mesma operação) ou para qualquer outra
// operação normalmente, usando o registro que ficar mais recente como base.
// Usado a partir de "Duplicar" quando o registro original é do tipo VIRA.
function _novaViradaCarregada(original) {
    const inputHTML = `
        <div style="margin-bottom:12px;">
            <label style="display:block; font-weight:600; margin-bottom:4px; font-size:13px;">
                Sisplan (deixe em branco se esta viagem não tiver número próprio)
            </label>
            <input type="text" id="sisplan-virada-input" placeholder="Nº Sisplan (7 dígitos)" maxlength="7"
                   style="width:100%; padding:10px; border-radius:6px;
                          border:1px solid var(--border-input); box-sizing:border-box;
                          font-size:16px; text-align:center;
                          background: var(--bg-input); color: var(--text-primary);">
        </div>
        <div>
            <label style="display:block; font-weight:600; margin-bottom:4px; font-size:13px;">
                Peso carregado (peso de saída) — deixe em branco se o caminhão vai sair vazio
            </label>
            <input type="text" id="peso-virada-input" inputmode="numeric"
               placeholder="Ex: 15.000"
               oninput="mascaraPeso(this)"
               style="width:100%; padding:10px; border-radius:6px;
                      border:1px solid var(--border-input); box-sizing:border-box;
                      font-size:20px; font-weight:700; text-align:center;
                      background: var(--bg-input); color: var(--text-primary);">
        </div>
    `;

    function _lerCampos() {
        const pesoCarregado = (window._modalInputs?.['peso-virada-input']
            || document.getElementById('peso-virada-input')?.value
            || "").trim();
        const sisplanDigitado = (window._modalInputs?.['sisplan-virada-input']
            || document.getElementById('sisplan-virada-input')?.value
            || "").trim().toUpperCase();
        return { pesoCarregado, sisplanDigitado };
    }

    abrirModalSistema({
        titulo: `Nova Virada — ${original.placa}`,
        mensagem: `Placa: ${original.placa} | Motorista: ${original.motorista}<br>
                    Tara já registrada (reaproveitada): <strong>${original.entrada} kg</strong>`,
        conteudoExtra: inputHTML,
        botoes: [
            { texto: "Confirmar Carregado e Imprimir Ticket", estilo: "success", acao: async () => {
                const { pesoCarregado, sisplanDigitado } = _lerCampos();

                if (!pesoCarregado) {
                    abrirModalSistema({
                        titulo: "Campo Obrigatório",
                        mensagem: "Informe o peso carregado, ou use \"Sair Vazio\" se o caminhão não está levando carga desta vez.",
                        botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
                    });
                    return;
                }

                async function _efetivarNovaVirada() {
                    await _criarRegistroVirada(original, {
                        sisplan: sisplanDigitado,
                        saidaPeso: pesoCarregado,
                        saidaVazia: false,
                        descricaoLog: `Nova Virada (carregado) — Placa: ${original.placa} | Tara reaproveitada: ${original.entrada} kg | Peso Saída: ${pesoCarregado} kg`
                    });
                }

                if (typeof validarPesoOuMotivoErro === 'function') {
                    const checagem = validarPesoOuMotivoErro(pesoCarregado, sisplanDigitado, "Peso de Saída");
                    if (checagem?.tipo === 'bloqueio') {
                        abrirModalSistema({
                            titulo: "Peso Incorreto",
                            mensagem: checagem.mensagem,
                            botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
                        });
                        return;
                    }
                    if (checagem?.tipo === 'aviso') {
                        abrirModalSistema({
                            titulo: "Confirme o Peso",
                            mensagem: checagem.mensagem,
                            botoes: [
                                { texto: "Salvar Assim Mesmo", estilo: "danger", acao: () => _efetivarNovaVirada() },
                                { texto: "Corrigir", estilo: "info", acao: () => {} }
                            ]
                        });
                        return;
                    }
                }

                await _efetivarNovaVirada();
            }},
            { texto: "Sair Vazio (Encerrar Ciclo)", estilo: "danger", acao: async () => {
                const { sisplanDigitado } = _lerCampos();

                abrirModalSistema({
                    titulo: "Confirmar Saída Vazia",
                    mensagem: `Encerrar o ciclo de viradas de ${original.placa} — ${original.motorista} com saída vazia? O caminhão poderá voltar depois para uma nova virada ou outra operação normalmente.`,
                    botoes: [
                        { texto: "Confirmar Vazio", estilo: "danger", acao: async () => {
                            await _criarRegistroVirada(original, {
                                sisplan: sisplanDigitado,
                                saidaPeso: "",
                                saidaVazia: true,
                                descricaoLog: `Virada Encerrada — Saída Vazia — Placa: ${original.placa} | Tara reaproveitada: ${original.entrada} kg`
                            });
                        }},
                        { texto: "Cancelar", estilo: "info", acao: () => {} }
                    ]
                });
            }},
            { texto: "Pesar Nova Tara (Caminhão Saiu e Voltou)", estilo: "info", acao: () => {
                _duplicarComNovaTara(original);
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
}

function registrarSaida(id, registroDireto) {
    if (!validaroperadorbalAtivo()) return;

    const registro = registroDireto || dados.find(d => d.id === id);
    if (!registro) return;

    const inputHTML = `
        <input type="text" id="peso-saida-input" inputmode="numeric"
               placeholder="Ex: 15.000"
               oninput="mascaraPeso(this)"
               style="width:100%; padding:10px; border-radius:6px;
                      border:1px solid var(--border-input); box-sizing:border-box;
                      font-size:20px; font-weight:700; text-align:center;
                      background: var(--bg-input); color: var(--text-primary);">
    `;

    abrirModalSistema({
        titulo: `Saída — ${registro.placa}`,
        mensagem: `Placa: ${registro.placa} | Motorista: ${registro.motorista}<br>Peso de Entrada: <strong>${registro.entrada} kg</strong>`,
        conteudoExtra: inputHTML,
        botoes: [
            { texto: "Confirmar Saída e Imprimir Ticket", estilo: "success", acao: async () => {
    const pesoSaida = (window._modalInputs?.['peso-saida-input']
                       || document.getElementById('peso-saida-input')?.value
                       || "").trim();

    if (!pesoSaida) {
        abrirModalSistema({
            titulo: "Campo Obrigatório",
            mensagem: "Informe o peso de saída.",
            botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
        });
        return;
    }

    async function _efetivarSaida() {
        await db.movimentacoes.update(id, {
            saida: pesoSaida,
            dataSaida: new Date().toISOString()
        });
        if (typeof autoBackupSilencioso === 'function') autoBackupSilencioso();

        await db.logs.add({
            data: new Date().toISOString(),
            operadorbal: document.getElementById('operadorbalAtivo')?.value || "",
            acao: `Saída Registrada — Placa: ${registro.placa} | Peso Saída: ${pesoSaida} kg`,
            placa: registro.placa
        });

        await _recarregarDados();
        render();

        // Busca o registro atualizado no histórico completo (não só no período
        // atual), pois esta função também é chamada a partir da busca de
        // registros anteriores — o registro pode pertencer a um período já
        // encerrado e não estar mais em "dados".
        const todos      = await db.movimentacoes.toArray();
        const atualizado = todos.find(d => d.id === id);
        if (atualizado) gerarTicket(atualizado);
        if (typeof window._atualizarBuscaRegistroAnterior === 'function') window._atualizarBuscaRegistroAnterior();
    }

    if (typeof validarPesoOuMotivoErro === 'function') {
        const checagem = validarPesoOuMotivoErro(pesoSaida, registro.sisplan, "Peso de Saída");
        if (checagem?.tipo === 'bloqueio') {
            abrirModalSistema({
                titulo: "Peso Incorreto",
                mensagem: checagem.mensagem,
                botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
            });
            return;
        }
        if (checagem?.tipo === 'aviso') {
            abrirModalSistema({
                titulo: "Confirme o Peso",
                mensagem: checagem.mensagem,
                botoes: [
                    { texto: "Salvar Assim Mesmo", estilo: "danger", acao: () => _efetivarSaida() },
                    { texto: "Corrigir", estilo: "info", acao: () => {} }
                ]
            });
            return;
        }
    }

    await _efetivarSaida();
}},
            { texto: "Cancelar", estilo: "secondary", acao: () => {} }
        ]
    });
}

function marcarVazio(id, registroDireto) {
    if (!validaroperadorbalAtivo()) return;

    const registro = registroDireto || dados.find(d => d.id === id);
    if (!registro) return;

    abrirModalSistema({
        titulo: "Confirmar Saída Vazia",
        mensagem: `Marcar saída vazia para ${registro.placa} — ${registro.motorista}?`,
        botoes: [
            { texto: "Confirmar Vazio", estilo: "danger", acao: async () => {
                await db.movimentacoes.update(id, {
                    saidaVazia: true,
                    dataSaida: new Date().toISOString()
                });
                if (typeof autoBackupSilencioso === 'function') autoBackupSilencioso();

                await db.logs.add({
                    data: new Date().toISOString(),
                    operadorbal: document.getElementById('operadorbalAtivo')?.value || "",
                    acao: `Saída Vazia — Placa: ${registro.placa}`,
                    placa: registro.placa
                });

                await _recarregarDados();
                render();

                const todos      = await db.movimentacoes.toArray();
                const atualizado = todos.find(d => d.id === id);
                if (atualizado) gerarTicket(atualizado);
                if (typeof window._atualizarBuscaRegistroAnterior === 'function') window._atualizarBuscaRegistroAnterior();
            }},
            { texto: "Cancelar", estilo: "info", acao: () => {} }
        ]
    });
}

async function salvarNovoRegistro(tipoParam, nomeParam) {
    const campoNome    = document.getElementById('cadNome');
    const selectLista  = document.getElementById('switchLista');

    let nomeValue, tabelaDestino;

    if (typeof tipoParam !== 'undefined' && typeof nomeParam !== 'undefined') {
        nomeValue      = nomeParam.trim().toUpperCase();
        tabelaDestino  = tipoParam.toLowerCase();
    } else {
        if (!campoNome || !selectLista) return;
        nomeValue     = campoNome.value.trim().toUpperCase();
        tabelaDestino = selectLista.value;
    }

    if (!nomeValue) {
        abrirModalSistema({
            titulo: "Campo Obrigatório",
            mensagem: "Digite o nome antes de salvar.",
            botoes: [{ texto: "OK", estilo: "info", acao: () => campoNome?.focus() }]
        });
        return;
    }

    const mapa = {
    'operadorbal':        'listaoperadoresbal',
    'operadoresbal':      'listaoperadoresbal',
    'coordenador':     'listaCoordenadores',
    'coordenadores':   'listaCoordenadores',
    'cliente':         'listaclientess',
    'clientes':        'listaclientess',
    'embarcacao':      'listaEmbarcacoes',
    'embarcacoes':     'listaEmbarcacoes',
    'mercadoria':      'listaMercadorias',
    'mercadorias':     'listaMercadorias',
    'motorista':       'listaMotoristas',
    'motoristas':      'listaMotoristas',
    'placa':           'listaPlacas',
    'placas':          'listaPlacas',
    'transportadora':  'listaTransportadoras',
    'transportadoras': 'listaTransportadoras'
};

const nomeVar = mapa[tabelaDestino];
if (!nomeVar) {
    abrirModalSistema({
        titulo: "Tipo não reconhecido",
        mensagem: `O tipo de cadastro "${tabelaDestino}" não está mapeado. (Avise o suporte com este texto.)`,
        botoes: [{ texto: "OK", estilo: "danger", acao: () => {} }]
    });
    return;
}

    if (!window[nomeVar]) window[nomeVar] = [];
    if (!window[nomeVar].includes(nomeValue)) window[nomeVar].push(nomeValue);

    if (typeof salvar === 'function') await salvar();
    if (typeof renderListaGerencia === 'function') renderListaGerencia();
    if (typeof popularSelects === 'function') popularSelects();

    abrirModalSistema({
        titulo: "Cadastro Salvo",
        mensagem: `${tabelaDestino.toUpperCase()} cadastrado com sucesso!`,
        botoes: [{ texto: "OK", estilo: "info", acao: () => {} }]
    });

    if (campoNome) campoNome.value = "";
    if (typeof fecharModal === 'function') fecharModal();
}

function obterDadosFiltrados() {
    return dados.filter(d => {
        const navio          = document.getElementById('filtroNavio')?.value || "";
        const cliente        = document.getElementById('filtroCliente')?.value || "";
        const transportadora = document.getElementById('filtroTransportadora')?.value || "";
        const di             = document.getElementById('filtroDi')?.value.trim() || "";
        const dataInicio     = document.getElementById('filtroInicio')?.value || "";
        const dataFim        = document.getElementById('filtroFim')?.value || "";

        const dataRegistro = new Date(d.dataEntrada || d.data);

        if (navio          && d.embarcacao !== navio)                       return false;
        if (cliente        && d.clientes !== cliente)                       return false;
        if (transportadora && (d.transportadora || 'AVULSO') !== transportadora) return false;
        if (di             && !(d.di || '').includes(di))                   return false;
        if (dataInicio     && dataRegistro < new Date(dataInicio + 'T00:00:00')) return false;
        if (dataFim        && dataRegistro > new Date(dataFim   + 'T23:59:59')) return false;

        return true;
    });
}

function sincronizarSelectCliente() {
    garantirClienteNoronha();
    const dl = document.getElementById('lista-clientes');
    if (!dl) return;
    dl.innerHTML = [...new Set(listaclientess)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
        .map(c => `<option value="${c}">`)
        .join('');
}

window.adicionarregistro    = adicionarregistro;
window.editar               = editar;
window.del                  = del;
window.duplicar             = duplicar;
window.registrarSaida       = registrarSaida;
window.marcarVazio          = marcarVazio;
window.salvarNovoRegistro   = salvarNovoRegistro;
window.obterDadosFiltrados  = obterDadosFiltrados;
window.sincronizarSelectCliente = sincronizarSelectCliente;
