// Executar na raiz: node scripts/achar-redirects.mjs. Nenhum git roda no site.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { songs } from '../lib/catalog.js'

export const raiz = fileURLToPath(new URL('../', import.meta.url))
export const conhecidos = [
  'espirito-enche-minha-vida-4-por-1',
  'jesus-filho-de-deus-drive-onze-fernandinho',
  'vitorioso-gabi-sampaio',
  '1000-reasons-10-mil-razoes-matt-redman',
  'fez-um-caminho-pra-mim-livres-para-adorar',
  'faz-arder-bb-lr-casa-worship',
  '1000-graus-bit153-renascer-praise',
  'grande-e-o-senhor-inversoes-arieta-magrini',
  'algo-novo-vindo-get-worship',
  'eu-vou-viver-uma-virada-toque-no-altar',
]

export function git(...args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

export function lerJson(nome) {
  const caminho = new URL(`../data/${nome}.json`, import.meta.url)
  return existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : {}
}

export function gravarJson(nome, valor) {
  mkdirSync(new URL('../data/', import.meta.url), { recursive: true })
  const ordenado = Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
  writeFileSync(new URL(`../data/${nome}.json`, import.meta.url), JSON.stringify(ordenado, null, 2) + '\n')
}

export async function carregarArtistas() {
  // Node não resolve o import sem extensão usado pelo Next; preserva a regra real dos artistas.
  const codigo = readFileSync(new URL('../lib/artists.js', import.meta.url), 'utf8')
    .replace("'./catalog'", JSON.stringify(new URL('../lib/catalog.js', import.meta.url).href))
  return (await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`)).artistList
}

export function extrairLinhas(codigo) {
  const bloco = codigo.match(/(?:const CRU|export const parte)\s*=\s*JSON\.parse\(\s*(`[^`]*`)\s*\)/s)
  if (bloco) return JSON.parse(runInNewContext(bloco[1], {}, { timeout: 1000 }))
  if (/const RAW\s*=/.test(codigo)) {
    // Os primeiros catálogos calculavam os slugs. Executa a regra original isolada,
    // sem filesystem, rede ou process, para não recriar aquela regra por aproximação.
    const lista = runInNewContext(codigo.replace(/export /g, '') + '\nJSON.stringify(songs)', {}, { timeout: 5000 })
    return JSON.parse(lista).map((s) => [s.slug, s.title, s.artist, s])
  }
  if (/const CRU\s*=\s*\[\.\.\.p1/.test(codigo)) return []
  throw new Error('Formato de catálogo desconhecido: interrompido para não omitir músicas.')
}

export function* historico() {
  const log = git('log', '--reverse', '--format=COMMIT %H %cs', '--name-only', '--diff-filter=AM', '--', 'lib/catalog.js', 'lib/catalog-dados-*.js')
  let commit, data
  for (const linha of log.split(/\r?\n/)) {
    if (linha.startsWith('COMMIT ')) [, commit, data] = linha.split(' ')
    else if (/^lib\/catalog(?:-dados-\d+)?\.js$/.test(linha)) {
      yield { commit, data, arquivo: linha, linhas: extrairLinhas(git('show', `${commit}:${linha}`)) }
    }
  }
}

export function linhasAtuais() {
  const codigo = readFileSync(new URL('../lib/catalog.js', import.meta.url), 'utf8')
  const partes = [...codigo.matchAll(/from '\.\/(catalog-dados-\d+\.js)'/g)]
  return partes.length
    ? partes.flatMap(([, nome]) => extrairLinhas(readFileSync(new URL(`../lib/${nome}`, import.meta.url), 'utf8')))
    : extrairLinhas(codigo)
}

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const semAcentos = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const vazias = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'pra', 'para', 'um', 'uma'])

function palavras(titulo, variantes, antigo) {
  let limpo = semAcentos(titulo).trim()
  if (antigo) {
    // Só retira sufixos. Tons seguem A–G, acidente e menor, inclusive G-Em;
    // BPM sem marcador só sai quando consta nas variantes da música candidata.
    const bpms = new Set(variantes.map((v) => String(v.bpm).replace(',', '.')))
    const sufixo = /(?:^|[\s(])(?:[a-g](?:#|b)?m?(?:-[a-g](?:#|b)?m?)?|(?:bit|bpm)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*bpm|ao vivo|drive onze|inversoes|lr|acustico|original|remix|medley|versao\s*\d+|v\d+)$/
    for (;;) {
      limpo = limpo.replace(/[\s),;.!\]-]+$/, '')
      const proximo = limpo.replace(sufixo, '').trim()
      if (proximo !== limpo) { limpo = proximo; continue }
      const numero = limpo.match(/(?:^|\s)(\d+(?:[.,]\d+)?)$/)
      if (numero && bpms.has(numero[1].replace(',', '.'))) { limpo = limpo.slice(0, numero.index).trim(); continue }
      break
    }
  }
  return (limpo.match(/[a-z0-9]+/g) || []).filter((p) => !vazias.has(p))
}

function jaccard(a, b) {
  const esquerda = new Set(a), direita = new Set(b)
  const uniao = new Set([...esquerda, ...direita]).size
  return uniao ? [...esquerda].filter((p) => direita.has(p)).length / uniao : 0
}

export function resolverDetalhado(versoes, atuais, artistas) {
  const niveis = { A: new Map(), B: new Map(), C: new Map(), D: new Map() }
  for (const [, titulo, artista] of versoes) {
    for (const musica of atuais) {
      if (normalizar(artista) !== normalizar(musica.artist)) continue
      const a = palavras(titulo, musica.variantes || [], true)
      const b = palavras(musica.title, [], false)
      const score = jaccard(a, b)
      const prefixo = a.length && b.length && (a.every((p, i) => p === b[i]) || b.every((p, i) => p === a[i]))
      const nivel = normalizar(titulo) === normalizar(musica.title) ? 'A'
        : a.length && b.length && a.join(' ') === b.join(' ') ? 'B'
          : prefixo ? 'C' : score >= 0.6 ? 'D' : null
      if (nivel) {
        const anterior = niveis[nivel].get(musica.slug)
        if (!anterior || score > anterior.score) niveis[nivel].set(musica.slug, { slug: musica.slug, titulo: musica.title, score })
      }
    }
  }
  const bandas = artistas.filter((a) => versoes.some((v) => normalizar(v[2]) === normalizar(a.name)))
  const fallback = bandas.length === 1 ? `/artistas/${bandas[0].slug}` : '/musicas'
  for (const [nivel, encontrados] of Object.entries(niveis)) {
    if (!encontrados.size) continue
    const candidatos = [...encontrados.values()].sort((a, b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
    return { destino: candidatos.length === 1 ? `/musicas/${candidatos[0].slug}` : fallback, nivel, candidatos }
  }
  return { destino: fallback, nivel: 'SEM_MATCH', candidatos: [] }
}

export function resolver(versoes, atuais, artistas) {
  return resolverDetalhado(versoes, atuais, artistas).destino
}

export function validarRedirects(mapa, atuais, artistas) {
  const slugs = new Set(atuais.map((s) => s.slug))
  const destinos = new Set(['/musicas', ...atuais.map((s) => `/musicas/${s.slug}`), ...artistas.map((a) => `/artistas/${a.slug}`)])
  for (const [antigo, destino] of Object.entries(mapa)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(antigo)) throw new Error(`Slug inválido: ${antigo}`)
    if (slugs.has(antigo)) throw new Error(`Origem ainda existe: ${antigo}`)
    if (!destinos.has(destino)) throw new Error(`Destino não existe: ${antigo} → ${destino}`)
  }
}

// Por padrão preserva o JSON existente. Para recalcular, passe apenas as entradas
// manuais confirmadas: gerarRedirects({ ...manuais }); {} quando não houver nenhuma.
export async function gerarRedirects(manuais = lerJson('redirects')) {
  const artistas = await carregarArtistas()
  const antigos = new Map()
  for (const { linhas } of historico()) {
    for (const linha of linhas) {
      const versoes = antigos.get(linha[0]) || []
      if (!versoes.some((v) => v[1] === linha[1] && v[2] === linha[2])) versoes.push(linha)
      antigos.set(linha[0], versoes)
    }
  }
  for (const slug of conhecidos) {
    if (antigos.has(slug)) continue
    // Sem registro no git, só reconhece o sufixo exato de um artista atual.
    // O título restante passa pelos mesmos níveis de limpeza e comparação.
    const bandas = artistas.filter((a) => slug.endsWith(`-${a.slug}`))
    antigos.set(slug, bandas.length === 1 ? [[slug, slug.slice(0, -bandas[0].slug.length - 1), bandas[0].name]] : [])
  }
  const atuais = new Set(songs.map((s) => s.slug))
  const revisao = new Map([...antigos].filter(([slug]) => !atuais.has(slug)).map(([slug, versoes]) => [slug, resolverDetalhado(versoes, songs, artistas)]))
  const gerado = Object.fromEntries([...revisao].map(([slug, resultado]) => [slug, resultado.destino]))
  const mapa = { ...gerado, ...manuais }
  validarRedirects(mapa, songs, artistas)
  const quantidade = Object.keys(mapa).length
  if (quantidade > 400) throw new Error(`${quantidade} redirects: limite de 400 excedido. Nenhum mapa foi gravado; não aplicar ao Next.`)
  gravarJson('redirects', mapa)
  const csv = [['slug_antigo', 'titulo_antigo', 'artista', 'destino', 'nivel', 'candidatos']]
  for (const slug of Object.keys(mapa).sort()) {
    const resultado = revisao.get(slug)
    const versoes = antigos.get(slug) || []
    const nivel = resultado?.destino === mapa[slug] ? resultado.nivel : 'MANUAL'
    csv.push([slug, [...new Set(versoes.map((v) => v[1]))].join(' | '), [...new Set(versoes.map((v) => v[2]))].join(' | '), mapa[slug], nivel, JSON.stringify(resultado?.candidatos || [])])
  }
  mkdirSync(new URL('../tasks/', import.meta.url), { recursive: true })
  writeFileSync(new URL('../tasks/redirects-revisao.csv', import.meta.url), '\uFEFF' + csv.map((linha) => linha.map((campo) => `"${campo.replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n')
  console.log(`${quantidade} redirecionamentos válidos.`)
  for (const slug of conhecidos) console.log(JSON.stringify({ antigo: slug, destino: mapa[slug], versoes: (antigos.get(slug) || []).map((v) => [v[1], v[2]]) }))
  return mapa
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await gerarRedirects()
