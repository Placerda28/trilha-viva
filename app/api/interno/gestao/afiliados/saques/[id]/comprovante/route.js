import { getDB } from '@/lib/d1'
import { mesmaOrigem } from '@/lib/origem'
import { naoEncontrado } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { comId, emailDe, extDe, idDe, irPara, resposta } from '@/lib/gestao/saques-rota'
import { linkDeDownload } from '@/lib/b2'
import { enviarParaB2, caminhoDoComprovante, caminhoValido, envioConfigurado, MAX_COMPROVANTE_BYTES, tipoPelosBytes } from '@/lib/b2-envio'
import { gravarComprovante, saquePorId } from '@/lib/afiliados/saques-gestao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Margem do envelope multipart sobre os 5 MB do arquivo.
const MAX_CORPO = MAX_COMPROVANTE_BYTES + 256 * 1024

const post = async (req, admin, ctx) => {
  if (!mesmaOrigem(req)) return naoEncontrado()
  const id = await idDe(ctx)
  if (!id) return resposta({ ok: false, erro: 'Saque não encontrado.' }, 404)
  if (!envioConfigurado()) return resposta({ ok: false, erro: 'Armazenamento de comprovantes não configurado' }, 503)
  // Sem Content-Length o formData() leria o corpo inteiro: exige o cabeçalho antes de ler qualquer byte.
  const declarado = Number(req.headers.get('content-length'))
  if (!req.headers.get('content-length') || !Number.isFinite(declarado)) {
    return resposta({ ok: false, erro: 'Envie o tamanho do arquivo (Content-Length).' }, 411)
  }
  if (declarado > MAX_CORPO) return resposta({ ok: false, erro: 'O arquivo pode ter até 5 MB.' }, 413)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const saque = await saquePorId(db, id)
  if (!saque) return resposta({ ok: false, erro: 'Saque não encontrado.' }, 404)
  if (saque.status !== 'solicitado') return resposta({ ok: false, erro: 'Este saque já foi tratado.' }, 409)

  let arquivo = null
  try {
    arquivo = (await req.formData()).get('arquivo')
  } catch {
    /* cai na validação */
  }
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function' || !arquivo.size) {
    return resposta({ ok: false, erro: 'Escolha o arquivo do comprovante.' }, 400)
  }
  if (arquivo.size > MAX_COMPROVANTE_BYTES) return resposta({ ok: false, erro: 'O arquivo pode ter até 5 MB.' }, 413)
  const corpo = await arquivo.arrayBuffer()
  const tipo = tipoPelosBytes(new Uint8Array(corpo, 0, Math.min(16, corpo.byteLength)))
  if (!tipo) return resposta({ ok: false, erro: 'Envie um PDF, JPG ou PNG.' }, 400)

  const caminho = caminhoDoComprovante(id, tipo.ext)
  const r = await enviarParaB2({ caminho, corpo, mime: tipo.mime })
  if (!r.ok) return resposta({ ok: false, erro: 'Não foi possível guardar o comprovante agora. Tente de novo.' }, 502)
  // Só depois do B2 confirmar: este é o caminho que o "pagar" vai usar (o saque pode ter sido tratado nesse meio tempo).
  if (!(await gravarComprovante(db, { saqueId: id, caminho }))) {
    return resposta({ ok: false, erro: 'Este saque já foi tratado.' }, 409)
  }
  await gravarRegistro(db, { quem: emailDe(admin), acao: 'afiliado_comprovante', alvo: saque.codigo, detalhe: { saque_id: id } })
  return resposta({ ok: true, caminho })
}

// A Gestão abre o comprovante já anexado (302 para o link de 5 min).
const get = async (req, admin, ctx) => {
  const id = await idDe(ctx)
  const db = getDB()
  if (!db) return resposta({ ok: false, erro: 'Banco indisponível no momento.' }, 503)
  const saque = id ? await saquePorId(db, id) : null
  if (!saque?.comprovante_caminho || !caminhoValido(id, saque.comprovante_caminho)) return resposta({ ok: false, erro: 'Comprovante não encontrado.' }, 404)
  const link = await linkDeDownload(saque.comprovante_caminho, `comprovante-saque-${id}.${extDe(saque.comprovante_caminho)}`, 300)
  if (!link) return resposta({ ok: false, erro: 'Não foi possível abrir o comprovante agora.' }, 503)
  return irPara(link)
}

export const GET = comId(get)
export const POST = comId(post)
export const HEAD = naoEncontrado
export const OPTIONS = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
