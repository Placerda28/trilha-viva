import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { papelPeloToken } from './lib/gestao/sessao.js'

function destinoInterno(url) {
  const destino = url.clone()
  if (destino.pathname === '/api/gestao' || destino.pathname.startsWith('/api/gestao/')) {
    destino.pathname = `/api/interno/gestao${destino.pathname.slice('/api/gestao'.length)}`
  } else {
    destino.pathname = `/interno/gestao${destino.pathname.slice('/gestao'.length)}`
  }
  return destino
}

// Os endereços internos (para onde o rewrite leva o admin) também passam por
// aqui. Quem não é admin e tenta abri-los direto recebe a página 404 comum do
// site: sem isso, um pedido de navegação interna do Next (cabeçalho RSC)
// voltava com status 200 e um aviso de "não encontrada" dentro, o que deixava
// perceber que o endereço existe.
function ehInterno(pathname) {
  return (
    pathname === '/interno' ||
    pathname.startsWith('/interno/') ||
    pathname === '/api/interno' ||
    pathname.startsWith('/api/interno/')
  )
}

// Endereço que não existe no site: reescrever para ele entrega o 404 padrão.
function paginaInexistente(req) {
  const destino = req.nextUrl.clone()
  destino.pathname = '/nao-encontrado'
  destino.search = ''
  return NextResponse.rewrite(destino)
}

function recusar(req) {
  return ehInterno(req.nextUrl.pathname) ? paginaInexistente(req) : NextResponse.next()
}

export async function middleware(req) {
  try {
    const token = req.cookies.get('tv_sessao')?.value
    if (!token) return recusar(req)

    // No Worker do OpenNext o contexto já está no escopo global. O modo
    // assíncrono também funciona no next dev e devolve o mesmo contexto.
    const contexto = await getCloudflareContext({ async: true })
    const adminMaster = process.env.ADMIN_MASTER || contexto.env.ADMIN_MASTER || ''
    const papel = await papelPeloToken(contexto.env.DB, token, adminMaster)
    if (!papel) return recusar(req)

    const resposta = ehInterno(req.nextUrl.pathname)
      ? NextResponse.next()
      : NextResponse.rewrite(destinoInterno(req.nextUrl))
    resposta.headers.set('Cache-Control', 'no-store, max-age=0')
    resposta.headers.set('X-Robots-Tag', 'noindex')
    return resposta
  } catch {
    // Fail-closed: qualquer falha deixa o Next tratar o endereço público como
    // inexistente, sem acrescentar cabeçalhos que o diferenciem do 404 normal.
    return recusar(req)
  }
}

export const config = {
  matcher: [
    '/gestao',
    '/gestao/:path*',
    '/api/gestao',
    '/api/gestao/:path*',
    '/interno',
    '/interno/:path*',
    '/api/interno',
    '/api/interno/:path*',
  ],
}
