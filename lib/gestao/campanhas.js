import { origensDeLinhas, prepararOrigensPeriodo } from './periodo.js'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function percentual(parte, total) {
  return total ? Math.round((parte / total) * 10000) / 100 : 0
}

// Carrinho sem nenhum rastro (UTM, IP, fbp) é de antes de 12/10/2026, quando a
// origem ainda não era gravada; igual ao que Vendas faz com a compra.
const REGISTRADO_CARRINHO = `CASE WHEN utm_source IS NULL AND utm_campaign IS NULL
  AND ip IS NULL AND fbp IS NULL THEN 0 ELSE 1 END`

const CARRINHOS = `COUNT(DISTINCT email) AS carrinhos,
  COUNT(DISTINCT CASE WHEN pago_em IS NOT NULL THEN email END) AS pagos`

const chaveCampanha = (registrado, fonte, campanha) => JSON.stringify([registrado ? 1 : 0, fonte || '', campanha || ''])

// Junta vendas, carrinhos e leads numa linha por fonte › campanha, com os
// anúncios dentro. Pessoas (e-mails) são contadas em SQL no nível da campanha e
// no do anúncio, para o total da campanha não somar a mesma pessoa duas vezes.
export function montarCampanhas({ vendas = [], carrinhosCampanha = [], carrinhosAnuncio = [], leads = [], totalCarrinhos = {}, totalVendas = null }) {
  const mapa = new Map()
  const linha = (registrado, fonte, campanha) => {
    const chave = chaveCampanha(registrado, fonte, campanha)
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        fonte: fonte || null,
        campanha: campanha || null,
        registrado,
        leads: 0,
        carrinhos: 0,
        carrinhos_pagos: 0,
        vendas: 0,
        centavos: 0,
        anuncios: new Map(),
      })
    }
    return mapa.get(chave)
  }
  const anuncio = (l, nome) => {
    const chave = nome || ''
    if (!l.anuncios.has(chave)) {
      l.anuncios.set(chave, { anuncio: nome || null, carrinhos: 0, vendas: 0, centavos: 0 })
    }
    return l.anuncios.get(chave)
  }

  for (const v of vendas) {
    const l = linha(v.registrado, v.fonte, v.campanha)
    l.vendas += v.compras
    l.centavos += v.centavos
    const a = anuncio(l, v.anuncio)
    a.vendas += v.compras
    a.centavos += v.centavos
  }
  for (const c of carrinhosCampanha) {
    const l = linha(Boolean(Number(c.registrado)), c.utm_source, c.utm_campaign)
    l.carrinhos = Number(c.carrinhos || 0)
    l.carrinhos_pagos = Number(c.pagos || 0)
  }
  for (const c of carrinhosAnuncio) {
    const l = linha(Boolean(Number(c.registrado)), c.utm_source, c.utm_campaign)
    anuncio(l, c.utm_content).carrinhos = Number(c.carrinhos || 0)
  }
  for (const x of leads) {
    // Lead só existe depois do rastreio, então sempre é "registrado".
    linha(true, x.origem, x.campanha).leads += Number(x.leads || 0)
  }

  const lista = [...mapa.values()]
    .map((l) => ({
      ...l,
      conversao: percentual(l.carrinhos_pagos, l.carrinhos),
      anuncios: [...l.anuncios.values()].sort((a, b) => b.vendas - a.vendas || b.carrinhos - a.carrinhos),
    }))
    .sort((a, b) => b.vendas - a.vendas || b.carrinhos - a.carrinhos || b.leads - a.leads)

  const soma = (campo) => lista.reduce((t, l) => t + l[campo], 0)
  const carrinhos = Number(totalCarrinhos.carrinhos || 0)
  const pagos = Number(totalCarrinhos.pagos || 0)
  return {
    linhas: lista,
    total: {
      leads: soma('leads'),
      carrinhos,
      carrinhos_pagos: pagos,
      // Total exato vem do SQL: a lista de vendas é cortada em 50 grupos.
      vendas: totalVendas ? Number(totalVendas.vendas || 0) : soma('vendas'),
      centavos: totalVendas ? Number(totalVendas.centavos || 0) : soma('centavos'),
      conversao: percentual(pagos, carrinhos),
    },
  }
}

export async function consultarCampanhas(db, periodo) {
  const { inicioUtc, fimUtc } = periodo
  const noPeriodo = 'WHERE criado_em >= ? AND criado_em < ?'
  const [vendas, porCampanha, porAnuncio, total, leads, totalVendas] = await db.batch([
    prepararOrigensPeriodo(db, periodo),
    db.prepare(`
      SELECT utm_source, utm_campaign, ${REGISTRADO_CARRINHO} AS registrado, ${CARRINHOS}
        FROM carrinhos_reais ${noPeriodo}
       GROUP BY utm_source, utm_campaign, registrado
       LIMIT 100`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT utm_source, utm_campaign, utm_content, ${REGISTRADO_CARRINHO} AS registrado, ${CARRINHOS}
        FROM carrinhos_reais ${noPeriodo}
       GROUP BY utm_source, utm_campaign, utm_content, registrado
       LIMIT 200`).bind(inicioUtc, fimUtc),
    db.prepare(`SELECT ${CARRINHOS} FROM carrinhos_reais ${noPeriodo} LIMIT 1`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT origem, campanha, COUNT(*) AS leads
        FROM leads ${noPeriodo}
       GROUP BY origem, campanha
       LIMIT 100`).bind(inicioUtc, fimUtc),
    db.prepare(`
      SELECT COUNT(*) AS vendas, COALESCE(SUM(valor_centavos), 0) AS centavos
        FROM compras_reais WHERE status = 'pago' AND ${noPeriodo.slice(6)} LIMIT 1`).bind(inicioUtc, fimUtc),
  ])
  return montarCampanhas({
    vendas: origensDeLinhas(vendas),
    carrinhosCampanha: linhas(porCampanha),
    carrinhosAnuncio: linhas(porAnuncio),
    leads: linhas(leads),
    totalCarrinhos: linhas(total)[0],
    totalVendas: linhas(totalVendas)[0],
  })
}
