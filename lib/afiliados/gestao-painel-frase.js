// Frase automática do Dashboard, em português simples, montada no servidor.
import { diaMes, reais } from './gestao-periodo.js'

function comparacao(c) {
  if (!c || c.pct == null) {
    return c && c.anterior === 0 && c.atual > 0 ? ' No período anterior não houve vendas por afiliados.' : ''
  }
  if (c.pct === 0) return ' Em relação ao período anterior, as vendas por afiliados ficaram iguais.'
  const verbo = c.pct > 0 ? 'subiram' : 'caíram'
  return ` Em relação ao período anterior, as vendas por afiliados ${verbo} ${String(Math.abs(c.pct)).replace('.', ',')}%.`
}

export function fraseDoPeriodo({ de, ate, vendasAfil, vendasTotal, pctAfil, liquido, custo, lucro, cpa, estimadas, comparaVendas }) {
  const inicio = `De ${diaMes(de)} a ${diaMes(ate)}`
  if (vendasAfil === 0) {
    const total = vendasTotal === 1 ? 'houve 1 venda no total' : `houve ${vendasTotal} vendas no total`
    return `${inicio}, nenhuma venda veio de afiliados (${total}).${comparacao(comparaVendas)}`
  }
  const vendas = vendasAfil === 1 ? '1 venda' : `${vendasAfil} vendas`
  const resultado = lucro >= 0 ? `o programa deixou ${reais(lucro)} de lucro` : `o programa deu prejuízo de ${reais(-lucro)}`
  let t = `${inicio}, os afiliados trouxeram ${vendas} (${String(pctAfil).replace('.', ',')}% das vendas). `
  t += `Entraram ${reais(liquido)} líquidos e as comissões custaram ${reais(custo)}, então ${resultado}.`
  if (cpa != null) t += ` Cada venda custou ${reais(cpa)} em comissão.`
  t += comparacao(comparaVendas)
  if (estimadas > 0) {
    t += ` Atenção: ${estimadas} ${estimadas === 1 ? 'venda antiga não tem' : 'vendas antigas não têm'} a taxa do Mercado Pago e ${estimadas === 1 ? 'foi contada' : 'foram contadas'} pelo valor cheio.`
  }
  return t
}
