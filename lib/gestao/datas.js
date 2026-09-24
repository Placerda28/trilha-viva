const DIA_MS = 86400000
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function partesDia(valor) {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ''))
  if (!achado) return null
  const ano = Number(achado[1])
  const mes = Number(achado[2])
  const dia = Number(achado[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null
  }
  return { ano, mes, dia, data }
}

function diaIso(data) {
  return data.toISOString().slice(0, 10)
}

function somarDias(dia, quantidade) {
  const partes = partesDia(dia)
  if (!partes) return null
  return diaIso(new Date(partes.data.getTime() + quantidade * DIA_MS))
}

export function diaBrasiliaDeUtc(valor) {
  const texto = String(valor || '').trim().replace(' ', 'T')
  const data = new Date(texto.endsWith('Z') ? texto : `${texto}Z`)
  if (Number.isNaN(data.getTime())) return null
  return diaIso(new Date(data.getTime() - 3 * 3600000))
}

export function validarPeriodo(de, ate) {
  const inicio = partesDia(de)
  const fim = partesDia(ate)
  if (!inicio || !fim) {
    return { ok: false, erro: 'Informe datas reais no formato AAAA-MM-DD.' }
  }
  if (inicio.data > fim.data) {
    return { ok: false, erro: 'A data inicial não pode vir depois da data final.' }
  }

  const dias = Math.round((fim.data - inicio.data) / DIA_MS) + 1
  if (dias > 731) {
    return { ok: false, erro: 'O período pode ter no máximo 731 dias.' }
  }

  return {
    ok: true,
    de: diaIso(inicio.data),
    ate: diaIso(fim.data),
    dias,
    inicioUtc: `${diaIso(inicio.data)} 03:00:00`,
    fimUtc: `${somarDias(diaIso(fim.data), 1)} 03:00:00`,
  }
}

export function segundaDaSemana(dia) {
  const partes = partesDia(dia)
  if (!partes) return null
  const distancia = (partes.data.getUTCDay() + 6) % 7
  return somarDias(diaIso(partes.data), -distancia)
}

function chaveDaFaixa(dia, agrupar) {
  if (agrupar === 'semana') return segundaDaSemana(dia)
  if (agrupar === 'mes') return dia.slice(0, 7)
  return dia
}

function rotuloDaFaixa(chave, agrupar) {
  if (agrupar === 'mes') {
    const [ano, mes] = chave.split('-').map(Number)
    return `${MESES[mes - 1]}/${String(ano).slice(-2)}`
  }
  const [, mes, dia] = chave.split('-')
  const curto = `${dia}/${mes}`
  return agrupar === 'semana' ? `sem ${curto}` : curto
}

// Recebe a agregação diária do SQL e reagrupa/preenche as faixas sem vendas.
export function montarSerie({ de, ate, agrupar = 'dia', linhas = [] }) {
  const validado = validarPeriodo(de, ate)
  if (!validado.ok) return []

  const valores = new Map()
  for (const linha of linhas) {
    const chave = chaveDaFaixa(String(linha.chave || ''), agrupar)
    if (!chave) continue
    const atual = valores.get(chave) || { compras: 0, centavos: 0 }
    atual.compras += Number(linha.compras || 0)
    atual.centavos += Number(linha.centavos || 0)
    valores.set(chave, atual)
  }

  const chaves = []
  const vistas = new Set()
  for (let i = 0; i < validado.dias; i++) {
    const chave = chaveDaFaixa(somarDias(validado.de, i), agrupar)
    if (!vistas.has(chave)) {
      vistas.add(chave)
      chaves.push(chave)
    }
  }

  return chaves.map((chave) => {
    const valor = valores.get(chave) || { compras: 0, centavos: 0 }
    return {
      chave,
      rotulo: rotuloDaFaixa(chave, agrupar),
      compras: valor.compras,
      centavos: valor.centavos,
    }
  })
}
