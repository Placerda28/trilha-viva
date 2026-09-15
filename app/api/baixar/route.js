import { NextResponse } from 'next/server'
import { clienteAtual, temCompra } from '@/lib/sessao'
import { usoDeHoje, registrarDownload } from '@/lib/cota'
import { arquivosDe } from '@/lib/arquivos'
import { getSong } from '@/lib/catalog'
import { linkDeDownload, b2Configurado } from '@/lib/b2'

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

  // O arquivo passa a vir DIRETO do Backblaze (link com validade de 5
  // minutos, gerado só agora que login, compra e cota já foram conferidos).
  // Antes o Worker lia e repassava os bytes em fluxo, o que estourava o
  // limite de CPU do plano gratuito da Cloudflare em arquivos grandes e
  // entregava um arquivo corrompido, de tamanho diferente a cada tentativa.
  const link = await linkDeDownload(caminho, nome, 300)
  if (!link) {
    console.error('b2 link de download', slug, caminho)
    return voltar('falhou', BASE)
  }

  await registrarDownload({
    clienteId: cliente.id,
    arquivo: caminho,
    slug,
    ip: req.headers.get('cf-connecting-ip') || '',
  })

  return NextResponse.redirect(link, {
    status: 303,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
