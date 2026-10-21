// Regras puras dos cupons (sem banco): código, cálculo do preço, validação do
// formulário da gestão, conversão da linha do D1 e vencimento do link. As
// consultas ficam em cupons.js, que reexporta o que é público daqui.
export const CODIGO_RE = /^[A-Z0-9_-]{4,40}$/
const DATA_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export const ERRO_CUPOM_PUBLICO = 'Cupom inválido, vencido ou esgotado.'

export function normalizarCodigoCupom(valor) {
  return String(valor || '').trim().toUpperCase()
}

export function codigoCupomValido(valor) {
  return CODIGO_RE.test(normalizarCodigoCupom(valor))
}

export function calcularPrecoCupom(precoCentavos, tipo, valor) {
  const preco = Number(precoCentavos)
  const desconto = Number(valor)
  if (!Number.isSafeInteger(preco) || preco < 100 || !Number.isSafeInteger(desconto)) {
    return null
  }

  const calculado = tipo === 'percentual'
    ? Math.round((preco * (100 - desconto)) / 100)
    : tipo === 'valor'
      ? preco - desconto
      : NaN

  if (!Number.isFinite(calculado)) return null
  return Math.max(100, calculado)
}

function partesData(valor) {
  const achado = DATA_RE.exec(String(valor || ''))
  if (!achado) return null
  const ano = Number(achado[1])
  const mes = Number(achado[2])
  const dia = Number(achado[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) return null
  return { ano, mes, dia }
}

function dataBrasilia(agora) {
  return new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10)
}

function somarUmAno(data) {
  const partes = partesData(data)
  const dia = new Date(Date.UTC(partes.ano + 1, partes.mes - 1, partes.dia))
  // 29/02 vira o último dia de fevereiro, em vez de pular para março.
  if (dia.getUTCMonth() !== partes.mes - 1) dia.setUTCDate(0)
  return dia.toISOString().slice(0, 10)
}

// O fim inclusivo de um dia de Brasília (23:59:59 em UTC-3) cai às 02:59:59
// UTC do dia seguinte. O D1 guarda o texto em UTC, como o restante do projeto.
export function fimDoDiaBrasiliaUtc(valor) {
  const partes = partesData(valor)
  if (!partes) return null
  const utc = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia + 1, 2, 59, 59))
  return utc.toISOString().slice(0, 19).replace('T', ' ')
}

function inteiro(valor) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) ? numero : null
}

function invalido(campo, erro) {
  return { ok: false, campo, erro }
}

export function validarCriacaoCupom(dados, precoBaseCentavos, agora = new Date()) {
  const codigo = normalizarCodigoCupom(dados?.codigo)
  if (!CODIGO_RE.test(codigo)) {
    return invalido('codigo', 'Use de 4 a 40 caracteres: letras, números, hífen ou sublinhado.')
  }

  const tipo = String(dados?.tipo || '')
  if (tipo !== 'percentual' && tipo !== 'valor') {
    return invalido('tipo', 'Escolha desconto percentual ou em valor.')
  }

  const valor = inteiro(dados?.valor)
  if (tipo === 'percentual' && (valor === null || valor < 1 || valor > 100)) {
    return invalido('valor', 'O percentual deve ser um número inteiro de 1 a 100.')
  }
  if (
    tipo === 'valor' &&
    (valor === null || valor < 1 || valor >= Number(precoBaseCentavos))
  ) {
    return invalido('valor', 'O desconto deve ser em centavos e menor que o preço do produto.')
  }

  const validoAte = String(dados?.valido_ate || '')
  if (!partesData(validoAte)) {
    return invalido('valido_ate', 'Informe uma data válida no formato AAAA-MM-DD.')
  }
  const hoje = dataBrasilia(agora)
  if (validoAte < hoje || validoAte > somarUmAno(hoje)) {
    return invalido('valido_ate', 'A validade deve ficar entre hoje e um ano a partir de hoje.')
  }

  const limiteUsos = inteiro(dados?.limite_usos)
  if (limiteUsos === null || limiteUsos < 1 || limiteUsos > 10000) {
    return invalido('limite_usos', 'O limite deve ser um número inteiro de 1 a 10.000.')
  }

  return {
    ok: true,
    dados: {
      codigo,
      tipo,
      valor,
      valido_ate: fimDoDiaBrasiliaUtc(validoAte),
      limite_usos: limiteUsos,
    },
  }
}

export function resultados(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function isoUtc(valor) {
  if (!valor) return null
  const achado = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor))
  return achado ? `${achado[1]}T${achado[2]}Z` : null
}

export function cupomDaLinha(linha) {
  return {
    id: Number(linha.id),
    codigo: linha.codigo,
    tipo: linha.tipo,
    valor: Number(linha.valor),
    valido_ate: isoUtc(linha.valido_ate),
    limite_usos: Number(linha.limite_usos),
    usos: Number(linha.usos || 0),
    reservas_ativas: Number(linha.reservas_ativas || 0),
    faturamento_centavos: Number(linha.faturamento_centavos || 0),
    ativo: Boolean(Number(linha.ativo)),
    vencido: Boolean(Number(linha.vencido)),
    esgotado: Boolean(Number(linha.esgotado)),
    criado_por: linha.criado_por,
    criado_em: isoUtc(linha.criado_em),
    desativado_por: linha.desativado_por || null,
    desativado_em: isoUtc(linha.desativado_em),
  }
}

// Instante exato (ms) em que o link de pagamento com cupom deixa de valer: 30
// minutos a partir de agora, ou o fim da validade do cupom, o que vier antes.
// Faltando menos de 2 minutos para o cupom vencer, devolve null e o checkout
// recusa o cupom: não sobra tempo de pagar, e o link passaria da validade.
export function vencimentoDoLinkComCupom(validoAteIso, agora = Date.now(), maximoMin = 30) {
  const limite = agora + maximoMin * 60000
  const fim = Date.parse(validoAteIso || '')
  if (!Number.isFinite(fim)) return limite
  if (fim - agora < 2 * 60000) return null
  return Math.min(limite, fim)
}
