// Fundo do topo da página inicial (12/10/2026). TODOS os ajustes do efeito
// ficam aqui: cores, quanto vermelho, quanto feixe de luz e a velocidade.
// O mesmo arquivo alimenta o fundo estático em CSS (o que aparece primeiro e
// fica de reserva) e o animado, para os dois terem a mesma cara.
export const heroGradiente = {
  base: '#0D0D0D', // o mesmo preto do cabeçalho (ink): topo e cabeçalho viram uma peça só
  vinho: '#3A0A12',
  vermelho: '#E5152D', // vermelho da marca (signal)
  luz: '#F3E6E2', // feixe claro quente, como nos anúncios

  // De 0 a 1. Mais alto = mais vermelho / feixe mais forte.
  forcaVermelho: 0.24,
  forcaLuz: 0.45,

  // Velocidade do movimento. 1 = a do Spell UI (rápida demais para cá).
  velocidade: 0.22,
}

// "#RRGGBB" -> "r, g, b", para usar dentro de rgba() no CSS.
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

const g = heroGradiente

// Fundo estático: faixas diagonais com as mesmas cores do animado.
export const fundoEstatico = [
  `linear-gradient(118deg, transparent 52%, rgba(${rgb(g.luz)}, ${0.16 * g.forcaLuz}) 60%, transparent 68%)`,
  `linear-gradient(118deg, ${g.base} 18%, ${g.vinho} 42%, rgba(${rgb(g.vermelho)}, ${0.5 * g.forcaVermelho}) 54%, ${g.vinho} 66%, ${g.base} 88%)`,
].join(', ')
