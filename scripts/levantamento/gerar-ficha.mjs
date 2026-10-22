import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CANAIS = ['Clique', 'Guia', 'Bateria', 'Percussão', 'Baixo', 'Guitarra / Violão',
  'Teclado / Piano', 'Órgão', 'Sintetizador', 'Pads', 'Cordas', 'Sopros', 'Banjo', 'Bandolim',
  'Dulcimer', 'Lap Steel', 'Mellotron', 'Vocal principal', 'Backing vocals', 'Loops', 'Efeitos']

const positivo = n => Number.isFinite(n) && n > 0
// Presença em ordem de prioridade; empate preserva a ordem do levantamento.
const peso = a => Number(positivo(a.bpm)) * 8 + Number(Boolean(a.tom)) * 4
  + Number(Boolean(a.canais?.length)) * 2 + Number(positivo(a.duracao_seg))

export function gerarDados(levantamento, pesquisa, catalogo) {
  const tipos = new Map(catalogo.map(s => [s.slug, s.tipo]))
  const dados = {}
  for (const slug of new Set([...Object.keys(levantamento), ...Object.keys(pesquisa)])) {
    const arquivos = levantamento[slug]?.arquivos ?? []
    const principal = arquivos.reduce((melhor, a) => peso(a) > peso(melhor) ? a : melhor, arquivos[0] ?? {})
    const extra = pesquisa[slug] ?? {}
    const bpmArquivo = positivo(principal.bpm) ? principal.bpm : arquivos.find(a => positivo(a.bpm))?.bpm
    const tomArquivo = principal.tom || arquivos.find(a => a.tom)?.tom
    const fonte = extra.fonte === 'multitracks' ? 1 : extra.fonte === 'pesquisa' ? 2 : null
    // Mesma faixa do levantamento (50 a 200). O MultiTracks conta colcheias em 12/8
    // (Morada deu 219): fora da faixa, fica sem BPM em vez de mostrar número enganoso.
    const bpmPesquisa = fonte !== null && positivo(extra.bpm) && extra.bpm >= 50 && extra.bpm <= 200 ? extra.bpm : null
    const bpm = bpmArquivo ?? bpmPesquisa
    const tom = tomArquivo || (fonte !== null ? extra.tom : null) || null
    const compasso = extra.fonte === 'multitracks' ? extra.compasso ?? null : null
    const duracao = positivo(principal.duracao_seg) ? Math.round(principal.duracao_seg) : null
    const indices = CANAIS.flatMap((nome, i) => principal.canais?.includes(nome) ? [i] : [])
    const canais = tipos.get(slug) !== 'VS MP3' && principal.qtd_arquivos > 0
      && principal.qtd_reconhecidos / principal.qtd_arquivos >= 0.8 && indices.length ? indices : null
    if (bpm === null && tom === null && compasso === null && duracao === null && canais === null) continue
    const linha = [bpm === null ? null : Math.round(bpm), tom, compasso, duracao, canais,
      bpm === null ? null : bpmArquivo != null ? 0 : fonte, tom === null ? null : tomArquivo ? 0 : fonte]
    while (linha.at(-1) === null) linha.pop()
    dados[slug] = linha
  }
  return dados
}

// O JSON passa por um literal JS antes do parse: escape também ${, crase e barra.
const literal = dados => {
  const barra = String.fromCharCode(92)
  return JSON.stringify(dados).replaceAll(barra, barra + barra).replaceAll('`', barra + '`').replaceAll('${', barra + '${')
}
const aviso = '// ARQUIVO GERADO. Não edite à mão. Rode: node scripts/levantamento/gerar-ficha.mjs\n'

export function gerarModulo(dados, partes = 0) {
  const cabecalho = partes
    ? Array.from({ length: partes }, (_, i) => `import { parte as p${i} } from './ficha-dados-${i + 1}.js'`).join('\n')
      + '\nexport const FICHAS = {' + Array.from({ length: partes }, (_, i) => `...p${i}`).join(',') + '}\n'
    : 'export const FICHAS = JSON.parse(`' + literal(dados) + '`)\n'
  return aviso + '// Tupla: BPM, tom, compasso, segundos, índices de canais, fonte BPM, fonte tom.\n'
    + cabecalho + 'export const CANAIS = JSON.parse(`' + literal(CANAIS) + '`)\n'
    + `const FONTES = ['arquivo', 'multitracks', 'pesquisa']
export function getFicha(slug) {
  if (!Object.hasOwn(FICHAS, slug)) return null
  const [bpm = null, tom = null, compasso = null, duracaoSeg = null, canais = null, fonteBpm = null, fonteTom = null] = FICHAS[slug]
  return { bpm, tom, compasso, duracaoSeg, canais: canais === null ? null : canais.map(i => CANAIS[i]),
    fonteBpm: FONTES[fonteBpm] ?? null, fonteTom: FONTES[fonteTom] ?? null }
}
`
}

async function main() {
  const raiz = new URL('../../', import.meta.url)
  const levantamento = JSON.parse(await readFile(new URL('data/levantamento.json', raiz), 'utf8'))
  const pesquisa = JSON.parse(await readFile(new URL('data/pesquisa-bpm-tom.json', raiz), 'utf8'))
  const { songs } = await import(new URL('lib/catalog.js', raiz))
  const dados = gerarDados(levantamento, pesquisa, songs)
  let modulo = gerarModulo(dados)
  if (Buffer.byteLength(modulo) >= 90000) {
    const partes = [{}]
    let tamanho = 0
    for (const [slug, linha] of Object.entries(dados)) {
      const bytes = Buffer.byteLength(literal({ [slug]: linha }))
      if (tamanho + bytes > 80000) { partes.push({}); tamanho = 0 }
      partes.at(-1)[slug] = linha
      tamanho += bytes
    }
    for (const [i, parte] of partes.entries()) {
      await writeFile(new URL(`lib/ficha-dados-${i + 1}.js`, raiz), aviso + 'export const parte = JSON.parse(`' + literal(parte) + '`)\n')
    }
    modulo = gerarModulo(dados, partes.length)
  }
  await writeFile(new URL('lib/ficha.js', raiz), modulo)
  const linhas = Object.values(dados)
  process.stdout.write(JSON.stringify({ bytes: Buffer.byteLength(modulo), musicas: linhas.length,
    bpm: linhas.filter(a => a[0] != null).length, tom: linhas.filter(a => a[1] != null).length,
    duracao: linhas.filter(a => a[3] != null).length, canais: linhas.filter(a => a[4] != null).length }) + '\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1 })
}
