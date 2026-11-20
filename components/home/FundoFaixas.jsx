// Fundo animado do topo da home (MUDANÇAS §3): 7 faixas de onda de multitrack
// andando devagar para o lado. A 4ª é o clique, em vermelho. Opacidade baixa
// (0,09; o clique 0,32), 70 a 124 s por volta, linear.
//
// Só CSS: cada faixa é uma imagem SVG que se repete e anda com transform (não
// repinta, roda no compositor). Sem JavaScript no navegador, sem WebGL. O
// movimento para com "reduzir movimento".
//
// As ondas são desenhadas uma vez, com números de sorteio fixos (mesma imagem a
// cada build), e ficam no HTML da página estática.

const W = 640
const H = 28
const FAIXAS = 7
const CLIQUE = 3

let pronto = null

function gerar() {
  let semente = 7
  const sorteio = () => (semente = (semente * 9301 + 49297) % 233280) / 233280
  const lista = []
  for (let i = 0; i < FAIXAS; i += 1) {
    const clique = i === CLIQUE
    let tracos = ''
    for (let x = 2; x < W; x += clique ? 20 : 4) {
      const h = clique ? 6 : Math.max(1.5, (0.3 + 0.7 * Math.abs(Math.sin(x / (37 + i * 11)))) * (3 + sorteio() * 9))
      tracos += `M${x + 1} ${(H / 2 - h).toFixed(1)}v${(2 * h).toFixed(1)}`
    }
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>` +
      `<path d='${tracos}' stroke='${clique ? '#E5152D' : '#FFFFFF'}' stroke-width='2' fill='none'/></svg>`
    lista.push({
      imagem: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      opacidade: clique ? 0.32 : 0.09,
      volta: 70 + i * 9,
    })
  }
  return lista
}

const CSS = `@keyframes tv-faixa{to{transform:translateX(-${W}px)}}
.tv-faixa{animation:tv-faixa linear infinite;will-change:transform}
@media (prefers-reduced-motion:reduce){.tv-faixa{animation:none;will-change:auto}}`

const MASCARA = 'linear-gradient(90deg, transparent 0%, #000 18%, #000 62%, transparent 100%)'

export default function FundoFaixas() {
  if (!pronto) pronto = gerar()
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-3.5 overflow-hidden pb-12"
      style={{ WebkitMaskImage: MASCARA, maskImage: MASCARA }}
    >
      <style>{CSS}</style>
      {pronto.map((f, i) => (
        <div
          key={i}
          className="tv-faixa shrink-0"
          style={{
            height: H,
            width: `calc(100% + ${W}px)`,
            backgroundImage: f.imagem,
            backgroundRepeat: 'repeat-x',
            opacity: f.opacidade,
            animationDuration: `${f.volta}s`,
          }}
        />
      ))}
    </div>
  )
}
