import { NextResponse } from 'next/server'
import { clienteAtual, temCompra } from '@/lib/sessao'
import { usoDeHoje, registrarDownload } from '@/lib/cota'
import { arquivosDe } from '@/lib/arquivos'
import { getSong } from '@/lib/catalog'
import { abrirArquivo, b2Configurado } from '@/lib/b2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O download e' um LINK que o navegador segue, nao um pedido em segundo plano:
// um arquivo de 400 MB tem que ir direto para o disco. Por isso erro aqui nao
// pode ser JSON -- o cliente veria um texto cru numa aba em branco. Volta para
// o acervo com um aviso, que e' o que a pessoa entende.
function voltar(motivo, base) {
  return NextResponse.redirect(new URL('/acervo?aviso=' + motivo, base), { status: 303 })
}

// Entrega uma música. A ordem das conferências não é acidental: primeiro quem
// é, depois se comprou, depois se ainda tem cota — e só então o acervo é
// tocado. Nada de caro acontece antes de a pessoa ter direito.
export async function GET(req) {
  const url = new URL(req.url)
  const BASE = url.origin

  const cliente = await clienteAtual()
  if (!cliente) return NextResponse.redirect(new URL('/entrar?expirou=1', BASE), { status: 303 })
  if (cliente.bloqueado) return voltar('suspenso', BASE)
  if (!(await temCompra(cliente.id))) return voltar('sem-compra', BASE)
  if (!b2Configurado()) return voltar('preparando', BASE)

  const slug = String(url.searchParams.get('slug') || '')
  const indice = Number(url.searchParams.get('i') || 0)

  const musica = getSong(slug)
  if (!musica) return voltar('nao-encontrada', BASE)

  // O caminho do arquivo NUNCA vem do endereço — vem da tabela, a partir do
  // slug. Se viesse de fora, bastaria pedir "../outra-coisa" para passear pelo
  // balde inteiro.
  const lista = await arquivosDe(slug)
  const caminho = lista[Number.isInteger(indice) && indice >= 0 ? indice : 0]
  if (!caminho) return voltar('sem-arquivo', BASE)

  const uso = await usoDeHoje(cliente.id)
  if (uso.restam <= 0) return voltar('cota', BASE)

  const resposta = await abrirArquivo(caminho, req.headers.get('range'))
  if (!resposta || !resposta.ok) {
    console.error('b2 download', slug, caminho, resposta?.status)
    return voltar('falhou', BASE)
  }

  await registrarDownload({
    clienteId: cliente.id,
    arquivo: caminho,
    slug,
    ip: req.headers.get('cf-connecting-ip') || '',
  })

  // O nome que o cliente vê na pasta dele. O do balde carrega a pasta do
  // artista e às vezes um nome de origem confuso; aqui vai "Banda - Música".
  const extensao = caminho.slice(caminho.lastIndexOf('.')) || '.zip'
  // Sem expressao regular de proposito: os caracteres proibidos em nome de
  // arquivo incluem a barra invertida, e sequencia de escape ja se corrompeu
  // no caminho ate o repositorio neste projeto. Trocar um por um e' feio e e'
  // seguro.
  const PROIBIDOS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
  let limpo = musica.artist + ' - ' + musica.title
  for (const c of PROIBIDOS) limpo = limpo.split(c).join('-')
  const nome = limpo + extensao

  const cabecalhos = new Headers()
  cabecalhos.set('Content-Type', 'application/octet-stream')
  cabecalhos.set('Content-Disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(nome))
  cabecalhos.set('Cache-Control', 'private, no-store')
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = resposta.headers.get(h)
    if (v) cabecalhos.set(h, v)
  }

  // O corpo é repassado em fluxo, sem ser lido: os bytes atravessam o site sem
  // nunca entrar na memória. É o que permite entregar 400 MB dentro dos 10 ms
  // de processamento que o plano gratuito dá por visita.
  return new Response(resposta.body, { status: resposta.status, headers: cabecalhos })
}
