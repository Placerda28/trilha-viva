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

export async function middleware(req) {
  try {
    const token = req.cookies.get('tv_sessao')?.value
    if (!token) return NextResponse.next()

    // No Worker do OpenNext o contexto já está no escopo global. O modo
    // assíncrono também funciona no next dev e devolve o mesmo contexto.
    const contexto = await getCloudflareContext({ async: true })
    const adminMaster = process.env.ADMIN_MASTER || contexto.env.ADMIN_MASTER || ''
    const papel = await papelPeloToken(contexto.env.DB, token, adminMaster)
    if (!papel) return NextResponse.next()

    const resposta = NextResponse.rewrite(destinoInterno(req.nextUrl))
    resposta.headers.set('Cache-Control', 'no-store, max-age=0')
    resposta.headers.set('X-Robots-Tag', 'noindex')
    return resposta
  } catch {
    // Fail-closed: qualquer falha deixa o Next tratar o endereço público como
    // inexistente, sem acrescentar cabeçalhos que o diferenciem do 404 normal.
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/gestao', '/gestao/:path*', '/api/gestao', '/api/gestao/:path*'],
}
