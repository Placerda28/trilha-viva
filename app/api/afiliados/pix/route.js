import { mesmaOrigem } from '@/lib/origem'
import { conferirSenha } from '@/lib/senhas'
import { anotarTentativa, podeTentar } from '@/lib/clientes'
import { gravarRegistro } from '@/lib/gestao/registro'
import { limparCpf, validarCpf } from '@/lib/afiliados/cpf'
import { TIPOS_PIX, mascararChave, mascararCpf, validarChavePix } from '@/lib/afiliados/pix'
import { afiliadoLogado, erro, lerJson, resposta } from '@/lib/afiliados/rota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MSG_ABERTO = 'Você tem um saque em análise. Troque a chave depois que ele for pago ou recusado.'
const saqueAberto = (db, id) =>
  db.prepare("SELECT 1 AS x FROM afiliados_saques WHERE afiliado_id = ? AND status = 'solicitado'").bind(id).first()

export async function GET() {
  const { falha, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  try {
    const [p, aberto] = await Promise.all([
      db.prepare('SELECT * FROM afiliados_pix WHERE afiliado_id = ?').bind(afiliado.id).first(),
      saqueAberto(db, afiliado.id),
    ])
    const pix = p
      ? {
          tipo_chave: p.tipo_chave,
          chave_mascarada: mascararChave(p.tipo_chave, p.chave),
          titular_nome: p.titular_nome,
          titular_cpf_mascarado: mascararCpf(p.titular_cpf),
        }
      : null
    const motivo = aberto ? MSG_ABERTO : afiliado.status === 'suspenso' ? 'Sua conta de afiliado está suspensa.' : null
    return resposta({ ok: true, pix, bloqueado: Boolean(motivo), motivo })
  } catch (falhou) {
    console.error('afiliado pix', falhou?.message)
    return erro('Não foi possível carregar agora.', 503)
  }
}

export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  const { falha, cliente, afiliado, db } = await afiliadoLogado()
  if (falha) return falha
  if (afiliado.status === 'suspenso') return erro('Sua conta de afiliado está suspensa.', 403)
  const c = await lerJson(req)
  if (!c) return erro('Envie um formulário válido.', 400)

  const tipo = TIPOS_PIX.includes(c.tipo_chave) ? c.tipo_chave : null
  const chave = validarChavePix(tipo, c.chave)
  if (!chave.ok) return erro(chave.erro, 400, { campo: tipo ? 'chave' : 'tipo_chave' })
  const titular = typeof c.titular_nome === 'string' ? c.titular_nome.trim().slice(0, 80) : ''
  if (titular.length < 2) return erro('Informe o nome do titular.', 400, { campo: 'titular_nome' })
  if (typeof c.titular_cpf !== 'string' || !validarCpf(c.titular_cpf)) {
    return erro('Informe um CPF válido para o titular.', 400, { campo: 'titular_cpf' })
  }
  const cpfTitular = limparCpf(c.titular_cpf)

  try {
    const [dono, aberto] = await Promise.all([
      db.prepare('SELECT cpf FROM afiliados WHERE id = ?').bind(afiliado.id).first(),
      saqueAberto(db, afiliado.id),
    ])
    if (limparCpf(dono?.cpf) !== cpfTitular) {
      return erro('A chave Pix precisa ser do seu próprio CPF.', 400, { campo: 'titular_cpf' })
    }
    if (tipo === 'cpf' && chave.chave !== cpfTitular) {
      return erro('Chave Pix do tipo CPF precisa ser o seu próprio CPF.', 400, { campo: 'chave' })
    }
    if (aberto) return erro(MSG_ABERTO, 409)

    const conta = await db.prepare('SELECT supabase_id FROM clientes WHERE id = ?').bind(cliente.id).first()
    if (!conta?.supabase_id) {
      return erro(
        'Para trocar o Pix você precisa de uma senha na conta. Crie uma em "Esqueci a senha" na tela de entrada e volte aqui.',
        409,
        { codigo: 'sem_senha' },
      )
    }
    // Contador próprio ('pix:' + e-mail): errar a senha aqui não trava o login do acervo.
    const quem = `pix:${cliente.email}`
    const ip = req.headers.get('cf-connecting-ip') || ''
    if (!(await podeTentar(quem, ip))) {
      return erro('Muitas tentativas seguidas. Espere 15 minutos e tente de novo.', 429)
    }
    const senha = typeof c.senha === 'string' ? c.senha : ''
    const confere = senha ? await conferirSenha({ email: cliente.email, senha }) : { ok: false }
    if (!confere.ok) {
      await anotarTentativa({ email: quem, ip, sucesso: false })
      return erro(
        'Senha incorreta. Se você entra pelo Google e nunca criou senha, use "Esqueci a senha" para criar uma.',
        401,
        { campo: 'senha' },
      )
    }
    await anotarTentativa({ email: quem, ip, sucesso: true })

    // Grava só se continua sem saque aberto (corrida com um pedido de saque).
    const r = await db
      .prepare(
        `INSERT INTO afiliados_pix (afiliado_id, tipo_chave, chave, titular_nome, titular_cpf, atualizado_em)
         SELECT ?1, ?2, ?3, ?4, ?5, datetime('now')
          WHERE NOT EXISTS (SELECT 1 FROM afiliados_saques WHERE afiliado_id = ?1 AND status = 'solicitado')
         ON CONFLICT(afiliado_id) DO UPDATE SET tipo_chave = excluded.tipo_chave, chave = excluded.chave,
           titular_nome = excluded.titular_nome, titular_cpf = excluded.titular_cpf, atualizado_em = excluded.atualizado_em`,
      )
      .bind(afiliado.id, tipo, chave.chave, titular, cpfTitular)
      .run()
    if (r.meta.changes === 0) return erro(MSG_ABERTO, 409)

    await gravarRegistro(db, { quem: cliente.email, acao: 'afiliado_pix', alvo: afiliado.codigo, detalhe: { tipo_chave: tipo } })
    return resposta({
      ok: true,
      pix: {
        tipo_chave: tipo,
        chave_mascarada: mascararChave(tipo, chave.chave),
        titular_nome: titular,
        titular_cpf_mascarado: mascararCpf(cpfTitular),
      },
    })
  } catch (falhou) {
    console.error('afiliado pix', falhou?.message)
    return erro('Não foi possível salvar agora. Tente novamente em instantes.', 503)
  }
}
