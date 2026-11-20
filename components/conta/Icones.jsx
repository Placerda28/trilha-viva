// Dois desenhos Lucide que o mapa de components/ds/Icone.jsx ainda não tem
// (busca e filtro). Quando subirem para lá, estes dois arquivos saem.
const props = (tamanho, traco) => ({
  width: tamanho,
  height: tamanho,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: traco,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
})

export function IconeBusca({ tamanho = 20, traco = 1.75, className }) {
  return (
    <svg {...props(tamanho, traco)} className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function IconeFiltro({ tamanho = 18, traco = 1.75, className }) {
  return (
    <svg {...props(tamanho, traco)} className={className}>
      <path d="M3 6h18M7 12h10M10 18h4" />
    </svg>
  )
}
