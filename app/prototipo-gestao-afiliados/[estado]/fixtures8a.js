// PROTÓTIPO TEMPORÁRIO (Fase 8A de afiliados, frontend): respostas falsas no
// formato do contrato de docs/architecture.md (Dashboard, Financeiro, Alertas).
// Nomes, códigos e valores são inventados. Apagar junto com a pasta do protótipo.

// Os estados do protótipo da 8A (a página de servidor lê esta lista).
export const ESTADOS_8A = ['dashboard', 'dashboard-vazio', 'financeiro', 'alertas', 'alertas-vazio']

const MESES = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']

function dias(de, n) {
  const base = new Date(de + 'T12:00:00Z')
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 86400000)
    const iso = d.toISOString().slice(0, 10)
    const diretas = [3, 5, 2, 4, 6, 1, 3, 7, 2, 5][(i * 7) % 10]
    const afiliados = [2, 0, 4, 3, 1, 5, 2, 0, 6, 3][(i * 3) % 10]
    return { dia: iso, rotulo: iso.slice(8, 10) + '/' + iso.slice(5, 7), diretas, afiliados }
  })
}

export function dashboard(vazio = false) {
  const vendas = dias('2026-10-06', 30)
  const afil = vendas.reduce((t, d) => t + d.afiliados, 0)
  const dir = vendas.reduce((t, d) => t + d.diretas, 0)
  return {
    ok: true,
    periodo: { de: '2026-10-06', ate: '2026-11-04', dias: 30, anterior: { de: '2026-09-06', ate: '2026-10-05' } },
    gerado_em: '2026-11-04T18:00:00Z',
    frase: vazio
      ? 'De 06/10 a 04/11, nenhuma venda veio de afiliados (12 vendas no total).'
      : 'De 06/10 a 04/11, os afiliados trouxeram ' + afil + ' vendas (' + String(Math.round((afil / (afil + dir)) * 1000) / 10).replace('.', ',') + '% das vendas). Entraram R$ 6.841,20 líquidos e as comissões custaram R$ 2.190,00, então o programa deixou R$ 4.651,20 de lucro. Cada venda custou R$ 27,00 em comissão. Em relação ao período anterior, as vendas por afiliados subiram 18,4%. Atenção: 3 vendas antigas não têm a taxa do Mercado Pago e foram contadas pelo valor cheio.',
    compensa: {
      receita_liquida_afiliados_centavos: vazio ? 0 : 684120,
      vendas_com_valor_estimado: vazio ? 0 : 3,
      custo_programa: { total_centavos: vazio ? 0 : 219000, base_centavos: vazio ? 0 : 162000, bonus_centavos: vazio ? 0 : 54000, ajustes_centavos: vazio ? 0 : 6000, estornos_centavos: vazio ? 0 : -3000 },
      lucro_afiliados_centavos: vazio ? 0 : 465120,
      vendas_afiliados: vazio ? 0 : afil,
      vendas_diretas: dir,
      vendas_total: vazio ? dir : afil + dir,
      pct_vendas_afiliados: vazio ? null : Math.round((afil / (afil + dir)) * 1000) / 10,
      cpa_centavos: vazio ? null : 2700,
      lucro_por_venda: vazio
        ? { afiliado_centavos: null, direta_centavos: null, por_nivel: [] }
        : {
            afiliado_centavos: 5742, direta_centavos: 8120,
            por_nivel: [
              { nivel: 'Bronze', vendas: 31, receita_liquida_centavos: 280000, custo_centavos: 46500, lucro_centavos: 233500, lucro_por_venda_centavos: 7532 },
              { nivel: 'Prata', vendas: 33, receita_liquida_centavos: 298000, custo_centavos: 66000, lucro_centavos: 232000, lucro_por_venda_centavos: 7030 },
              { nivel: 'Ouro', vendas: 17, receita_liquida_centavos: 106120, custo_centavos: 49500, lucro_centavos: 56620, lucro_por_venda_centavos: 3331 },
            ],
          },
      comparacao: vazio
        ? { vendas_afiliados: { atual: 0, anterior: 0, pct: 0 }, vendas_total: { atual: dir, anterior: 90, pct: -5.2 }, receita_liquida: { atual: 0, anterior: 0, pct: 0 }, custo: { atual: 0, anterior: 0, pct: 0 }, lucro: { atual: 0, anterior: 0, pct: 0 }, cpa: { atual: null, anterior: null, pct: null }, pct_vendas_afiliados: { atual: null, anterior: null, pct: null } }
        : {
            vendas_afiliados: { atual: afil, anterior: 69, pct: 18.4 },
            vendas_total: { atual: afil + dir, anterior: 148, pct: 6.1 },
            receita_liquida: { atual: 684120, anterior: 571000, pct: 19.8 },
            custo: { atual: 219000, anterior: 168000, pct: 30.4 },
            lucro: { atual: 465120, anterior: 403000, pct: 15.4 },
            cpa: { atual: 2700, anterior: 2434, pct: 10.9 },
            pct_vendas_afiliados: { atual: 52.2, anterior: 46.6, pct: 12 },
          },
    },
    afiliados: {
      cadastrados: 64, ativos: 41, pendentes: 4, suspensos: 2, novos: 9, venderam: 27, inativos_30d: 11,
      por_nivel_mes_atual: { mes: '2026-11', niveis: { Bronze: 14, Prata: 9, Ouro: 4 }, ativos_sem_vendas: 14 },
      perto_de_subir: 6,
    },
    dinheiro: {
      disponivel_centavos: 128400, liberando_centavos: 96300,
      bonus_previsto: { total_centavos: 54000, partes: [{ mes: '2026-10', valor_centavos: 41000, fecha_em: '2026-11-05' }, { mes: '2026-11', valor_centavos: 13000, fecha_em: '2026-12-05' }] },
      previsao_15_dias: { libera_centavos: 61000, bonus_centavos: 41000, total_centavos: 102000 },
      saques_pendentes: { quantidade: 3, valor_centavos: 58500 },
      pago_no_periodo: { quantidade: 8, valor_centavos: 143000 },
      pago_desde_o_inicio: { quantidade: 31, valor_centavos: 512000 },
    },
    series: {
      vendas_por_dia: vendas,
      receita_custo_mensal: MESES.map((mes, i) => {
        const receita = vazio ? 0 : [0, 0, 12000, 38000, 61000, 84000, 120000, 190000, 310000, 571000, 684120, 90000][i]
        const custo = vazio ? 0 : [0, 0, 3000, 9000, 14000, 20000, 34000, 59000, 110000, 168000, 219000, 31000][i]
        return { mes, vendas: Math.round(receita / 8000), receita_liquida_centavos: receita, custo_centavos: custo, lucro_centavos: receita - custo }
      }),
      funil: { cliques: vazio ? 0 : 4210, checkouts: vazio ? 0 : 236, vendas: vazio ? 0 : afil, estornos: { reembolsos: vazio ? 0 : 3, chargebacks: vazio ? 0 : 1, total: vazio ? 0 : 4 }, taxa_clique_checkout: vazio ? null : 5.6, taxa_checkout_venda: vazio ? null : Math.round((afil / 236) * 1000) / 10 },
      top_afiliados: vazio ? [] : [
        { afiliado_id: 7, nome: 'Pedro Henrique Alves', codigo: 'PEDRO88', vendas: 19, receita_liquida_centavos: 171000 },
        { afiliado_id: 3, nome: 'Maria Oliveira Lima', codigo: 'MARIA10', vendas: 14, receita_liquida_centavos: 126000 },
        { afiliado_id: 12, nome: 'João da Silva Santos', codigo: 'JOAO27', vendas: 12, receita_liquida_centavos: 108000 },
        { afiliado_id: 9, nome: 'Ana Paula Ferreira', codigo: 'ANAP21', vendas: 9, receita_liquida_centavos: 80900 },
        { afiliado_id: 21, nome: 'Lucas Martins', codigo: 'LUCAS5', vendas: 7, receita_liquida_centavos: 63000 },
        { afiliado_id: 15, nome: 'Carla Nunes', codigo: 'CARLA77', vendas: 6, receita_liquida_centavos: 54000 },
        { afiliado_id: 30, nome: 'Rafael Gomes', codigo: 'RAFA33', vendas: 4, receita_liquida_centavos: 36000 },
        { afiliado_id: 31, nome: 'Bruna Teixeira', codigo: 'BRUNAT', vendas: 3, receita_liquida_centavos: 27000 },
        { afiliado_id: 34, nome: 'Tiago Rocha', codigo: 'TIAGO9', vendas: 2, receita_liquida_centavos: 18000 },
        { afiliado_id: 40, nome: 'Sofia Andrade', codigo: 'SOFIA4', vendas: 1, receita_liquida_centavos: 9000 },
      ],
      distribuicao_niveis: {
        niveis: ['Bronze', 'Prata', 'Ouro'],
        meses: MESES.map((mes, i) => ({ mes, contagens: vazio ? { Bronze: 0, Prata: 0, Ouro: 0 } : { Bronze: [0, 0, 1, 2, 4, 6, 8, 9, 11, 13, 14, 6][i], Prata: [0, 0, 0, 1, 1, 2, 3, 5, 7, 8, 9, 3][i], Ouro: [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 4, 1][i] } })),
      },
      novos_afiliados_por_mes: MESES.map((mes, i) => ({ mes, novos: vazio ? 0 : [0, 0, 2, 3, 5, 6, 8, 11, 14, 17, 9, 2][i] })),
      origem: {
        forma_pagamento: {
          afiliados: vazio ? { pix: 0, cartao: 0, outro: 0, sem_info: 0 } : { pix: 52, cartao: 24, outro: 3, sem_info: 2 },
          todas: { pix: 88, cartao: 61, outro: 6, sem_info: 5 },
        },
        codigo_digitado_vs_link: null,
      },
    },
  }
}

const TIPOS = ['venda', 'venda', 'venda', 'bonus_nivel', 'ajuste', 'estorno']
const NOMES = [['Pedro Henrique Alves', 'PEDRO88', 7], ['Maria Oliveira Lima', 'MARIA10', 3], ['João da Silva Santos', 'JOAO27', 12], ['Ana Paula Ferreira', 'ANAP21', 9]]

export function financeiro(tipo, afiliado, pagina) {
  const todos = Array.from({ length: 87 }, (_, i) => {
    const t = TIPOS[i % TIPOS.length]
    const [nome, codigo, id] = NOMES[i % NOMES.length]
    const valor = t === 'venda' ? 1500 : t === 'bonus_nivel' ? 6000 : t === 'ajuste' ? (i % 2 ? 2500 : -1000) : -1500
    return {
      id: 900 - i, quando: new Date(Date.UTC(2026, 10, 4, 15, 0) - i * 3.1 * 3600000).toISOString().replace('.000Z', 'Z'),
      afiliado: { id, nome, codigo }, tipo: t, mes_referencia: i < 30 ? '2026-11' : '2026-10', valor_centavos: valor,
      status: t === 'estorno' ? 'cancelada' : i < 20 ? 'pendente' : i < 50 ? 'paga' : 'em_saque',
      compra_id: t === 'venda' || t === 'estorno' ? 4300 - i : null, saque_id: i % 9 === 0 && t === 'venda' ? 11 : null,
      descricao: t === 'ajuste' ? 'Ajuste: ' + (valor > 0 ? 'bônus de campanha de Natal' : 'correção de lançamento duplicado') : t === 'bonus_nivel' ? 'Bônus de nível Prata' : null,
    }
  }).filter((i) => (!tipo || i.tipo === tipo) && (!afiliado || i.afiliado.id === Number(afiliado)))
  const por = 50
  const meses = ['2026-09', '2026-10', '2026-11'].map((mes, i) => {
    const liquido = [571000, 684120, 90000][i]
    const base = [101000, 162000, 20000][i]
    const bonus = [60000, 54000, 0][i]
    const ajustes = [0, 6000, 2500][i]
    const estornos = [-4500, -3000, 0][i]
    const custo = base + bonus + ajustes + estornos
    return { mes, vendas: [69, 82, 11][i], bruto: liquido + [26000, 31000, 4100][i], taxas: [26000, 31000, 4100][i], liquido, estimadas: i === 0 ? 3 : 0, comissoes_base: base, bonus, ajustes, estornos, custo, lucro: liquido - custo }
  })
  const soma = (k) => meses.reduce((t, m) => t + m[k], 0)
  const totais = Object.fromEntries(['vendas', 'bruto', 'taxas', 'liquido', 'estimadas', 'comissoes_base', 'bonus', 'ajustes', 'estornos', 'custo', 'lucro'].map((k) => [k, soma(k)]))
  return {
    ok: true, de: '2026-09-06', ate: '2026-11-04',
    extrato: { pagina, por_pagina: por, total_itens: todos.length, soma_centavos: todos.reduce((t, i) => t + i.valor_centavos, 0), itens: todos.slice((pagina - 1) * por, pagina * por) },
    resumo_mensal: { meses, totais },
  }
}

const TEXTOS = [
  ['alta', 'fechamento_pendente:2026-10', 'O fechamento de outubro de 2026 ainda não rodou e já passou do dia de fechamento. 18 afiliados esperam o bônus.', '/gestao/afiliados/metas?mes=2026-10', null],
  ['alta', 'taxa_estorno:7:2026-11', 'Pedro Henrique Alves (PEDRO88) tem 28% de vendas canceladas ou estornadas nos últimos 90 dias (5 de 18 vendas).', '/gestao/afiliados/lista?afiliado=7', 7],
  ['alta', 'pico_vendas:12:2026-11-03', 'João da Silva Santos (JOAO27) fez 6 vendas em 1 hora no dia 03/11.', '/gestao/afiliados/lista?afiliado=12', 12],
  ['alta', 'duplicado:pix:9-31', 'Duas contas (Ana Paula Ferreira e Bruna Teixeira) usam a mesma chave Pix.', '/gestao/afiliados/lista?afiliado=9', 9],
  ['media', 'saque_atrasado:11', 'O saque de Pedro Henrique Alves (R$ 315,00) espera pagamento há 5 dias.', '/gestao/afiliados/saques', 7],
  ['media', 'codigo_proprio:3:2026-11', 'Maria Oliveira Lima (MARIA10) tentou usar o próprio código na compra.', '/gestao/afiliados/lista?afiliado=3', 3],
  ['media', 'fim_mes:15:2026-10', 'Carla Nunes (CARLA77) subiu para Prata com 4 de 11 vendas nos 2 últimos dias de outubro. Sem elas, ficaria em Bronze.', '/gestao/afiliados/lista?afiliado=15', 15],
  ['media', 'cliques_sem_venda:30:2026-11', 'Rafael Gomes (RAFA33) teve 212 cliques em 30 dias e nenhuma venda.', '/gestao/afiliados/lista?afiliado=30', 30],
  ['baixa', 'ativo_sem_venda:34:2026-11', 'Tiago Rocha (TIAGO9) está ativo e não vende há mais de 30 dias.', '/gestao/afiliados/lista?afiliado=34', 34],
  ['baixa', 'ativo_sem_venda:40:2026-11', 'Sofia Andrade (SOFIA4) está ativa e não vende há mais de 30 dias.', '/gestao/afiliados/lista?afiliado=40', 40],
]

export function alertas(resolvidos, vazio) {
  const lista = vazio ? [] : TEXTOS.filter((t) => !resolvidos.has(t[1])).map(([gravidade, chave, texto, link, afiliado_id]) => ({ chave, tipo: chave.split(':')[0], gravidade, texto, link, afiliado_id }))
  const por = (g) => lista.filter((a) => a.gravidade === g).length
  return { ok: true, gerado_em: '2026-11-04T18:00:00Z', total: lista.length, por_gravidade: { alta: por('alta'), media: por('media'), baixa: por('baixa') }, alertas: lista }
}

// Troca o fetch do navegador por um que responde as rotas da 8A com os dados
// falsos. `modo`: 'dashboard' | 'financeiro' | 'alertas' | 'alertas-vazio'.
export function instalarFetchFalso(modo) {
  if (typeof window === 'undefined' || window.__fetchFalso8a) return
  window.__fetchFalso8a = true
  const original = window.fetch.bind(window)
  const resolvidos = new Set()
  const resp = (corpo, status = 200, extra = {}) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...extra } })
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  window.fetch = async (entrada, opcoes = {}) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, window.location.origin)
    const p = url.pathname
    if (!p.startsWith('/api/gestao/')) return original(entrada, opcoes)
    await espera(180)
    if (p === '/api/gestao/afiliados/dashboard') return resp(dashboard(modo === 'dashboard-vazio'))
    if (p === '/api/gestao/afiliados/financeiro') return resp(financeiro(url.searchParams.get('tipo'), url.searchParams.get('afiliado'), Number(url.searchParams.get('pagina')) || 1))
    if (p === '/api/gestao/afiliados/financeiro/csv') return new Response('Mes;Vendas\r\n', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="afiliados-teste.csv"' } })
    if (p === '/api/gestao/afiliados/alertas') return resp(alertas(resolvidos, modo === 'alertas-vazio'))
    const m = /^\/api\/gestao\/afiliados\/alertas\/(.+)\/resolver$/.exec(p)
    if (m && opcoes.method === 'POST') {
      const chave = decodeURIComponent(m[1])
      if (!resolvidos.has(chave)) { resolvidos.add(chave); return resp({ ok: true }) }
      return resp({ ok: false, erro: 'Alerta não encontrado ou já resolvido.' }, 404)
    }
    return resp({ ok: false }, 404)
  }
}
