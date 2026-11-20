import { songs, categorias } from './catalog'
import { artistSlug, getArtist } from './artists'
import { musicaDaTupla } from './catalogo-util'
import { FICHAS } from './ficha'

// Dados enxutos para as listas do acervo (/musicas, /artistas/[slug], /bpm,
// coleções). Só lê os arquivos gerados (catalog.js e ficha.js), nunca escreve.
// SÓ para componentes de servidor: importa o acervo inteiro. O que o navegador
// precisa (filtros, capa) está em catalogo-util.js.
//
// Cada música vira uma lista curta, não um objeto: o /musicas leva as 1.563
// dentro do HTML para o navegador filtrar, e o nome de cada campo, repetido
// 1.563 vezes, pesava mais que os dados.
//   [slug, título, artista, índice do estilo, tom ('' se não há), BPM (0 se não há), convidado ('' se não há)]
// O índice do estilo aponta para `ESTILOS`.

export const ESTILOS = categorias

const ORDEM_TOM = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'Bb', 'B']
const posicao = (tom) => {
  const i = ORDEM_TOM.indexOf(tom.replace(/m$/, ''))
  return i < 0 ? ORDEM_TOM.length : i
}
// C, C#, Db, D... com os tons maiores antes dos menores da mesma nota.
const porTom = (a, b) => posicao(a) - posicao(b) || Number(a.endsWith('m')) - Number(b.endsWith('m'))
export const ordenarTons = (tons) => [...new Set(tons)].filter(Boolean).sort(porTom)

/** Tom e BPM da ficha, sem montar a ficha inteira (getFicha monta a lista de canais). */
export function tomEBpm(slug) {
  if (!Object.hasOwn(FICHAS, slug)) return ['', 0]
  const f = FICHAS[slug]
  return [f[1] ?? '', f[0] ?? 0]
}

export const tuplaDaMusica = (s) => {
  const [tom, bpm] = tomEBpm(s.slug)
  return [s.slug, s.title, s.artist, ESTILOS.indexOf(s.categoria), tom, bpm, s.tambem || '']
}

let acervo
/** O acervo inteiro em tuplas, mais os tons que existem nele. Montado uma vez por processo. */
export function acervoEmTuplas() {
  if (!acervo) {
    const musicas = songs.map(tuplaDaMusica)
    acervo = { musicas, tons: ordenarTons(musicas.map((m) => m[4])) }
  }
  return acervo
}

// ---- "Quem toca [música] também usa" (MUDANÇAS §13) -------------------------
// Primeiro as do mesmo artista (as de BPM mais próximo), depois as do mesmo
// estilo com BPM parecido (até 6 de diferença). Cada uma leva o motivo. Roda no
// build (a ficha é estática). Entre músicas igualmente próximas a escolha sai de
// um hash do par de slugs: sempre a mesma, mas não são sempre as mesmas
// primeiras do alfabeto em todas as fichas.
const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

let porEstilo
function musicasPorEstilo() {
  if (!porEstilo) {
    porEstilo = new Map()
    for (const s of songs) {
      if (!porEstilo.has(s.categoria)) porEstilo.set(s.categoria, [])
      porEstilo.get(s.categoria).push({ s, bpm: tomEBpm(s.slug)[1] })
    }
  }
  return porEstilo
}

export function musicasRelacionadas(song, n = 6, maxDoArtista = 3) {
  const bpm = tomEBpm(song.slug)[1]
  const sorteio = (s) => hash(`${song.slug}|${s.slug}`)
  const estilo = song.categoria.toLowerCase()
  const escolhidas = []
  const vistas = new Set([song.slug])
  const poe = (lista, motivo) => {
    for (const s of lista) {
      if (escolhidas.length >= n) return
      if (!vistas.has(s.slug)) {
        vistas.add(s.slug)
        escolhidas.push({ musica: musicaDaTupla(tuplaDaMusica(s), ESTILOS), motivo })
      }
    }
  }

  const doArtista = (getArtist(artistSlug(song.artist))?.songs ?? []).filter((s) => s.slug !== song.slug)
  const distancia = (b) => (bpm && b ? Math.abs(b - bpm) : Infinity)
  doArtista.sort((a, b) => distancia(tomEBpm(a.slug)[1]) - distancia(tomEBpm(b.slug)[1]) || sorteio(a) - sorteio(b))
  poe(doArtista.slice(0, maxDoArtista), 'mesmo artista')

  const doEstilo = (musicasPorEstilo().get(song.categoria) ?? []).filter(({ s }) => s.artist !== song.artist)
  if (bpm) {
    const parecidas = doEstilo
      .filter(({ bpm: b }) => b && Math.abs(b - bpm) <= 6)
      .sort((a, b) => Math.abs(a.bpm - bpm) - Math.abs(b.bpm - bpm) || sorteio(a.s) - sorteio(b.s))
    poe(parecidas.map(({ s }) => s), `${estilo}, BPM parecido`)
  }
  // Pouca coisa parecida (ou música sem BPM): completa com o mesmo estilo.
  poe(doEstilo.map(({ s }) => s).sort((a, b) => sorteio(a) - sorteio(b)), estilo)
  // Estilo pequeno demais: completa com mais do mesmo artista.
  poe(doArtista, 'mesmo artista')
  return escolhidas
}
