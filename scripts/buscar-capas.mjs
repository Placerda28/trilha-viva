// Busca na internet a capa de cada música do acervo e grava public/capas/<slug>.webp.
//
//   node scripts/buscar-capas.mjs                 todas as que ainda não têm capa
//   node scripts/buscar-capas.mjs --limite 30     só as 30 primeiras (piloto)
//   node scripts/buscar-capas.mjs --refazer       busca de novo mesmo as que já têm
//   node scripts/buscar-capas.mjs --so a,b        busca só estes slugs
//   node scripts/buscar-capas.mjs --aprovar a,b   promove capas "em dúvida" para public/capas
//   node scripts/buscar-capas.mjs --reavaliar     reaplica a regra de nota às já baixadas
//   node scripts/buscar-capas.mjs --usar-zips     capas de dentro dos zips (capas-dos-zips.py) passam na frente
//
// Fontes: Deezer (API aberta, rápida) e, se não achar, iTunes (Apple). Cada achado
// recebe uma nota pela semelhança do título e do artista:
//   ok      -> grava direto em public/capas/<slug>.webp
//   duvida  -> grava em tasks/capas/duvida/<slug>.webp para o Paulo olhar
//   nada    -> nenhuma capa parecida
// Saída para revisar: tasks/capas/relatorio.csv e tasks/capas/revisao.html
// (abre no navegador: capa ao lado do nome, por situação).
//
// A capa vai em 112 px (o tamanho da lista da home), webp, poucos KB: o Worker
// tem 10 ms de CPU, então é <img> simples, nada de otimizar imagem no servidor.
// O endereço original fica no CSV para baixar maior depois, se precisar.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { songs } from '../lib/catalog.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(raiz, 'public', 'capas')
const SAIDA = join(raiz, 'tasks', 'capas')
const DUVIDA = join(SAIDA, 'duvida')
const CSV = join(SAIDA, 'relatorio.csv')
for (const d of [PUB, DUVIDA]) mkdirSync(d, { recursive: true })

// Capas escolhidas à mão pelo Paulo (home e prévia): nenhum passo grava por cima.
const MANUAIS = new Set([
  '1000-graus-renascer-praise', 'estacoes-dunamis-music', 'a-boa-parte-fhop-music', 'a-casa-e-sua-casa-worship',
  'clamo-jesus-baruk', 'jesus-filho-de-deus-fernandinho', 'sou-grato-por-seu-amor-get-worship',
  'bondade-de-deus-isaias-saad', 'obediencia-fhop-music',
])

const args = process.argv.slice(2)
const valor = (nome) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : undefined
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- semelhança de nomes ----------
export function limpar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    // tudo entre parênteses sai: "(Ao Vivo)", "(feat. X)", "(Gratitude)", "(Yahweh)"
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(ao vivo|live|feat\.?|ft\.?|part\.?)\b.*$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
export function parecido(a, b) {
  const x = limpar(a)
  const y = limpar(b)
  if (!x || !y) return 0
  if (x === y) return 1
  // um contém o outro ("alegria" x "tua alegria", "algo novo" x "algo novo vindo"):
  // pode ser outra música do mesmo artista, então fica em dúvida, não direto
  if (x.includes(y) || y.includes(x)) return 0.7
  const tx = new Set(x.split(' '))
  const ty = new Set(y.split(' '))
  const comum = [...tx].filter((t) => ty.has(t)).length
  // grafia diferente ("jota a" x "jotta a", "1 tm 3 16" x "1tm 3 16"): pares de letras
  const pares = (s) => {
    const z = s.replace(/ /g, '')
    return Array.from({ length: Math.max(0, z.length - 1) }, (_, i) => z.slice(i, i + 2))
  }
  const px = pares(x)
  const py = pares(y)
  const resto = [...py]
  let iguais = 0
  for (const p of px) {
    const i = resto.indexOf(p)
    if (i >= 0) { iguais++; resto.splice(i, 1) }
  }
  const dice = px.length + py.length ? (2 * iguais) / (px.length + py.length) : 0
  return Math.max(comum / new Set([...tx, ...ty]).size, dice >= 0.8 ? dice * 0.95 : 0)
}
export function nota(song, titulo, artista) {
  const t = parecido(song.title, titulo)
  // "Fernandinho, Gabriela Rocha" contra "Fernandinho": basta um nome bater
  const a = Math.max(...String(artista).split(/,|&| e | feat\.? /i).map((p) => parecido(song.artist, p)), parecido(song.artist, artista))
  return { t, a, situacao: t >= 0.85 && a >= 0.5 ? 'ok' : t >= 0.6 && a >= 0.3 ? 'duvida' : 'nada' }
}

// ---------- fontes ----------
async function json(url) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'trilha-viva-capas/1.0' } }).catch(() => null)
    if (r?.ok) return r.json()
    await dormir(2000 * (tentativa + 1))
  }
  return null
}
// "10 Mil Razões (10,000 Reasons)" e "X + Y (Medley)": busca pelo começo do título
const tituloBusca = (t) => t.replace(/\(.*?\)/g, ' ').split(' + ')[0].trim()
async function deezer(song) {
  const q = encodeURIComponent(`artist:"${song.artist}" track:"${limpar(tituloBusca(song.title))}"`)
  let d = await json(`https://api.deezer.com/search?q=${q}&limit=10`)
  if (!d?.data?.length) d = await json(`https://api.deezer.com/search?q=${encodeURIComponent(tituloBusca(song.title) + ' ' + song.artist)}&limit=10`)
  return (d?.data || []).map((x) => ({ fonte: 'deezer', titulo: x.title, artista: x.artist?.name, url: x.album?.cover_xl || x.album?.cover_big }))
}
async function itunes(song) {
  const d = await json(`https://itunes.apple.com/search?country=BR&entity=song&limit=10&term=${encodeURIComponent(tituloBusca(song.title) + ' ' + song.artist)}`)
  return (d?.results || []).map((x) => ({ fonte: 'itunes', titulo: x.trackName, artista: x.artistName, url: x.artworkUrl100?.replace('100x100bb', '600x600bb') }))
}
function melhor(song, lista) {
  let top = null
  for (const c of lista) {
    if (!c.url) continue
    const n = nota(song, c.titulo, c.artista)
    if (!top || n.t + n.a > top.n.t + top.n.a) top = { ...c, n }
  }
  return top
}

async function gravar(url, destino) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('download ' + r.status)
  const buf = Buffer.from(await r.arrayBuffer())
  await sharp(buf).resize(112, 112, { fit: 'cover' }).webp({ quality: 82 }).toFile(destino)
}

// ---------- relatório ----------
const COLS = ['slug', 'titulo', 'artista', 'situacao', 'fonte', 'nota_titulo', 'nota_artista', 'titulo_achado', 'artista_achado', 'url']
const csvLinha = (o) => COLS.map((c) => `"${String(o[c] ?? '').replace(/"/g, '""')}"`).join(',')
function lerCsv() {
  if (!existsSync(CSV)) return new Map()
  const linhas = readFileSync(CSV, 'utf8').trim().split('\n').slice(1)
  const m = new Map()
  for (const l of linhas) {
    const v = [...l.matchAll(/"((?:[^"]|"")*)"/g)].map((x) => x[1].replace(/""/g, '"'))
    const o = Object.fromEntries(COLS.map((c, i) => [c, v[i]]))
    m.set(o.slug, o)
  }
  return m
}
function salvar(m) {
  writeFileSync(CSV, [COLS.join(','), ...[...m.values()].map(csvLinha)].join('\n') + '\n')
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const bloco = (sit, titulo, pasta) => {
    const itens = [...m.values()].filter((o) => o.situacao === sit)
    const cards = itens
      .map((o) => {
        const img = pasta ? `<img src="${pasta}/${o.slug}.webp" width="112" height="112">` : '<div class="vazio">?</div>'
        return `<figure>${img}<figcaption><b>${esc(o.titulo)}</b><br>${esc(o.artista)}${o.titulo_achado ? `<br><i>achou: ${esc(o.titulo_achado)} · ${esc(o.artista_achado)}</i>` : ''}<br><code>${o.slug}</code></figcaption></figure>`
      })
      .join('')
    return `<h2>${titulo} (${itens.length})</h2><div class="grade">${cards}</div>`
  }
  writeFileSync(
    join(SAIDA, 'revisao.html'),
    `<!doctype html><meta charset="utf-8"><title>Capas do acervo</title><style>body{font:14px system-ui;margin:24px;background:#fafafa}.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}figure{display:flex;gap:10px;margin:0;background:#fff;border:1px solid #ddd;padding:8px}img,.vazio{width:112px;height:112px;flex:none;background:#111;color:#fff;display:grid;place-items:center}i{color:#a00}code{color:#777;font-size:11px}</style>
<h1>Capas do acervo</h1><p>Em dúvida: confira. Para aprovar: <code>node scripts/buscar-capas.mjs --aprovar slug1,slug2</code>. Capa errada entre as "ok": apague o arquivo em public/capas.</p>
${bloco('duvida', 'Em dúvida', 'duvida')}${bloco('ok', 'Achadas', '../../public/capas')}${bloco('nada', 'Não achadas', '')}`,
  )
}

// ---------- principal ----------
const relatorio = lerCsv()

if (valor('--aprovar')) {
  for (const slug of valor('--aprovar').split(',').map((s) => s.trim()).filter(Boolean)) {
    const de = join(DUVIDA, slug + '.webp')
    if (!existsSync(de)) { console.log('sem capa em dúvida:', slug); continue }
    renameSync(de, join(PUB, slug + '.webp'))
    if (relatorio.has(slug)) relatorio.get(slug).situacao = 'ok'
    console.log('aprovada:', slug)
  }
  salvar(relatorio)
  process.exit(0)
}

// --reavaliar: recalcula a nota das já baixadas com a regra atual, sem buscar de
// novo; a "ok" que cair para dúvida vai para tasks/capas/duvida.
if (args.includes('--reavaliar')) {
  const porSlug = new Map(songs.map((s) => [s.slug, s]))
  let movidas = 0
  for (const o of relatorio.values()) {
    const song = porSlug.get(o.slug)
    if (!song || !o.titulo_achado || (o.situacao !== 'ok' && o.situacao !== 'duvida')) continue
    const n = nota(song, o.titulo_achado, o.artista_achado)
    o.nota_titulo = n.t.toFixed(2)
    o.nota_artista = n.a.toFixed(2)
    const pub = join(PUB, o.slug + '.webp')
    if (o.situacao === 'ok' && n.situacao !== 'ok' && existsSync(pub) && !MANUAIS.has(o.slug)) {
      renameSync(pub, join(DUVIDA, o.slug + '.webp'))
      o.situacao = 'duvida'
      movidas++
    }
  }
  salvar(relatorio)
  console.log('capas que voltaram para dúvida:', movidas)
  process.exit(0)
}

// --usar-zips: a capa achada dentro do zip da VS (scripts/capas-dos-zips.py, em
// tasks/capas/das-vs) é a exata daquela VS: passa na frente da da internet.
if (args.includes('--usar-zips')) {
  const ZIPS = join(SAIDA, 'das-vs')
  const porSlug = new Map(songs.map((s) => [s.slug, s]))
  let usadas = 0
  const { readdirSync, rmSync } = await import('node:fs')
  for (const arq of existsSync(ZIPS) ? readdirSync(ZIPS) : []) {
    const slug = arq.replace(/\.(jpe?g|png|webp)$/i, '')
    const song = porSlug.get(slug)
    if (!song || MANUAIS.has(slug)) continue
    try {
      await sharp(join(ZIPS, arq)).resize(112, 112, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(PUB, slug + '.webp'))
    } catch {
      continue // imagem do zip quebrada: fica a da internet
    }
    rmSync(join(DUVIDA, slug + '.webp'), { force: true })
    relatorio.set(slug, { slug, titulo: song.title, artista: song.artist, situacao: 'ok', fonte: 'zip da VS' })
    usadas++
  }
  salvar(relatorio)
  console.log('capas dos zips usadas:', usadas)
  process.exit(0)
}

const refazer = args.includes('--refazer')
const limite = Number(valor('--limite')) || Infinity
const so = valor('--so')?.split(',').map((s) => s.trim())
const fila = songs
  .filter((s) => !MANUAIS.has(s.slug) && (so ? so.includes(s.slug) : refazer || !existsSync(join(PUB, s.slug + '.webp'))))
  .slice(0, limite)
console.log(`${fila.length} músicas para buscar (de ${songs.length})`)

let n = 0
const conta = { ok: 0, duvida: 0, nada: 0, erro: 0 }
for (const song of fila) {
  n++
  let achado = melhor(song, await deezer(song))
  await dormir(150) // Deezer: 50 pedidos a cada 5 s
  if (!achado || achado.n.situacao !== 'ok') {
    const it = melhor(song, await itunes(song))
    if (it && (!achado || it.n.t + it.n.a > achado.n.t + achado.n.a)) achado = it
    await dormir(3100) // iTunes: ~20 pedidos por minuto
  }
  const sit = achado?.n.situacao || 'nada'
  const linha = {
    slug: song.slug, titulo: song.title, artista: song.artist, situacao: sit,
    fonte: achado?.fonte, nota_titulo: achado?.n.t.toFixed(2), nota_artista: achado?.n.a.toFixed(2),
    titulo_achado: achado?.titulo, artista_achado: achado?.artista, url: achado?.url,
  }
  try {
    if (sit === 'ok') await gravar(achado.url, join(PUB, song.slug + '.webp'))
    if (sit === 'duvida') await gravar(achado.url, join(DUVIDA, song.slug + '.webp'))
  } catch (e) {
    linha.situacao = 'nada'
    conta.erro++
  }
  conta[linha.situacao]++
  relatorio.set(song.slug, linha)
  if (n % 25 === 0 || n === fila.length) {
    salvar(relatorio)
    console.log(`${n}/${fila.length}  ok ${conta.ok} · dúvida ${conta.duvida} · nada ${conta.nada}${conta.erro ? ' · erro ' + conta.erro : ''}`)
  }
}
salvar(relatorio)
