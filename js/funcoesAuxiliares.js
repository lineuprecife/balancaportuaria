function formatarMilhar(v) { 
    if (v === null || v === undefined || v === "") return ""; 
    let num = v.toString().replace(/\D/g, "");
    if (num === "") return "";
    return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); 
}

function mascaraPeso(i) { i.value = formatarMilhar(i.value); }

function formatarDI(i) {

    let v = i.value.toUpperCase();
    v = v.replace(/[^A-Z0-9]/g, '');

    const temLetra = /[A-Z]/.test(v);

    if (temLetra) {
        // DUIMP: 2 dígitos (ano) + "BR" + 10 dígitos + 1 dígito verificador
        // (formato oficial da Receita Federal: AABRNNNNNNNNNN-D).
        // Antes, o "BR" só era reconhecido se já estivesse completo na string
        // digitada — como o operador digita "B" e "R" em teclas separadas, o
        // "B" era apagado antes do "R" entrar e o campo nunca formatava. Agora,
        // basta aparecer QUALQUER letra para entrar no modo DUIMP, e o "BR" é
        // sempre inserido certo (as letras digitadas só servem de gatilho —
        // só existe uma letra válida aqui, que é "BR").
        const digitos = v.replace(/[^0-9]/g, '').slice(0, 13);
        const ano   = digitos.slice(0, 2);
        const corpo = digitos.slice(2, 12);
        const dv    = digitos.slice(12, 13);

        let out = ano + 'BR';
        if (corpo) out += corpo;
        if (dv) out += '-' + dv;

        i.value = out;
        return;
    }

    if (v.length > 10) {
        v = v.slice(0, 10);
    }

    if (v.length > 2 && v.length <= 9) {

        v =
            v.slice(0, 2) +
            '/' +
            v.slice(2);

    } else if (v.length > 9) {

        v =
            v.slice(0, 2) +
            '/' +
            v.slice(2, 9) +
            '-' +
            v.slice(9, 10);
    }

    i.value = v;
}