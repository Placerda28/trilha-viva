// Ações da Gestão sobre um afiliado. Sem `@/`. Cada ação devolve { ok: true, ..., registro } ou { ok: false, status, erro, campo? };
// quem chama grava o `registro` e manda o e-mail (aprovar). Mudanças de estado são UPDATE condicional (repetir não repete o efeito).
import { consultarCodigo } from './conta.js'
import { saldosDoAfiliado } from './status.js'
import { mesDe, somarDias, textoUtc } from './datas.js'

// Dinheiro, nível e sanção ficam com o Administrador Master. Aprovar cadastro e anotar são do dia a dia da equipe.
export const SO_MASTER = ['suspender', 'reativar', 'travar_nivel', 'trocar_codigo', 'ajuste']
export const ACOES_DO_AFILIADO = ['aprovar', 'anotar', ...SO_MASTER]

const AJUSTE_MAXIMO = 10_000_000 // R$ 100.000,00
const falha = (status, erro, campo) => ({ ok: false, status, erro, ...(campo ? { campo } : {}) })
const texto = (v, min, max) => {
  const t = typeof v === 'string' ? v.trim() : ''
  return t.length >= min && t.length <= max ? t : null
}

async function afiliadoPorId(db, id) {
  return db
    .prepare(
      `SELECT a.id, a.codigo, a.nome, a.status, a.nivel_fixo_id, c.email FROM afiliados a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ?`,
    )
    .bind(id)
    .first()
}

// Troca de status só se o estado de partida for o esperado. Devolve true se ESTA chamada mudou.
async function mudarStatus(db, id, de, para) {
  const marcas = de.map(() => '?').join(',')
  const r = await db
    .prepare(`UPDATE afiliados SET status = ? WHERE id = ? AND status IN (${marcas}) RETURNING id`)
    .bind(para, id, ...de)
    .all()
  return r.results.length > 0
}

const acoes = {
  async aprovar(db, a) {
    if (!(await mudarStatus(db, a.id, ['pendente'], 'ativo'))) return falha(409, 'Este afiliado não está aguardando aprovação.')
    return {
      ok: true,
      registro: { acao: 'afiliado_aprovado', alvo: a.codigo },
      email: { para: a.email, nome: a.nome, codigo: a.codigo },
    }
  },

  async suspender(db, a, c) {
    const motivo = texto(c.motivo, 3, 500)
    if (!motivo) return falha(400, 'Escreva o motivo da suspensão (de 3 a 500 letras).', 'motivo')
    if (!(await mudarStatus(db, a.id, ['ativo', 'pendente'], 'suspenso'))) return falha(409, 'Este afiliado já está suspenso.')
    return { ok: true, registro: { acao: 'afiliado_suspenso', alvo: a.codigo, detalhe: { motivo: motivo.slice(0, 300) } } }
  },

  async reativar(db, a) {
    if (!(await mudarStatus(db, a.id, ['suspenso'], 'ativo'))) return falha(409, 'Este afiliado não está suspenso.')
    return { ok: true, registro: { acao: 'afiliado_reativado', alvo: a.codigo } }
  },

  async travar_nivel(db, a, c, { agora }) {
    if (!Object.hasOwn(c, 'nivel_id')) return falha(400, 'Informe nivel_id (um nível ou null para destravar).', 'nivel_id')
    let nivel = null
    if (c.nivel_id !== null) {
      // Só níveis da tabela vigente: nível de tabela futura ou antiga não pode ser travado.
      nivel = Number.isSafeInteger(c.nivel_id)
        ? await db
            .prepare(
              `SELECT id, nome FROM afiliados_niveis WHERE id = ?1
                 AND valido_desde_mes = (SELECT MAX(valido_desde_mes) FROM afiliados_niveis WHERE valido_desde_mes <= ?2)`,
            )
            .bind(c.nivel_id, mesDe(agora))
            .first()
        : null
      if (!nivel) return falha(400, 'Escolha um nível da tabela vigente.', 'nivel_id')
    }
    const de = a.nivel_fixo_id ? await db.prepare('SELECT nome FROM afiliados_niveis WHERE id = ?').bind(a.nivel_fixo_id).first() : null
    await db.prepare('UPDATE afiliados SET nivel_fixo_id = ? WHERE id = ?').bind(nivel ? nivel.id : null, a.id).run()
    return {
      ok: true,
      nivel_travado: nivel ? { id: Number(nivel.id), nome: nivel.nome } : null,
      registro: { acao: 'afiliado_nivel_travado', alvo: a.codigo, detalhe: { de: de?.nome || null, para: nivel?.nome || null } },
    }
  },

  async trocar_codigo(db, a, c, { agora, quem, siteUrl }) {
    const cod = await consultarCodigo(db, typeof c.codigo === 'string' ? c.codigo.slice(0, 40) : '')
    if (cod.codigo === a.codigo) return falha(400, 'Este já é o código do afiliado.', 'codigo')
    if (!cod.disponivel) return falha(/em uso/.test(cod.motivo) ? 409 : 400, cod.motivo, 'codigo')
    try {
      // UPDATE primeiro; o código antigo só é reservado se a troca valeu (conferido no próprio INSERT).
      await db.batch([
        db.prepare('UPDATE afiliados SET codigo = ?3 WHERE id = ?1 AND codigo = ?2').bind(a.id, a.codigo, cod.codigo),
        db
          .prepare(
            `INSERT INTO afiliados_codigos_antigos (codigo, afiliado_id, trocado_em, trocado_por)
             SELECT ?2, ?1, ?4, ?5 WHERE EXISTS (SELECT 1 FROM afiliados WHERE id = ?1 AND codigo = ?3)`,
          )
          .bind(a.id, a.codigo, cod.codigo, textoUtc(agora), quem),
      ])
    } catch (e) {
      if (/unique/i.test(String(e?.message))) return falha(409, 'Este código já está em uso. Escolha outro.', 'codigo')
      throw e
    }
    const depois = await afiliadoPorId(db, a.id)
    if (depois.codigo !== cod.codigo) return falha(409, 'O código mudou durante a troca. Tente de novo.', 'codigo')
    const cliques = await db
      .prepare('SELECT COUNT(*) AS n FROM afiliados_cliques WHERE afiliado_id = ? AND criado_em >= ?')
      .bind(a.id, textoUtc(somarDias(agora, -30)))
      .first()
    const site = String(siteUrl || 'https://trilhaviva.org').replace(/\/+$/, '')
    return {
      ok: true,
      codigo: cod.codigo,
      codigo_antigo: a.codigo,
      link_novo: `${site}/?ref=${cod.codigo}`,
      cliques_30d_com_o_codigo_antigo: Number(cliques?.n || 0),
      aviso:
        `Os links já divulgados com ${a.codigo} deixam de registrar cliques e vendas. O código ${a.codigo} fica reservado e ninguém mais pode usá-lo. ` +
        `As vendas já feitas continuam do afiliado. Avise o afiliado para trocar o link divulgado por ${site}/?ref=${cod.codigo}.`,
      registro: { acao: 'afiliado_codigo_trocado', alvo: cod.codigo, detalhe: { de: a.codigo, para: cod.codigo } },
    }
  },

  async ajuste(db, a, c, { agora }) {
    const valor = c.valor_centavos
    if (!Number.isSafeInteger(valor) || valor === 0 || Math.abs(valor) > AJUSTE_MAXIMO) {
      return falha(400, 'Informe o valor em centavos, diferente de zero (até R$ 100.000,00, positivo ou negativo).', 'valor_centavos')
    }
    const motivo = texto(c.motivo, 3, 300)
    if (!motivo) return falha(400, 'Escreva o motivo do ajuste (de 3 a 300 letras).', 'motivo')
    const t = textoUtc(agora)
    // Duplo clique: o mesmo ajuste (valor e motivo) não entra de novo em 60 segundos.
    const r = await db
      .prepare(
        `INSERT INTO afiliados_lancamentos (afiliado_id, tipo, mes_referencia, valor_centavos, status, disponivel_em, descricao, criado_em)
         SELECT ?1, 'ajuste', ?2, ?3, 'pendente', ?4, ?5, ?4
          WHERE NOT EXISTS (SELECT 1 FROM afiliados_lancamentos WHERE afiliado_id = ?1 AND tipo = 'ajuste' AND valor_centavos = ?3
                              AND descricao = ?5 AND criado_em >= ?6)
         RETURNING id`,
      )
      .bind(a.id, mesDe(agora), valor, t, `Ajuste: ${motivo}`, textoUtc(new Date(agora.getTime() - 60000)))
      .all()
    if (r.results.length === 0) return falha(409, 'Este mesmo ajuste acabou de ser lançado. Confira o extrato antes de repetir.')
    const saldos = await saldosDoAfiliado(db, a.id, agora)
    return {
      ok: true,
      lancamento_id: Number(r.results[0].id),
      disponivel_centavos: saldos.disponivel,
      registro: { acao: 'afiliado_ajuste', alvo: a.codigo, detalhe: { valor_centavos: valor, motivo: motivo.slice(0, 200) } },
    }
  },

  async anotar(db, a, c, { quem, agora }) {
    const nota = texto(c.texto, 1, 1000)
    if (!nota) return falha(400, 'Escreva a anotação (até 1.000 letras).', 'texto')
    const r = await db
      .prepare('INSERT INTO afiliados_anotacoes (afiliado_id, texto, autor, criado_em) VALUES (?, ?, ?, ?) RETURNING id')
      .bind(a.id, nota, quem, textoUtc(agora))
      .all()
    return {
      ok: true,
      anotacao: { id: Number(r.results[0].id), texto: nota, autor: quem },
      registro: { acao: 'afiliado_anotacao', alvo: a.codigo, detalhe: { anotacao_id: Number(r.results[0].id) } },
    }
  },
}

// ctx: { quem (e-mail), papel ('master' | 'membro'), agora, siteUrl }
export async function executarAcao(db, id, acao, corpo, ctx) {
  if (!ACOES_DO_AFILIADO.includes(acao)) return falha(400, 'Ação desconhecida.', 'acao')
  if (SO_MASTER.includes(acao) && ctx.papel !== 'master') {
    return falha(403, 'Só o Administrador Master pode fazer esta ação.')
  }
  const a = await afiliadoPorId(db, id)
  if (!a) return falha(404, 'Afiliado não encontrado.')
  const r = await acoes[acao](db, { ...a, id: Number(a.id) }, corpo, { agora: new Date(), ...ctx })
  if (!r.ok) return r
  const depois = await afiliadoPorId(db, id)
  return {
    ...r,
    afiliado: { id: Number(depois.id), codigo: depois.codigo, status: depois.status, nivel_travado_id: depois.nivel_fixo_id ?? null },
  }
}
