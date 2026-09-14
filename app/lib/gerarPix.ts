// ============================================================================
// LÓGICA UNIVERSAL DE GERAÇÃO DE PIX ESTÁTICO (SEM APIS DE TERCEIROS)
// ============================================================================

function sanitizeText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '');
}

function crc16CCITT(payload: string): string {
    let crc = 0xFFFF;
    const bytes = new TextEncoder().encode(payload);

    for (let i = 0; i < bytes.length; i++) {
        crc ^= (bytes[i] << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizarChavePix(chave: string): string {
    const c = chave.trim();

    if (c.includes('@')) return c.toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return c.toLowerCase();

    const apenasNumeros = c.replace(/\D/g, '');

    if (apenasNumeros.length === 11 && !c.startsWith('+')) return apenasNumeros;
    if (apenasNumeros.length === 14) return apenasNumeros;
    if (apenasNumeros.length === 10 || apenasNumeros.length === 11) return `+55${apenasNumeros}`;
    if (c.startsWith('+')) return `+${apenasNumeros}`;

    return c;
}

export function gerarPixEstatico({
    chave,
    nome,
    cidade,
    valor,
    txid = '***',
}: {
    chave: string;
    nome: string;
    cidade: string;
    valor: number;
    txid?: string;
}): string {
    const chaveValida = normalizarChavePix(chave);
    const nomeFormatado = sanitizeText(nome).substring(0, 25).toUpperCase();
    const cidadeFormatada = sanitizeText(cidade).substring(0, 15).toUpperCase();
    console.log("teste123", chaveValida, nomeFormatado, cidadeFormatada);

    // GARANTIA DO VALOR: Garante que o valor é numérico maior que zero e com 2 casas
    const valorNum = Math.max(0, Number(valor) || 0);
    const valorFormatado = valorNum.toFixed(2);
    const valorTamanho = String(valorFormatado.length).padStart(2, '0');

    // Bloco 26 (Recebedor)
    const merchantAccount =
        `0014br.gov.bcb.pix` +
        `01${String(chaveValida.length).padStart(2, '0')}${chaveValida}`;

    // Bloco 62 (TXID)
    const txidFormatado = txid.replace(/[^a-zA-Z0-9]/g, '') || '***';
    const txidBlock = `05${String(txidFormatado.length).padStart(2, '0')}${txidFormatado}`;

    // Montagem do Payload com Bloco 54 devidamente estruturado
    let payload =
        `000201` +
        `26${String(merchantAccount.length).padStart(2, '0')}${merchantAccount}` +
        `52040000` +
        `5303986` +
        `54${valorTamanho}${valorFormatado}` + // <-- BLOCO 54 CORRIGIDO
        `5802BR` +
        `59${String(nomeFormatado.length).padStart(2, '0')}${nomeFormatado}` +
        `60${String(cidadeFormatada.length).padStart(2, '0')}${cidadeFormatada}` +
        `62${String(txidBlock.length).padStart(2, '0')}${txidBlock}` +
        `6304`;

    payload += crc16CCITT(payload);

    return payload;
}