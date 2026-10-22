import { getDB } from '@/lib/d1'
import { arquivosDe } from '@/lib/arquivos'
import { linkDeDownload } from '@/lib/b2'
import { responderDownloadLead } from '@/lib/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(req) {
  return responderDownloadLead(req, { db: getDB(), arquivosDe, linkDeDownload })
}

// Inspeções HEAD não devem gastar uma das três tentativas.
export function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } })
}
