// A marca e o produto visto de perfil: sete canais de uma multitrack dentro de
// um disco, e o quarto em vermelho — o canal de clique, que e o que separa uma
// multitrack de um playback.
//
// Uma geometria so, a mesma de app/icon.svg, do apple-icon e do open graph:
// disco de raio 32 sangrando o viewBox de 64, canais de 3.94 de largura
// centrados na vertical.
//
// **O disco inverte com o fundo** (decisao do Paulo): sobre fundo claro o disco
// e preto com canais brancos, que e o selo do favicon; sobre fundo preto vai a
// versao invertida — disco branco com canais pretos. O clique fica vermelho nos
// dois casos, porque e a marca do produto. No site o cabecalho e o rodape sao
// pretos, entao os dois usam tone="light" e mostram o disco branco.
//
// Nao ha clipPath: a barra mais extrema (x=7.4) cabe folgada na corda do
// circulo naquele ponto, entao nao ha nada para recortar — e um clipPath
// precisaria de id unico por instancia, que e divergencia de hidratacao
// esperando para acontecer.
const CANAIS = [
  { x: 7.4, h: 19.7 },
  { x: 14.77, h: 34.46 },
  { x: 22.15, h: 49.23 },
  { x: 29.54, h: 29.54, cue: true },
  { x: 36.92, h: 44.31 },
  { x: 44.31, h: 24.62 },
  { x: 51.69, h: 12.31 },
]

const CUE = '#E5152D'

export function LogoMark({ size = 26, tone = 'ink', className = '' }) {
  const light = tone === 'light'
  const disco = light ? '#FFFFFF' : '#0D0D0D'
  const canal = light ? '#0D0D0D' : '#FFFFFF'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="32" fill={disco} />
      {CANAIS.map((c) => (
        <rect
          key={c.x}
          x={c.x}
          y={32 - c.h / 2}
          width="3.94"
          height={c.h}
          fill={c.cue ? CUE : canal}
        />
      ))}
    </svg>
  )
}

// markSize 28, nao 24: e o tamanho em que o disco fica um degrau mais alto que
// as letras, que e a proporcao do mockup que o Paulo mandou.
export function Logo({ tone = 'ink', markSize = 28 }) {
  const light = tone === 'light'
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={markSize} tone={tone} />
      <span
        className={`text-[19px] font-extrabold tracking-[-0.03em] ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        Trilha Viva
      </span>
    </span>
  )
}

export function LogoInverse({ markSize = 28 }) {
  return <Logo tone="light" markSize={markSize} />
}
