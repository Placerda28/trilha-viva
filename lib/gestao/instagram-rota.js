import { NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'

// Cola comum das rotas do Instagram: tudo soAdmin e no-store; os POSTs conferem
// a origem (404 se vier de outro site), leem o JSON e gravam no registro.

export const responder = (corpo, status = 200) =>
  NextResponse.json(corpo, { status, headers: cabecalhosPrivados })

export const semBanco = () => responder({ ok: false, erro: 'Banco indisponível no momento.' }, 503)

export const emailDe = (admin) => String(admin?.cliente?.email || '').trim().toLowerCase()

// Variáveis do Instagram: segredo/variável do site; process.env cobre o desenvolvimento local.
export function ambienteInstagram() {
  const env = getEnv()
  const pegar = (nome) => env[nome] || process.env[nome]
  return {
    IG_TOKEN: pegar('IG_TOKEN'),
    IG_PAGE_ID: pegar('IG_PAGE_ID'),
    IG_GRAPH_VERSION: pegar('IG_GRAPH_VERSION'),
  }
}

export function rotaGet(handler) {
  return soAdmin(async (req, admin) => {
    const db = getDB()
    return db ? handler(req, db, admin) : semBanco()
  })
}

// `acao(db, corpo, quem, admin)` devolve { ok, status?, erro?, registro?: { acao, alvo }, ...resto }.
// O registro só é gravado quando deu certo; o resto vai na resposta.
export function rotaPost(acao, protecao = soAdmin) {
  return protecao(async (req, admin) => {
    if (!mesmaOrigem(req)) return naoEncontrado()
    const corpo = await req.json().catch(() => ({}))
    const db = getDB()
    if (!db) return semBanco()
    const quem = emailDe(admin)
    const r = await acao(db, corpo, quem)
    if (!r.ok) return responder({ ok: false, erro: r.erro }, r.status || 400)
    const { ok, registro, ...resto } = r
    if (registro) await gravarRegistro(db, { quem, ...registro })
    return responder({ ok, ...resto })
  })
}

