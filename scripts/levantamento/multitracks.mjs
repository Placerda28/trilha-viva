// Uso: node scripts/levantamento/multitracks.mjs --sitemap caminho.xml [--conferir 30] [--so-casar]
// --so-casar não acessa a rede nem grava resultados. O arquivo do acervo sempre prevalece.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as esperar } from 'node:timers/promises'
import { songs } from '../../lib/catalog.js'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const cache = join(tmpdir(), 'tv-multitracks')
const sitemapPadrao = join(tmpdir(), 'claude/C--dev-trilha-viva/17e6e9d5-9d6e-4085-8609-c9b759dc515c/scratchpad/multitracks-songs.xml')

export function entidades(texto) {
  const nomes = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ', sharp: '♯', flat: '♭' }
  const acentos = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327' }
  for (let i = 0; i < 4; i++) {
    texto = texto.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (original, nome) => {
      if (!nome.startsWith('#')) {
        const acento = nome.match(/^([aeiounc])(acute|grave|circ|tilde|uml|cedil)$/i)
        return nomes[nome.toLowerCase()] ?? (acento ? (acento[1] + acentos[acento[2].toLowerCase()]).normalize('NFC') : original)
      }
      const n = nome[1].toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : Number(nome.slice(1))
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : original
    })
  }
  return texto
}

function decodificar(texto) {
  try { texto = decodeURIComponent(texto) } catch { /* Segmento malformado: mantém o texto original. */ }
  return entidades(texto)
}

export function normalizar(texto) {
  return decodificar(texto).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

const semVersao = texto => decodificar(texto).replace(/\([^()]*\)/g, ' ')
function artistaCasa(a, b) {
  return a === b || [a, b].every(Boolean) && (
    a.split(' ').length >= 2 && ` ${b} `.includes(` ${a} `) ||
    b.split(' ').length >= 2 && ` ${a} `.includes(` ${b} `))
}

export function indexarSitemap(xml) {
  const indice = new Map(), vistos = new Set()
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    let url
    try { url = new URL(entidades(loc)) } catch { continue }
    const partes = url.pathname.split('/').filter(Boolean)
    if (url.origin !== 'https://www.multitracks.com' || partes.length !== 4 || partes[0] !== 'songs') continue
    url.search = ''; url.hash = ''
    if (vistos.has(url.href)) continue
    vistos.add(url.href)
    const titulo = normalizar(partes[3]), base = normalizar(semVersao(partes[3]))
    const candidato = { url: url.href, artista: normalizar(partes[1]), titulo, album: `${partes[1]}/${partes[2]}` }
    for (const chave of new Set([titulo, base])) {
      if (!indice.has(chave)) indice.set(chave, [])
      indice.get(chave).push(candidato)
    }
  }
  return indice
}

export function casar(musica, indice) {
  const artista = normalizar(musica.artist), titulo = normalizar(musica.title)
  const filtrar = chave => (indice.get(chave) ?? []).filter(c => artistaCasa(artista, c.artista))
  const exatos = filtrar(titulo).filter(c => c.titulo === titulo)
  const candidatos = exatos.length ? exatos : filtrar(normalizar(semVersao(musica.title)))
  // Um voto por álbum; a ordem lexical torna a seleção de até quatro páginas repetível.
  const albuns = new Set()
  return candidatos.sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0).filter(c => {
    if (albuns.has(c.album)) return false
    albuns.add(c.album)
    return true
  }).slice(0, 4)
}

export function normalizarTom(valor) {
  const m = entidades(valor).replace(/♯/g, '#').replace(/♭/g, 'b').trim()
    .match(/^([A-G])\s*(#|b|sharp|flat)?\s*(m|minor|major|menor|maior)?$/i)
  if (!m) return null
  return m[1].toUpperCase() + ({ sharp: '#', flat: 'b' }[m[2]?.toLowerCase()] ?? m[2]?.toLowerCase() ?? '') +
    (/^(m|minor|menor)$/i.test(m[3] ?? '') ? 'm' : '')
}

export function parsePagina(html) {
  const texto = entidades(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ')
  const tom = normalizarTom(texto.match(/\bKey:\s*(.*?)\s*BPM:/i)?.[1] ?? '')
  const numero = Number(texto.match(/\bBPM:\s*(\d+(?:[.,]\d+)?)/i)?.[1]?.replace(',', '.'))
  const bpm = numero > 0 && Number.isFinite(numero) ? (Math.abs(numero - Math.round(numero)) <= 0.300000001 ? Math.round(numero) : numero) : null
  const compasso = texto.match(/\bTime Sig:\s*(\d+\s*\/\s*\d+)/i)?.[1]?.replace(/\s/g, '') ?? null
  const tempo = texto.match(/\bLength:\s*(\d+):([0-5]\d)(?::([0-5]\d))?/i)
  const duracao_seg = tempo ? (tempo[3] ? Number(tempo[1]) * 3600 + Number(tempo[2]) * 60 + Number(tempo[3]) : Number(tempo[1]) * 60 + Number(tempo[2])) : null
  return { bpm, tom, compasso, duracao_seg }
}

export function consolidar(paginas) {
  const unicas = [...new Map(paginas.map(p => [p.album, p])).values()]
  const resultado = {}, notas = []
  for (const campo of ['bpm', 'tom', 'compasso', 'duracao_seg']) {
    const votos = new Map()
    for (const p of unicas) if (p[campo] != null) votos.set(p[campo], (votos.get(p[campo]) ?? 0) + 1)
    const ranking = [...votos].sort((a, b) => b[1] - a[1])
    resultado[campo] = ranking.length && ranking[0][1] / unicas.length >= 2 / 3 ? ranking[0][0] : null
    if (votos.size > 1 || resultado[campo] === null && votos.size) {
      notas.push(`${campo}: ${JSON.stringify(unicas.map(p => ({ album: p.album, valor: p[campo] ?? null })))}`)
    }
  }
  for (const p of unicas) if (p.erro) notas.push(`${p.url}: ${p.erro}`)
  return { ...resultado, fonte: 'multitracks', urls: unicas.map(p => p.url), nota: notas.join('; ') }
}

export function selecionar(catalogo, levantamento, conferir = 0) {
  const itens = catalogo.map(m => {
    const arquivos = levantamento[m.slug]?.arquivos ?? []
    const bpms = [...new Set(arquivos.map(a => a.bpm).filter(v => v != null))]
    const tons = [...new Set(arquivos.map(a => a.tom).filter(v => v != null))]
    return { ...m, bpms, tons, faltaBpm: !bpms.length, faltaTom: !tons.length }
  })
  const completos = itens.filter(m => !m.faltaBpm && !m.faltaTom)
  let semente = 20261021
  for (let i = completos.length - 1; i > 0; i--) {
    semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0
    const j = Math.floor(semente / 2 ** 32 * (i + 1))
    ;[completos[i], completos[j]] = [completos[j], completos[i]]
  }
  return [...itens.filter(m => m.faltaBpm || m.faltaTom), ...completos.slice(0, conferir).map(m => ({ ...m, conferir: true }))]
}

export function mesclar(existente, musica, resultado) {
  if (musica.conferir || existente[musica.slug] && existente[musica.slug].fonte !== 'multitracks') return existente
  return { ...existente, [musica.slug]: { ...resultado, bpm: musica.faltaBpm ? resultado.bpm : null, tom: musica.faltaTom ? resultado.tom : null } }
}

export function compararBpm(arquivos, bpm) {
  if (bpm == null) return 'sem dado'
  if (arquivos.some(n => Math.abs(n - bpm) <= 2)) return 'sim'
  return arquivos.some(n => Math.abs(n - bpm * 2) <= 2 || Math.abs(n * 2 - bpm) <= 2) ? 'dobro' : 'não'
}

async function lerOpcional(caminho) {
  try { return await readFile(caminho, 'utf8') } catch (erro) { if (erro.code === 'ENOENT') return null; throw erro }
}

async function gravar(caminho, conteudo) {
  await writeFile(`${caminho}.tmp`, conteudo, 'utf8')
  await rename(`${caminho}.tmp`, caminho)
}

export function criarBaixador({ pasta = cache, requisitar = fetch, dormir = esperar, agora = Date.now } = {}) {
  let ultimo = -Infinity, baixadas = 0
  return {
    get baixadas() { return baixadas },
    async baixar(url) {
      await mkdir(pasta, { recursive: true })
      const arquivo = join(pasta, `${createHash('sha256').update(url).digest('hex')}.html`)
      const salvo = await lerOpcional(arquivo)
      if (salvo !== null) return salvo
      for (let tentativa = 0; tentativa < 4; tentativa++) {
        await dormir(Math.max(0, 1500 - (agora() - ultimo)))
        ultimo = agora()
        const resposta = await requisitar(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(30000) })
        if (resposta.ok) {
          const html = await resposta.text()
          if (!Object.values(parsePagina(html)).some(v => v !== null)) throw new Error('Página sem metadados; não armazenada no cache')
          await gravar(arquivo, html)
          baixadas++
          return html
        }
        if (tentativa === 3 || resposta.status !== 429 && resposta.status < 500) throw new Error(`HTTP ${resposta.status}`)
        const retry = resposta.headers.get('retry-after')
        const pausa = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - agora()) : 0
        await resposta.body?.cancel()
        await dormir(Math.max(3000 * 2 ** tentativa, Number.isFinite(pausa) ? pausa : 0))
      }
    },
  }
}

async function main() {
  let sitemap = sitemapPadrao, conferir = 0, soCasar = false
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--so-casar') soCasar = true
    else if (args[i] === '--sitemap' && args[i + 1]) sitemap = resolve(args[++i])
    else if (args[i] === '--conferir' && /^\d+$/.test(args[i + 1] ?? '')) conferir = Number(args[++i])
    else throw new Error(`Opção inválida: ${args[i]}. Use --sitemap caminho.xml, --conferir N e/ou --so-casar.`)
  }
  const levantamento = JSON.parse(await readFile(join(raiz, 'data/levantamento.json'), 'utf8'))
  const indice = indexarSitemap(await readFile(sitemap, 'utf8'))
  const musicas = selecionar(songs, levantamento, conferir).map(m => ({ ...m, candidatos: casar(m, indice) }))
  const faltantes = musicas.filter(m => !m.conferir)
  console.log(`Faltantes: ${faltantes.length}; sem BPM: ${faltantes.filter(m => m.faltaBpm).length}; sem tom: ${faltantes.filter(m => m.faltaTom).length}.`)
  console.log(`Procuradas: ${musicas.length}; casaram: ${musicas.filter(m => m.candidatos.length).length}; faltantes que casaram: ${faltantes.filter(m => m.candidatos.length).length}.`)
  if (soCasar) return
  const destino = join(raiz, 'data/pesquisa-bpm-tom.json')
  let pesquisa = JSON.parse(await lerOpcional(destino) ?? '{}')
  const baixador = criarBaixador(), conferencia = []
  let bpm = 0, tom = 0, ambos = 0
  for (const musica of musicas) {
    const paginas = []
    for (const candidato of musica.candidatos) {
      try { paginas.push({ ...candidato, ...parsePagina(await baixador.baixar(candidato.url)) }) }
      catch (erro) { paginas.push({ ...candidato, erro: erro.message }) }
    }
    const resultado = consolidar(paginas)
    if (musica.conferir) {
      conferencia.push([musica.slug, musica.bpms.join('|'), resultado.bpm, musica.tons.join('|'), resultado.tom, resultado.compasso,
        compararBpm(musica.bpms, resultado.bpm), resultado.tom == null ? 'sem dado' : musica.tons.some(t => normalizarTom(t) === resultado.tom) ? 'sim' : 'não'])
    } else if (paginas.length) {
      const anterior = pesquisa
      pesquisa = mesclar(pesquisa, musica, resultado)
      if (pesquisa !== anterior) {
        const b = musica.faltaBpm && resultado.bpm != null, t = musica.faltaTom && resultado.tom != null
        bpm += Number(b); tom += Number(t); ambos += Number(b && t)
        await gravar(destino, JSON.stringify(pesquisa, null, 2) + '\n')
      }
    }
  }
  console.log(`Páginas baixadas: ${baixador.baixadas}; ganharam BPM: ${bpm}; tom: ${tom}; ambos: ${ambos}.`)
  if (conferir) {
    const csv = [['slug', 'bpm_arquivo', 'bpm_mt', 'tom_arquivo', 'tom_mt', 'compasso', 'bate_bpm', 'bate_tom'], ...conferencia]
      .map(linha => linha.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    await gravar(join(raiz, 'tasks/multitracks-conferencia.csv'), csv + '\n')
    const porcentagem = campo => conferencia.length ? (100 * conferencia.filter(l => l[campo] === 'sim').length / conferencia.length).toFixed(1) : '0.0'
    console.log(`Conferência (${conferencia.length}, incluindo sem dado): BPM ${porcentagem(6)}%; tom ${porcentagem(7)}%; dobro/metade: ${conferencia.filter(l => l[6] === 'dobro').length}.`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(erro => { console.error(erro.message); process.exitCode = 1 })
}
