// A marca é o próprio objeto do produto: uma sessão de multitrack vista de perfil.
// Nove barras — as duas primeiras são o clique e a guia, destacadas, que é o que
// separa uma multitrack de um playback.
const BARS = [0.42, 0.42, 0.68, 0.86, 1, 0.8, 0.6, 0.9, 0.5]

export function LogoMark({ size = 26, tone = 'ink', className = '' }) {
  const base = tone === 'light' ? 'rgba(255,255,255,.75)' : '#0D0D0D'
  const cue = tone === 'light' ? '#FF5566' : '#E5152D'
  return (
    <span
      className={`inline-flex items-end gap-[2.5px] ${className}`}
      style={{ height: size }}
      aria-hidden="true"
    >
      {BARS.map((h, i) => (
        <span
          key={i}
          className="w-[3px]"
          style={{ height: `${h * 100}%`, background: i < 2 ? cue : base }}
        />
      ))}
    </span>
  )
}

export function Logo({ tone = 'ink', markSize = 24 }) {
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

export function LogoInverse({ markSize = 24 }) {
  return <Logo tone="light" markSize={markSize} />
}
