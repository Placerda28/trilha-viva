// Linha de tendência de 80×24, sem eixo: traço preto de 1,5 px e o último
// ponto em vermelho (o "corte" da marca, em detalhe). Serve só para dar a
// forma da série; o valor exato está no gráfico grande.
const L = 80
const A = 24
const PAD = 3

export default function Minilinha({ serie, rotulo = 'Tendência no período', className = '' }) {
  if (!serie || serie.length < 2) return null
  const menor = Math.min(...serie)
  const maior = Math.max(...serie)
  const faixa = maior - menor || 1
  const pontos = serie.map((v, i) => [
    PAD + (i / (serie.length - 1)) * (L - 2 * PAD),
    A - PAD - ((v - menor) / faixa) * (A - 2 * PAD),
  ])
  const ultimo = pontos[pontos.length - 1]
  return (
    <svg
      viewBox={'0 0 ' + L + ' ' + A}
      role="img"
      aria-label={rotulo}
      className={'h-6 w-[72px] shrink-0 sm:w-20 ' + className}
    >
      <polyline
        points={pontos.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}
        fill="none"
        stroke="#0D0D0D"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={ultimo[0]} cy={ultimo[1]} r="2.5" fill="#E5152D" />
    </svg>
  )
}
