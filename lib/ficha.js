// ARQUIVO GERADO. Não edite à mão. Rode: node scripts/levantamento/gerar-ficha.mjs
// Tupla: BPM, tom, compasso, segundos, índices de canais, fonte BPM, fonte tom.
import { parte as p0 } from './ficha-dados-1.js'
import { parte as p1 } from './ficha-dados-2.js'
export const FICHAS = {...p0,...p1}
export const CANAIS = JSON.parse(`["Clique","Guia","Bateria","Percussão","Baixo","Guitarra / Violão","Teclado / Piano","Órgão","Sintetizador","Pads","Cordas","Sopros","Banjo","Bandolim","Dulcimer","Lap Steel","Mellotron","Vocal principal","Backing vocals","Loops","Efeitos"]`)
const FONTES = ['arquivo', 'multitracks', 'pesquisa']
export function getFicha(slug) {
  if (!Object.hasOwn(FICHAS, slug)) return null
  const [bpm = null, tom = null, compasso = null, duracaoSeg = null, canais = null, fonteBpm = null, fonteTom = null] = FICHAS[slug]
  return { bpm, tom, compasso, duracaoSeg, canais: canais === null ? null : canais.map(i => CANAIS[i]),
    fonteBpm: FONTES[fonteBpm] ?? null, fonteTom: FONTES[fonteTom] ?? null }
}
