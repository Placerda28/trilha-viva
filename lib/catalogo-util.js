// Funções puras das listas do acervo. Sem importar o catálogo de propósito:
// os componentes de cliente (busca, filtros, capa) usam este arquivo, e
// importar catalog.js ou ficha.js aqui levaria o acervo inteiro para o
// JavaScript do navegador.

/** Faixas de andamento: as mesmas dos textos da ficha (lenta até 80, média até 115). */
export const FAIXAS_BPM = [
  { id: 'lenta', rotulo: 'Até 80' },
  { id: 'media', rotulo: '81 a 115' },
  { id: 'rapida', rotulo: 'Acima de 115' },
]

export const naFaixa = (bpm, faixa) =>
  !faixa || (faixa === 'lenta' ? bpm <= 80 : faixa === 'media' ? bpm > 80 && bpm <= 115 : bpm > 115)

/** Sem acento e em minúsculas, para a busca achar "oracao" em "Oração". */
export const plano = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** "AC" para "A Casa É Sua", "OA" para "Ousado Amor": as iniciais da capa quando não há capa. */
export function sigla(titulo) {
  const palavras = titulo.split(/\s+/).filter((w) => w.length > 2 || /\d/.test(w))
  const letras = palavras
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return letras || titulo.slice(0, 2).toUpperCase()
}

/** Desfaz a tupla de `lib/catalogo-lista.js` em um objeto de leitura fácil. */
export const musicaDaTupla = ([slug, titulo, artista, estilo, tom, bpm, convidado], estilos) => ({
  slug,
  titulo,
  artista,
  estilo: estilos[estilo] ?? '',
  tom,
  bpm,
  convidado,
})
