// Venda com código de afiliado: validação, comissão, avisos e reembolso.
// Sem `@/` (o robô importa lib/ por caminho relativo). O código só REGISTRA a venda:
// ninguém recebe desconto. Chamado de registrarCompraNoBanco e do webhook.
import { normalizarCodigoAfiliado, validarFormatoCodigo } from './codigo.js'
import { estornarVenda, gravarComissaoBase } from './comissao.js'
import { calcularNivel, niveisDoMes, nivelFixoDe } from './niveis.js'
import { contarVendasDoMes } from './status.js'

const reais = (c) => 'R$ ' + (c / 100).toFixed(2).replace('.', ',')
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')

// Telefone sem o 55 do país, como o site grava.
function telefoneLimpo(v) {
  const d = soDigitos(v)
  return (d.length === 12 || d.length === 13) && d.startsWith('55') ? d.slice(2) : d
}

const mesmoTelefone = (a, b) => {
  const x = telefoneLimpo(a)
  return x.length >= 10 && x === telefoneLimpo(b)
}

// Confere o código. Devolve { ok: true, afiliado: { id, codigo } } ou
// { ok: false, motivo: 'inexistente' | 'inativo' | 'proprio', afiliadoId }.
// "Próprio" = mesmo cliente, e-mail, CPF ou telefone do afiliado. Código inexistente não tem
// afiliado, então não gera evento (afiliados_eventos exige afiliado_id).
export async function avaliarCodigo(db, { codigo, clienteId, email, cpf, telefone }) {
  const cod = normalizarCodigoAfiliado(codigo)
  if (!validarFormatoCodigo(cod)) return { ok: false, motivo: 'inexistente' }
  const a = await db
    .prepare(
      `SELECT a.id, a.codigo, a.status, a.cliente_id, a.cpf, a.telefone, c.email
         FROM afiliados a JOIN clientes c ON c.id = a.cliente_id WHERE a.codigo = ? LIMIT 1`,
    )
    .bind(cod)
    .first()
  if (!a) return { ok: false, motivo: 'inexistente' }
  const id = Number(a.id)
  if (a.status !== 'ativo') return { ok: false, motivo: 'inativo', afiliadoId: id }
  const proprio =
    (clienteId && Number(a.cliente_id) === Number(clienteId)) ||
    (email && String(email).trim().toLowerCase() === String(a.email).trim().toLowerCase()) ||
    (cpf && soDigitos(cpf).length === 11 && soDigitos(cpf) === soDigitos(a.cpf)) ||
    mesmoTelefone(a.telefone, telefone)
  if (proprio) return { ok: false, motivo: 'proprio', afiliadoId: id }
  return { ok: true, afiliado: { id, codigo: a.codigo } }
}

export async function registrarEvento(db, afiliadoId, evento, compraId = null) {
  await db
    .prepare('INSERT INTO afiliados_eventos (afiliado_id, evento, compra_id) VALUES (?, ?, ?)')
    .bind(afiliadoId, evento, compraId)
    .run()
}

export const eventoDaRecusa = (motivo) =>
  motivo === 'proprio' ? 'codigo_recusado_proprio' : motivo === 'inativo' ? 'codigo_recusado_inativo' : null

// Chamada de registrarCompraNoBanco para a compra com afiliado e sem teste. Idempotente: só a
// chamada que cria a comissão (índice único por compra) grava evento, aviso e e-mails.
// Falha de aviso ou e-mail só gera log: nunca derruba o pagamento nem o acesso.
export async function concluirVendaAfiliado(db, { afiliadoId, compraId, aprovadoEm, emails = {} }) {
  const aprovada = Number.isNaN(Date.parse(aprovadoEm)) ? new Date() : new Date(aprovadoEm)
  const r = await gravarComissaoBase(db, { afiliadoId, compraId, aprovadoEm: aprovada })
  if (!r.criado) return r
  await registrarEvento(db, afiliadoId, 'pagamento_aprovado', compraId)
  try {
    await avisarVenda(db, { afiliadoId, compraId, mes: r.mes, emails })
  } catch (erro) {
    console.error('afiliado avisos da venda', compraId, erro?.message)
  }
  return r
}

async function avisarVenda(db, { afiliadoId, compraId, mes, emails }) {
  const a = await db
    .prepare(
      `SELECT a.nome, a.avisar_cada_venda, a.nivel_fixo_id, c.email FROM afiliados a
         JOIN clientes c ON c.id = a.cliente_id WHERE a.id = ? LIMIT 1`,
    )
    .bind(afiliadoId)
    .first()
  if (!a) return
  const fechado = await db
    .prepare('SELECT 1 AS ok FROM afiliados_fechamentos WHERE afiliado_id = ? AND mes_referencia = ? LIMIT 1')
    .bind(afiliadoId, mes)
    .first()
  const [niveis, vendas] = await Promise.all([niveisDoMes(db, mes), contarVendasDoMes(db, afiliadoId, mes)])
  // Subiu de nível quando a contagem do mês chegou ao limiar de um nível acima do menor.
  // Nível fixo e mês já fechado não têm subida. O aviso é único por afiliado, mês e nível.
  const subiu = !a.nivel_fixo_id && !fechado ? niveis.find((n, i) => i > 0 && n.vendas_minimas === vendas) : null
  if (subiu) {
    const c = calcularNivel(vendas, niveis, null)
    const titulo = `Você subiu para ${String(subiu.nome).toUpperCase()}!`
    const texto =
      `Com ${vendas} vendas em ${mes.slice(5)}/${mes.slice(0, 4)}, o nível ${subiu.nome} passou a valer: ` +
      `cada venda do mês agora vale ${reais(subiu.valor_por_venda_centavos)} e seu mês já vale ${reais(c.total)}.`
    const gravou = await db
      .prepare(
        `INSERT INTO afiliados_avisos (afiliado_id, tipo, titulo, texto)
         SELECT ?1, ?2, ?3, ?4
          WHERE NOT EXISTS (SELECT 1 FROM afiliados_avisos WHERE afiliado_id = ?1 AND tipo = ?2)`,
      )
      .bind(afiliadoId, `nivel:${mes}:${subiu.nome}`, titulo, texto)
      .run()
    if (gravou.meta.changes > 0) {
      await emails.subiuNivel?.({ para: a.email, nome: a.nome, titulo, texto }).catch((e) => console.error('afiliado e-mail nível', e?.message))
    }
  }
  if (a.avisar_cada_venda) {
    // Sem base nem bônus: "agora são N vendas, seu mês vale R$ Y" (meta de hoje). Mês já fechado: o valor da venda, já disponível.
    const dados = fechado
      ? {
          mesFechado: true,
          valorCentavos: Number(
            (await db.prepare("SELECT valor_centavos AS v FROM afiliados_lancamentos WHERE compra_id = ? AND tipo = 'venda'").bind(compraId).first())?.v || 0,
          ),
        }
      : { mesValeCentavos: calcularNivel(vendas, niveis, await nivelFixoDe(db, afiliadoId)).total }
    await emails.venda?.({ para: a.email, nome: a.nome, vendasMes: vendas, ...dados }).catch((e) => console.error('afiliado e-mail venda', e?.message))
  }
}

// Pedido de reembolso, mediação ou chargeback de uma compra JÁ gravada (compraId = mp_<id>).
// Tira o acesso (temCompra exige status 'pago') e estorna a comissão. Idempotente e seguro contra
// avisos fora de ordem: o status só muda se `atualizadoEm` (carimbo do pagamento) for mais novo
// que o gravado. O estorno roda sempre que a compra está revertida, então uma repetição conserta
// a metade que ficou para trás. Erros sobem: o webhook responde 500 e o Mercado Pago reenvia.
// Pagamento que nunca virou compra: ignora.
export async function reverterCompra(db, compraId, novoStatus, atualizadoEm = null) {
  await db
    .prepare(
      `UPDATE compras SET status = ?1, mp_status_em = ?2
        WHERE stripe_session_id = ?3 AND (mp_status_em IS NULL OR mp_status_em < ?2)`,
    )
    .bind(novoStatus, atualizadoEm, compraId)
    .run()
  const compra = await db
    .prepare(`SELECT id, status, afiliado_id FROM compras WHERE stripe_session_id = ? LIMIT 1`)
    .bind(compraId)
    .first()
  if (!compra) return { acao: 'ignorada' }
  if (!compra.afiliado_id || !['reembolsado', 'contestado', 'em_mediacao'].includes(compra.status)) {
    return { acao: 'revertida' }
  }
  const estorno = await estornarVenda(db, compra.id)
  const evento = compra.status === 'contestado' ? 'chargeback' : 'reembolso'
  await db
    .prepare(
      `INSERT INTO afiliados_eventos (afiliado_id, evento, compra_id)
       SELECT ?1, ?2, ?3 WHERE NOT EXISTS (SELECT 1 FROM afiliados_eventos WHERE compra_id = ?3 AND evento = ?2)`,
    )
    .bind(compra.afiliado_id, evento, compra.id)
    .run()
  return { acao: 'revertida', estorno }
}

// Aviso de pagamento aprovado repetido. Num único db.batch:
// 1) aprovação mais nova que a gravada (carimbo): status 'pago' (mediação a favor da loja volta o
//    acesso) e o carimbo avança, para um reembolso velho que chegar depois não valer;
// 2) a comissão CANCELADA de uma compra paga volta a pendente (mês aberto, sem estorno).
// O passo 2 não depende de o passo 1 ter mudado algo: se a restauração foi interrompida, a
// próxima repetição conserta. Estorno já gravado ou mês fechado: a comissão cancelada não volta.
// 3) estorno gravado (mediação/chargeback depois do fechamento) e compra de novo paga: lançamento
//    'ajuste' positivo, de mesmo valor, devolve o que o estorno tirou. Sem migração: o tipo 'ajuste'
//    já existe no CHECK e o INSERT condicional (NOT EXISTS pela descrição) trava a repetição.
//    O nível do mês fechado não muda (só entram lançamentos novos).
export async function restaurarCompra(db, compraId, atualizadoEm = null) {
  await db.batch([
    db
      .prepare(
        `UPDATE compras SET status = 'pago', mp_status_em = ?2
          WHERE stripe_session_id = ?1 AND (mp_status_em IS NULL OR mp_status_em < ?2)`,
      )
      .bind(compraId, atualizadoEm),
    db
      .prepare(
        `UPDATE afiliados_lancamentos AS l SET status = 'pendente', disponivel_em = '9999-12-31 23:59:59'
          WHERE l.tipo = 'venda' AND l.status = 'cancelada' AND l.saque_id IS NULL
            AND l.compra_id = (SELECT id FROM compras WHERE stripe_session_id = ?1 AND status = 'pago')
            AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos e WHERE e.compra_id = l.compra_id AND e.tipo = 'estorno')
            AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f WHERE f.afiliado_id = l.afiliado_id AND f.mes_referencia = l.mes_referencia)`,
      )
      .bind(compraId),
    db
      .prepare(
        `INSERT INTO afiliados_lancamentos
           (afiliado_id, compra_id, tipo, mes_referencia, valor_centavos, status, descricao)
         SELECT e.afiliado_id, e.compra_id, 'ajuste', e.mes_referencia, -e.valor_centavos, 'pendente',
                'Devolução: compra #' || e.compra_id || ' confirmada'
           FROM afiliados_lancamentos e
          WHERE e.tipo = 'estorno' AND e.valor_centavos < 0
            AND e.compra_id = (SELECT id FROM compras WHERE stripe_session_id = ?1 AND status = 'pago')
            AND NOT EXISTS (SELECT 1 FROM afiliados_lancamentos d
                             WHERE d.compra_id = e.compra_id AND d.tipo = 'ajuste'
                               AND d.descricao = 'Devolução: compra #' || e.compra_id || ' confirmada')`,
      )
      .bind(compraId),
  ])
}
