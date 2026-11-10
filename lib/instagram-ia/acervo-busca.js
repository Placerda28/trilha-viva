// Busca no acervo (lib/catalog.js, arquivo gerado) pelo codigo, antes de chamar a IA.
// Indice normalizado montado uma vez por instancia, na primeira busca (limite de CPU do Worker).
// Sem localeCompare: so Map, Set e includes.
import { songs } from '../catalog.js'

const LIMITE = 8
const SITE = 'https://trilhaviva.org/musicas/'
// Palavras de banda/titulo que aparecem em qualquer conversa: nao bastam sozinhas.
const GENERICAS = new Set([
  'jesus', 'senhor', 'aleluia', 'gloria', 'amor', 'deus', 'adoracao', 'louvor', 'graca', 'paz',
  'diante', 'trono', 'ministerio', 'worship', 'music', 'gospel', 'igreja', 'church', 'cristo',
  'brasil', 'vozes', 'voz', 'musica', 'banda', 'ministracao', 'celebracao', 'tudo', 'nada',
])

const ACENTOS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

let indice = null

function titulosGenericos(palavras) {
  return palavras.length === 1 && (palavras[0].length < 6 || GENERICAS.has(palavras[0]))
}

function montarIndice() {
  const porTitulo = new Map() // primeira palavra do titulo -> [{ norm, i }]
  const porToken = new Map() // palavra da banda -> Set de bandas
  const bandas = new Map() // banda normalizada -> { palavras, musicas: [i] }
  songs.forEach((s, i) => {
    const palavras = normalizar(s.title).split(' ')
    if (!titulosGenericos(palavras)) {
      const lista = porTitulo.get(palavras[0]) || []
      lista.push({ norm: ` ${palavras.join(' ')} `, i })
      porTitulo.set(palavras[0], lista)
    }
    const nb = normalizar(s.artist)
    if (!bandas.has(nb)) bandas.set(nb, { palavras: nb.split(' '), musicas: [] })
    bandas.get(nb).musicas.push(i)
  })
  for (const [nb, b] of bandas) {
    for (const p of b.palavras) {
      if (p.length < 4 || GENERICAS.has(p)) continue
      if (!porToken.has(p)) porToken.set(p, new Set())
      porToken.get(p).add(nb)
    }
  }
  return { porTitulo, porToken, bandas }
}

function bandasCitadas(ix, conjunto) {
  const achadas = new Map() // banda -> forca (2 = nome inteiro, 1 = so uma palavra forte)
  for (const p of conjunto) {
    for (const nb of ix.porToken.get(p) || []) {
      const b = ix.bandas.get(nb)
      const inteira = b.palavras.every((w) => conjunto.has(w))
      if (inteira) achadas.set(nb, 2)
      else if (p.length >= 6 && !achadas.has(nb)) achadas.set(nb, 1)
    }
  }
  return achadas
}

function titulosCitados(ix, texto, palavras) {
  const achados = new Set()
  for (const p of new Set(palavras)) {
    for (const t of ix.porTitulo.get(p) || []) if (texto.includes(t.norm)) achados.add(t.i)
  }
  return achados
}

function formatar(s) {
  const unicos = (campo) => [...new Set(s.variantes.map((v) => v[campo]).filter(Boolean))]
  return {
    titulo: s.title,
    banda: s.artist,
    tons: unicos('tom'),
    bpms: unicos('bpm'),
    versoes: unicos('versao'),
    link: SITE + s.slug,
  }
}

// Devolve { itens, tipo }: tipo = 'titulo' (achou a musica pedida), 'banda' (so a banda) ou 'nenhum'.
export function buscarAcervo(textoDoCliente) {
  indice = indice || montarIndice()
  const norm = normalizar(textoDoCliente)
  if (!norm) return { itens: [], tipo: 'nenhum' }
  const palavras = norm.split(' ')
  const conjunto = new Set(palavras)
  const bandas = bandasCitadas(indice, conjunto)
  const titulos = titulosCitados(indice, ` ${norm} `, palavras)
  const pontos = new Map()
  for (const i of titulos) pontos.set(i, 10 + (bandas.get(normalizar(songs[i].artist)) || 0))
  if (titulos.size === 0 || bandas.size > 0) {
    for (const [nb, forca] of bandas) {
      for (const i of indice.bandas.get(nb).musicas) if (!pontos.has(i)) pontos.set(i, forca)
    }
  }
  const ordem = [...pontos].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, LIMITE)
  const tipo = titulos.size > 0 ? 'titulo' : ordem.length > 0 ? 'banda' : 'nenhum'
  return { itens: ordem.map(([i]) => formatar(songs[i])), tipo }
}

export function buscarNoAcervo(textoDoCliente) {
  return buscarAcervo(textoDoCliente).itens
}

// So para medir o custo da primeira busca nos testes.
export function zerarIndiceParaTeste() {
  indice = null
}
