// Números PÚBLICOS da página /afiliados (simulador e escada de metas).
// Roda só no servidor, no build: a página é estática e entrega ao navegador uma
// tabela pronta (0 a 100 vendas), então o navegador só mostra, não calcula
// dinheiro. Sem `@/` para o teste importar direto.
import { calcularNivel } from './afiliados/niveis.js'

// ATENÇÃO: a fonte da verdade dos níveis e das regras é o BANCO (afiliados_niveis
// e afiliados_config, migrations/0018). Esta constante só ESPELHA o que o seed
// grava, para a página continuar estática e leve (sem ler o D1). Se o dono mudar
// a tabela na Gestão, atualize aqui e na data do sitemap. Um teste confere que a
// escada daqui bate com o seed.
export const NIVEIS_PUBLICOS = [
  { nome: 'Bronze', vendas_minimas: 1, valor_por_venda_centavos: 1500, cor: '#b45309' },
  { nome: 'Prata', vendas_minimas: 20, valor_por_venda_centavos: 2000, cor: '#94a3b8' },
  { nome: 'Ouro', vendas_minimas: 50, valor_por_venda_centavos: 3000, cor: '#eab308' },
]

// Espelho de afiliados_config (carencia_dias, dia_fechamento, intervalo_saque_dias).
export const REGRAS_PUBLICAS = { carenciaDias: 7, diaFechamento: 8, intervaloSaqueDias: 15 }

export const MAX_VENDAS_SIMULADOR = 100

const ordenar = (niveis) => [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)

// Uma simulação. `grau` = posição do nível (0 = ainda sem nível), para o selo.
export function simular(vendas, niveis = NIVEIS_PUBLICOS) {
  const lista = ordenar(niveis)
  const n = Math.min(MAX_VENDAS_SIMULADOR, Math.max(0, Math.floor(Number(vendas) || 0)))
  const c = calcularNivel(n, lista)
  const grau = c.nivel ? lista.findIndex((x) => x.nome === c.nivel.nome) + 1 : 0
  return {
    vendas: n,
    grau,
    nivel: c.nivel ? c.nivel.nome : null,
    base: c.base,
    bonus: c.bonus,
    total: c.total,
    faltam: c.faltam,
    proximo: c.proximo ? c.proximo.nome : null,
    valorProximo: c.proximo ? c.proximo.valor_por_venda_centavos : 0,
  }
}

// Tabela de 0 a MAX_VENDAS_SIMULADOR, em tuplas curtas para não pesar no HTML:
// [grau, base, bonus, total, faltam] (dinheiro em centavos). O índice é o nº de vendas.
export function tabelaDoSimulador(niveis = NIVEIS_PUBLICOS) {
  return Array.from({ length: MAX_VENDAS_SIMULADOR + 1 }, (_, n) => {
    const s = simular(n, niveis)
    return [s.grau, s.base, s.bonus, s.total, s.faltam]
  })
}

// Os saltos de cada meta: a venda que falta e quanto o mês passa a render.
export function saltos(niveis = NIVEIS_PUBLICOS) {
  return ordenar(niveis)
    .slice(1)
    .map((n) => {
      const antes = simular(n.vendas_minimas - 1, niveis)
      const depois = simular(n.vendas_minimas, niveis)
      return {
        nivel: n.nome,
        de: antes.vendas,
        para: depois.vendas,
        deTotal: antes.total,
        paraTotal: depois.total,
        diferenca: depois.total - antes.total,
      }
    })
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// "R$ 1.500,00" (sempre com centavos; o espaço é comum para quebrar linha).
export function moeda(centavos) {
  return BRL.format((Number(centavos) || 0) / 100).replace(/\s/g, ' ')
}

// "R$ 30" para os valores por venda, que são inteiros.
export function moedaCurta(centavos) {
  return moeda(centavos).replace(/,00$/, '')
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
