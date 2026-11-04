// Ficha do afiliado na Gestão (leitura) e "revelar" CPF/Pix inteiros. Sem `@/`.
// Os números do mini-painel são os do afiliado (dadosDoPainel). CPF e Pix saem mascarados; só `revelar` mostra inteiro.
import { buscarVendas, dadosDoPainel, historicoMensal } from './painel.js'
import { limparCpf } from './cpf.js'
import { mascararChave, mascararCpf } from './pix.js'

function json(texto) {
  try {
    return texto ? JSON.parse(texto) : null
  } catch {
    return null
  }
}

function formatarCpf(valor) {
  const d = limparCpf(valor)
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d
}

// ISO UTC ('AAAA-MM-DDTHH:MM:SSZ') a partir do texto do D1.
const iso = (v) => (v ? `${String(v).replace(' ', 'T').slice(0, 19)}Z` : null)

// null se o afiliado não existe.
export async function fichaDoAfiliado(db, id, agora = new Date()) {
  const [[a], [pix], antigos] = await Promise.all([
    db
      .prepare(
        `SELECT a.id, a.codigo, a.status, a.nome, a.cpf, a.telefone, a.canal, a.avisar_cada_venda, a.termos_aceitos_em, a.criado_em,
                a.nivel_fixo_id, n.nome AS nivel_fixo_nome, c.email
           FROM afiliados a JOIN clientes c ON c.id = a.cliente_id LEFT JOIN afiliados_niveis n ON n.id = a.nivel_fixo_id
          WHERE a.id = ?`,
      )
      .bind(id)
      .all()
      .then((r) => r.results),
    db.prepare('SELECT tipo_chave, chave, titular_nome, titular_cpf, atualizado_em FROM afiliados_pix WHERE afiliado_id = ?').bind(id).all().then((r) => r.results),
    db
      .prepare('SELECT codigo, trocado_em, trocado_por FROM afiliados_codigos_antigos WHERE afiliado_id = ? ORDER BY trocado_em DESC LIMIT 20')
      .bind(id)
      .all(),
  ])
  if (!a) return null
  const codigos = [a.codigo, ...antigos.results.map((x) => x.codigo)]
  const marcas = codigos.map(() => '?').join(',')

  const [painel, historico, vendas, [saques, extrato, anotacoes, registro]] = await Promise.all([
    dadosDoPainel(db, id, agora),
    historicoMensal(db, id, 12, agora),
    buscarVendas(db, id, null, 30, agora),
    db.batch([
      db
        .prepare(
          `SELECT id, valor_centavos, status, pedido_em, pago_em, pago_por, nota, pix_snapshot, (comprovante_caminho IS NOT NULL) AS comprovante
             FROM afiliados_saques WHERE afiliado_id = ? ORDER BY id DESC LIMIT 20`,
        )
        .bind(id),
      db
        .prepare(
          `SELECT id, tipo, mes_referencia, valor_centavos, status, disponivel_em, compra_id, saque_id, descricao, criado_em
             FROM afiliados_lancamentos WHERE afiliado_id = ? ORDER BY id DESC LIMIT 100`,
        )
        .bind(id),
      db.prepare('SELECT id, texto, autor, criado_em FROM afiliados_anotacoes WHERE afiliado_id = ? ORDER BY id DESC LIMIT 50').bind(id),
      db
        .prepare(`SELECT id, criado_em, quem, acao, alvo, detalhe FROM registro WHERE alvo IN (${marcas}) ORDER BY id DESC LIMIT 50`)
        .bind(...codigos),
    ]),
  ])

  return {
    afiliado: {
      id: Number(a.id),
      codigo: a.codigo,
      codigos_antigos: antigos.results.map((x) => ({ codigo: x.codigo, trocado_em: iso(x.trocado_em), trocado_por: x.trocado_por })),
      status: a.status,
      nome: a.nome,
      email: a.email,
      cpf: mascararCpf(a.cpf),
      telefone: a.telefone || null,
      canal: a.canal || null,
      avisar_cada_venda: Boolean(a.avisar_cada_venda),
      termos_aceitos_em: iso(a.termos_aceitos_em),
      criado_em: iso(a.criado_em),
      nivel_travado: a.nivel_fixo_id ? { id: Number(a.nivel_fixo_id), nome: a.nivel_fixo_nome } : null,
      pix: pix
        ? {
            tipo_chave: pix.tipo_chave,
            chave: mascararChave(pix.tipo_chave, pix.chave),
            titular_nome: pix.titular_nome,
            titular_cpf: mascararCpf(pix.titular_cpf),
            atualizado_em: iso(pix.atualizado_em),
          }
        : null,
    },
    painel,
    historico_mensal: historico,
    vendas_recentes: vendas,
    saques: saques.results.map((s) => {
      const p = json(s.pix_snapshot)
      return {
        id: Number(s.id),
        valor_centavos: Number(s.valor_centavos),
        status: s.status,
        pedido_em: iso(s.pedido_em),
        pago_em: iso(s.pago_em),
        pago_por: s.pago_por || null,
        nota: s.nota || null,
        pix: p ? { tipo_chave: p.tipo_chave, chave: mascararChave(p.tipo_chave, p.chave) } : null,
        comprovante: Boolean(s.comprovante),
      }
    }),
    extrato: extrato.results.map((l) => ({
      id: Number(l.id),
      tipo: l.tipo,
      mes: l.mes_referencia,
      valor_centavos: Number(l.valor_centavos),
      status: l.status,
      disponivel_em: iso(l.disponivel_em),
      compra_id: l.compra_id == null ? null : Number(l.compra_id),
      saque_id: l.saque_id == null ? null : Number(l.saque_id),
      descricao: l.descricao || null,
      criado_em: iso(l.criado_em),
    })),
    anotacoes: anotacoes.results.map((n) => ({ id: Number(n.id), texto: n.texto, autor: n.autor, criado_em: iso(n.criado_em) })),
    historico_acoes: registro.results.map((r) => ({
      id: Number(r.id),
      quando: iso(r.criado_em),
      quem: r.quem,
      acao: r.acao,
      alvo: r.alvo,
      detalhe: json(r.detalhe),
    })),
  }
}

// Dado inteiro de um campo sensível. null se o afiliado (ou o Pix) não existe.
export async function dadoCompleto(db, id, campo) {
  const a = await db.prepare('SELECT id, codigo, cpf FROM afiliados WHERE id = ?').bind(id).first()
  if (!a) return null
  if (campo === 'cpf') return { afiliado: { id: Number(a.id), codigo: a.codigo }, cpf: formatarCpf(a.cpf) }
  const pix = await db.prepare('SELECT tipo_chave, chave, titular_nome, titular_cpf FROM afiliados_pix WHERE afiliado_id = ?').bind(id).first()
  if (!pix) return { afiliado: { id: Number(a.id), codigo: a.codigo }, pix: null }
  return {
    afiliado: { id: Number(a.id), codigo: a.codigo },
    pix: { tipo_chave: pix.tipo_chave, chave: pix.chave, titular_nome: pix.titular_nome, titular_cpf: formatarCpf(pix.titular_cpf) },
  }
}
