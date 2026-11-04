// Nível de cada afiliado por mês, calculado em memória a partir de linhas já agrupadas no SQL
// (nenhuma consulta por afiliado). Usa a mesma regra pura de status.js/fechamento.js.
import { calcularNivel } from './niveis.js'
import { mesSeguinte } from './datas.js'

// Conjunto de níveis em vigor no mês: o de maior valido_desde_mes <= mês. Guardado por lista de níveis e mês
// (milhares de linhas pedem o mesmo mês; quem chama não altera o resultado).
const memo = new WeakMap()
export function niveisVigentes(todos, mes) {
  let porMes = memo.get(todos)
  if (!porMes) memo.set(todos, (porMes = new Map()))
  if (!porMes.has(mes)) {
    let vigente = ''
    for (const n of todos) if (n.valido_desde_mes <= mes && n.valido_desde_mes > vigente) vigente = n.valido_desde_mes
    porMes.set(mes, todos.filter((n) => n.valido_desde_mes === vigente).sort((a, b) => a.vendas_minimas - b.vendas_minimas))
  }
  return porMes.get(mes)
}

export const fixoDaLinha = (r) =>
  r.fixo_valor == null ? null : { nome: r.fixo_nome, valor_por_venda_centavos: Number(r.fixo_valor) }

// Nível (nome e valor por venda) das vendas de um afiliado num mês. Mês fechado vale o snapshot.
export function nivelDoGrupo(g, todos) {
  const niveis = niveisVigentes(todos, g.mes)
  const piso = niveis[0] ? { nome: niveis[0].nome, valor: niveis[0].valor_por_venda_centavos } : { nome: 'Sem nível', valor: 0 }
  if (g.fechado) return g.fech_nome ? { nome: g.fech_nome, valor: Number(g.fech_valor) } : piso
  const c = calcularNivel(Number(g.validas), niveis, fixoDaLinha(g))
  return c.nivel ? { nome: c.nivel.nome, valor: c.nivel.valor_por_venda_centavos } : piso
}

// Linhas (afiliado, mês) ainda sem fechamento -> bônus previsto por mês, quantos em cada nível no
// mês atual e quantos estão a 3 vendas ou menos de subir.
export function resumoAbertos(rows, todos, mesAtual, diaFechamento) {
  const porNivel = {}
  const bonusPorMes = {}
  let ativosComVenda = 0
  let pertoDeSubir = 0
  for (const r of rows) {
    if (r.fechado) continue
    const c = calcularNivel(Number(r.validas), niveisVigentes(todos, r.mes), fixoDaLinha(r))
    if (c.bonus > 0) bonusPorMes[r.mes] = (bonusPorMes[r.mes] || 0) + c.bonus
    if (r.mes !== mesAtual) continue
    if (c.nivel) porNivel[c.nivel.nome] = (porNivel[c.nivel.nome] || 0) + 1
    if (r.status === 'ativo') {
      ativosComVenda += 1
      if (c.nivel && c.proximo && c.faltam <= 3) pertoDeSubir += 1
    }
  }
  const dia = String(diaFechamento).padStart(2, '0')
  const partes = Object.keys(bonusPorMes)
    .sort()
    .map((mes) => ({ mes, valor_centavos: bonusPorMes[mes], fecha_em: `${mesSeguinte(mes)}-${dia}` }))
  return { porNivel, ativosComVenda, pertoDeSubir, partes }
}
