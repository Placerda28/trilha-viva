import { NextResponse } from 'next/server'
import { getDB } from '@/lib/d1'
import { clienteAtual } from '@/lib/sessao'
import { mesmaOrigem } from '@/lib/origem'
import { limparTelefone, origemDoCarrinho, telefoneValido } from '@/lib/carrinhos'
import { enviarEventoMeta, ipDoPedido, lerCookiesMeta, lerOrigemVisita } from '@/lib/meta'
import { ehContatoTeste, enviarMetaSeReal } from '@/lib/teste'
import { site } from '@/lib/site'
import { gravarRegistro } from '@/lib/gestao/registro'
import { enviarBoasVindasAfiliado } from '@/lib/email'
import { validarCpf, limparCpf } from '@/lib/afiliados/cpf'
import { afiliadoDoCliente, consultarCodigo } from '@/lib/afiliados/conta'
import { configuracao, niveisDoMes } from '@/lib/afiliados/niveis'
import { mesDe } from '@/lib/afiliados/datas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const semCache = { 'Cache-Control': 'no-store, max-age=0' }
const erro = (msg, status, campo) =>
  NextResponse.json({ ok: false, erro: msg, ...(campo ? { campo } : {}) }, { status, headers: semCache })

export async function POST(req) {
  if (!mesmaOrigem(req)) return erro('Pedido recusado.', 403)
  const cliente = await clienteAtual()
  if (!cliente) return erro('Entre na sua conta.', 401)
  if (cliente.bloqueado) return erro('Pedido recusado.', 403)
  let c
  try {
    c = await req.json()
  } catch {
    return erro('Envie um formulário válido.', 400)
  }
  if (!c || typeof c !== 'object' || Array.isArray(c)) return erro('Envie um formulário válido.', 400)

  const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 80) : ''
  const canal = typeof c.canal === 'string' ? c.canal.trim().slice(0, 200) : ''
  if (nome.length < 2) return erro('Informe seu nome.', 400, 'nome')
  if (typeof c.cpf !== 'string' || !validarCpf(c.cpf)) return erro('Informe um CPF válido.', 400, 'cpf')
  if (typeof c.telefone !== 'string' || !telefoneValido(c.telefone)) {
    return erro('Informe seu telefone com DDD.', 400, 'telefone')
  }
  if (c.aceite !== true) return erro('Aceite os termos do programa para continuar.', 400, 'aceite')

  const db = getDB()
  if (!db) return erro('Indisponível no momento. Tente novamente mais tarde.', 503)
  try {
    const config = await configuracao(db)
    if (!config) return erro('Indisponível no momento. Tente novamente mais tarde.', 503)
    if (!config.programa_aberto) return erro('Cadastros encerrados no momento.', 403)
    if (await afiliadoDoCliente(db, cliente.id)) return erro('Você já tem um cadastro de afiliado.', 409)

    const cod = await consultarCodigo(db, typeof c.codigo === 'string' ? c.codigo.slice(0, 40) : '')
    if (!cod.disponivel) {
      return erro(cod.motivo, /em uso/.test(cod.motivo) ? 409 : 400, 'codigo')
    }
    const status = config.aprovacao_automatica ? 'ativo' : 'pendente'
    // Origem guardada pelo componente Origem (cookie tv_origem): quem chegou
    // pelo anúncio em /afiliados e se cadastrou depois. Só diagnóstico.
    const origem = origemDoCarrinho({ utm: lerOrigemVisita(req)?.ultimo }) || null
    try {
      await db
        .prepare(
          `INSERT INTO afiliados (cliente_id, codigo, status, nome, cpf, telefone, canal, avisar_cada_venda, origem, termos_aceitos_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        )
        .bind(cliente.id, cod.codigo, status, nome, limparCpf(c.cpf), limparTelefone(c.telefone), canal || null,
          c.avisar_cada_venda === true ? 1 : 0, origem)
        .run()
    } catch (falha) {
      // Corrida entre dois cadastros: o banco decide quem ficou com a vaga.
      const msg = String(falha?.message || '')
      if (/afiliados\.cliente_id/.test(msg)) return erro('Você já tem um cadastro de afiliado.', 409)
      if (/afiliados\.codigo/.test(msg)) return erro('Este código já está em uso. Escolha outro.', 409, 'codigo')
      throw falha
    }
    await gravarRegistro(db, { quem: cliente.email, acao: 'afiliado_cadastro', alvo: cod.codigo, detalhe: { status, origem } })
    try {
      const niveis = await niveisDoMes(db, mesDe(new Date()))
      await enviarBoasVindasAfiliado({ para: cliente.email, nome, codigo: cod.codigo, status, niveis })
    } catch (falha) {
      console.error('afiliado boas-vindas', falha?.message)
    }
    // CompleteRegistration para a Meta, pelo servidor, com o mesmo event_id do
    // Pixel (a Meta junta os dois). Contato de teste não vai à Meta.
    const teste = await ehContatoTeste(db, { email: cliente.email, telefone: c.telefone })
    const eventoId = (typeof c.eventoId === 'string' ? c.eventoId.slice(0, 64) : '') || crypto.randomUUID()
    await enviarMetaSeReal(teste, {
      nome: 'CompleteRegistration',
      id: eventoId,
      email: cliente.email,
      telefone: limparTelefone(c.telefone),
      nomeCliente: nome,
      ...lerCookiesMeta(req),
      ip: ipDoPedido(req),
      ua: (req.headers.get('user-agent') || '').slice(0, 400),
      url: `${site.url.replace(/\/+$/, '')}/minha-conta/afiliado`,
    }, enviarEventoMeta)
    const link = `${site.url.replace(/\/+$/, '')}/?ref=${cod.codigo}`
    return NextResponse.json({ ok: true, codigo: cod.codigo, link, status, pixel: !teste }, { headers: semCache })
  } catch (falha) {
    console.error('afiliado cadastro', falha?.message)
    return erro('Não foi possível cadastrar agora. Tente novamente mais tarde.', 503)
  }
}
