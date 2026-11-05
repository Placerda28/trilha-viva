// PROTÓTIPO TEMPORÁRIO (Fase 8B de afiliados, frontend): a API falsa responde
// no lugar de /api/gestao/afiliados e guarda as mudanças na memória da página.
// Apagar junto com a pasta do protótipo.
import { NIVEIS, fichaDe, todosOsAfiliados } from './dados'

const ok = (dados, status = 200) => Promise.resolve({ ok: status < 400, status, dados: { ok: status < 400, ...dados } })
const erro = (status, texto, campo) => ok({ erro: texto, campo }, status)
const SO_MASTER = 'Só o Administrador Master pode fazer esta ação.'

const COLUNA = {
  nome: 'nome', codigo: 'codigo', status: 'status', nivel: 'vendas_mes', vendas: 'vendas_mes', faltam: 'faltam', cliques: 'cliques_30d', conversao: 'conversao_pct',
  receita: 'receita_centavos', comissao: 'comissao_prevista_centavos', estornos: 'estornos', disponivel: 'disponivel_centavos', pago: 'total_pago_centavos',
  ultima_venda: 'ultima_venda', criado_em: 'criado_em',
}
const collator = new Intl.Collator('pt-BR')

function listar(todos, consulta) {
  const p = new URLSearchParams(consulta)
  const q = (p.get('q') || '').toLowerCase()
  const doBusca = todos.filter((a) => !q || [a.nome, a.codigo, a.email].some((t) => t.toLowerCase().includes(q)))
  const contagem = { pendente: 0, ativo: 0, suspenso: 0 }
  doBusca.forEach((a) => (contagem[a.status] += 1))
  let l = doBusca.filter((a) => {
    if (p.get('status') && a.status !== p.get('status')) return false
    if (p.get('nivel') === 'sem' ? a.nivel : p.get('nivel') && String(a.nivel?.id) !== p.get('nivel')) return false
    if (p.get('vendeu') === 'sim' && !a.vendas_mes) return false
    if (p.get('vendeu') === 'nao' && a.vendas_mes) return false
    if (p.get('saldo') && !a.disponivel_centavos) return false
    if (p.get('saque') && !a.saque_pendente) return false
    if (p.get('perto') && !(a.proximo && a.faltam >= 1 && a.faltam <= 3)) return false
    return true
  })
  const ordem = p.get('ordem') in COLUNA ? p.get('ordem') : 'vendas'
  const dir = p.get('dir') || (ordem === 'nome' || ordem === 'codigo' ? 'asc' : 'desc')
  const chave = COLUNA[ordem]
  const sinal = dir === 'asc' ? 1 : -1
  l = [...l].sort((a, b) => {
    if (a[chave] == null) return 1
    if (b[chave] == null) return -1
    return sinal * (typeof a[chave] === 'string' ? collator.compare(a[chave], b[chave]) : a[chave] - b[chave])
  })
  const pagina = Number(p.get('pagina')) || 1
  return { mes: '2026-11', pagina, por_pagina: 25, total: l.length, ordem, dir, truncado: false, contagem_status: contagem, niveis: NIVEIS, itens: l.slice((pagina - 1) * 25, pagina * 25) }
}

const fechamento = (mes, status, extra = {}) => ({
  mes, liberado: true, status, faltam: status === 'rodado' ? 0 : status === 'parcial' ? 3 : 14, rodou_em: status === 'rodado' ? `${mes === '2026-08' ? '2026-09' : mes === '2026-07' ? '2026-08' : mes === '2026-06' ? '2026-07' : '2026-06'}-08T11:10:00Z` : null,
  afiliados: 14, por_nivel: [{ nivel: 'Bronze', afiliados: 9 }, { nivel: 'Prata', afiliados: 4 }, { nivel: 'Ouro', afiliados: 1 }],
  total_base_centavos: 612000, total_bonus_centavos: 84000, total_mes_centavos: 696000, ...extra,
})

export function criarApi({ master = true } = {}) {
  const todos = todosOsAfiliados()
  const notas = {}
  const config = { carencia_dias: 15, dia_fechamento: 8, intervalo_saque_dias: 15, saque_minimo_centavos: 5000, aprovacao_automatica: false, programa_aberto: true, atualizado_em: '2026-10-02T14:00:00Z', atualizado_por: 'paulo@trilhaviva.org', aviso: 'Mudanças não alteram meses já fechados.' }
  const metas = {
    mes: '2026-11',
    vigente: { valido_desde_mes: '2026-01', criado_por: null, criado_em: null, niveis: NIVEIS, situacao: 'vigente' },
    proximas: [], historico: [{ valido_desde_mes: '2026-01', criado_por: null, criado_em: null, niveis: NIVEIS, situacao: 'vigente' }],
    fechamentos: [fechamento('2026-10', 'pendente'), fechamento('2026-09', 'parcial'), fechamento('2026-08', 'rodado'), fechamento('2026-07', 'rodado'), fechamento('2026-06', 'rodado', { afiliados: 0, total_base_centavos: 0, total_bonus_centavos: 0, total_mes_centavos: 0, por_nivel: [] }), fechamento('2026-05', 'rodado', { afiliados: 0, total_base_centavos: 0, total_bonus_centavos: 0, total_mes_centavos: 0, por_nivel: [] })],
    projecao: {
      mes: '2026-11', dia: 4, dias_no_mes: 30, afiliados_com_venda: 6, vendas_ate_agora: 18, custo_ate_agora_centavos: 27000, vendas_projetadas: 135, custo_projetado_centavos: 238500,
      base_projetada_centavos: 202500, bonus_projetado_centavos: 36000,
      explicacao: 'Cada afiliado projeta as vendas de até hoje divididas pelo dia do mês (4) e multiplicadas pelos dias do mês (30). Cada projeção passa pela tabela de hoje e o custo é a soma da comissão base com o bônus. No começo do mês o número oscila muito, e o bônus só é pago no fechamento.',
    },
  }

  return {
    lista: (consulta) => ok(listar(todos, consulta)),
    ficha: (id) => {
      const a = todos.find((x) => x.id === Number(id))
      if (!a) return erro(404, 'Afiliado não encontrado.')
      const f = fichaDe(a, config)
      f.anotacoes = [...(notas[a.id] || []), ...f.anotacoes]
      if (a.codigo_novo) f.afiliado.codigos_antigos.unshift({ codigo: a.codigo_novo, trocado_em: '2026-11-04T18:00:00Z', trocado_por: 'paulo@trilhaviva.org' })
      return ok(f)
    },
    revelar: (id, campo) => {
      const a = todos.find((x) => x.id === Number(id))
      return ok(campo === 'cpf' ? { campo, cpf: '123.456.789-09' } : { campo, pix: { tipo_chave: 'email', chave: a.email, titular_nome: a.nome, titular_cpf: '123.456.789-09' } })
    },
    acao: (id, acao, c) => {
      const a = todos.find((x) => x.id === Number(id))
      if (!a) return erro(404, 'Afiliado não encontrado.')
      if (['suspender', 'reativar', 'travar_nivel', 'trocar_codigo', 'ajuste'].includes(acao) && !master) return erro(403, SO_MASTER)
      const base = () => ({ afiliado: { id: a.id, codigo: a.codigo, status: a.status } })
      if (acao === 'aprovar') return a.status !== 'pendente' ? erro(409, 'Esse cadastro não está pendente.') : (a.status = 'ativo', ok({ ...base(), email_enviado: true }))
      if (acao === 'suspender') return (a.status = 'suspenso', ok(base()))
      if (acao === 'reativar') return (a.status = 'ativo', ok(base()))
      if (acao === 'travar_nivel') {
        const n = NIVEIS.find((x) => x.id === c.nivel_id) || null
        a.nivel_travado = Boolean(n)
        return ok({ ...base(), nivel_travado: n && { id: n.id, nome: n.nome } })
      }
      if (acao === 'trocar_codigo') {
        if (c.codigo === 'JOAO27') return erro(409, 'Esse código já está em uso.', 'codigo')
        const antigo = a.codigo
        a.codigo_novo = antigo
        a.codigo = c.codigo
        return ok({ ...base(), codigo: c.codigo, codigo_antigo: antigo, link_novo: `https://trilhaviva.org/?ref=${c.codigo}`, cliques_30d_com_o_codigo_antigo: a.cliques_30d, aviso: `Os links já divulgados com o código ${antigo} deixam de registrar cliques e vendas, e o cookie de quem já clicou também. Mande o link novo para o afiliado.` })
      }
      if (acao === 'ajuste') {
        a.disponivel_centavos += c.valor_centavos
        return ok({ ...base(), lancamento_id: 99, disponivel_centavos: a.disponivel_centavos })
      }
      notas[a.id] = [{ id: 50 + (notas[a.id]?.length || 0), texto: c.texto, autor: 'paulo@trilhaviva.org', criado_em: '2026-11-05T13:00:00Z' }, ...(notas[a.id] || [])]
      return ok({ ...base(), anotacao: notas[a.id][0] })
    },
    metas: () => ok(metas),
    salvarMetas: (niveis) => {
      if (!master) return erro(403, SO_MASTER)
      const conjunto = { valido_desde_mes: '2026-12', criado_por: 'paulo@trilhaviva.org', criado_em: '2026-11-05T13:00:00Z', niveis: niveis.map((n, i) => ({ id: 100 + i, cor: '#8a8a8a', ...n, valor_por_venda_centavos: n.valor_por_venda_centavos })), situacao: 'futura' }
      metas.proximas = [conjunto]
      metas.historico = [conjunto, ...metas.historico.filter((h) => h.valido_desde_mes !== '2026-12')]
      return ok({ valido_desde_mes: '2026-12', niveis: conjunto.niveis, aviso: 'A nova tabela vale a partir de dezembro de 2026. O mês em andamento e os meses fechados não mudam.' })
    },
    fechar: (mes) => {
      if (!master) return erro(403, SO_MASTER)
      const i = metas.fechamentos.findIndex((f) => f.mes === mes)
      metas.fechamentos[i] = fechamento(mes, 'rodado', { rodou_em: '2026-11-05T13:00:00Z' })
      return ok({ fechados: 14, pendentes: [], restam: false, relatorio: metas.fechamentos[i] })
    },
    config: () => ok(config),
    salvarConfig: (campos) => {
      if (!master) return erro(403, SO_MASTER)
      const mudou = Object.fromEntries(Object.entries(campos).filter(([k, v]) => config[k] !== v).map(([k, v]) => [k, [config[k], v]]))
      Object.assign(config, campos, { atualizado_em: '2026-11-05T13:00:00Z' })
      return ok({ alterado: Object.keys(mudou).length > 0, mudou, ...config })
    },
  }
}
