const BOM = '\uFEFF'

export function protegerFormula(valor) {
  const texto = String(valor ?? '')
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto
}

export function celulaCsv(valor) {
  const texto = protegerFormula(valor)
  if (!/[;"\r\n]/.test(texto)) return texto
  return `"${texto.split('"').join('""')}"`
}

export function gerarCsv(cabecalho, linhas) {
  const todas = [cabecalho, ...linhas]
  return BOM + todas.map((linha) => linha.map(celulaCsv).join(';')).join('\r\n') + '\r\n'
}

// Como a forma aparece para quem abre a planilha.
const NOMES_FORMA = { pix: 'Pix', cartao: 'Cartão', outro: 'Outro' }

export function formatarReais(centavos) {
  return (Number(centavos || 0) / 100).toFixed(2).replace('.', ',')
}

export function formatarDataBrasilia(valor) {
  if (!valor) return ''
  const texto = String(valor).trim().replace(' ', 'T')
  const utc = new Date(texto.endsWith('Z') ? texto : `${texto}Z`)
  if (Number.isNaN(utc.getTime())) return ''
  const data = new Date(utc.getTime() - 3 * 3600000)
  const dois = (n) => String(n).padStart(2, '0')
  return `${dois(data.getUTCDate())}/${dois(data.getUTCMonth() + 1)}/${data.getUTCFullYear()} ${dois(data.getUTCHours())}:${dois(data.getUTCMinutes())}`
}

// DDD + número (como o checkout grava) → (27) 99999-9999. Fora disso, devolve como veio.
export function formatarCelular(digitos) {
  const d = String(digitos || '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export function hojeBrasilia(agora = new Date()) {
  return new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10)
}

export const CABECALHO_CLIENTES = [
  'Nome',
  'E-mail',
  'Data da compra',
  'Valor',
  'Forma',
  'Cupom',
  'Criou senha',
  'Downloads',
  'Compras',
  'Bloqueado',
]

export function linhaClienteCsv(linha) {
  return [
    linha.nome || '',
    linha.email || '',
    formatarDataBrasilia(linha.compra_em),
    formatarReais(linha.compra_valor_centavos),
    NOMES_FORMA[linha.compra_forma] || 'Sem informação',
    linha.compra_cupom || '',
    linha.supabase_id ? 'Sim' : 'Não',
    Number(linha.downloads || 0),
    Number(linha.compras || 0),
    Number(linha.bloqueado) ? 'Sim' : 'Não',
  ]
}

// A aba Clientes leva também o WhatsApp do checkout (a de período não).
export const CABECALHO_CLIENTES_COM_WHATSAPP = ['Nome', 'E-mail', 'WhatsApp', ...CABECALHO_CLIENTES.slice(2)]

export function linhaClienteComWhatsappCsv(linha) {
  const [nome, email, ...resto] = linhaClienteCsv(linha)
  return [nome, email, formatarCelular(linha.telefone), ...resto]
}
