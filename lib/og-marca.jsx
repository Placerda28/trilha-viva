// Cores e marca desenhadas para o satori (next/og), usadas pelas imagens de
// compartilhamento: a da home (app/opengraph-image.jsx) e a capa de cada artigo.
export const INK = '#0D0D0D'
export const PAPER = '#F2F3F5'
export const MUTED = '#5C5C5C'
export const LINE = '#E0E2E6'
export const ACCENT = '#C40F24' // vermelho de texto, para o preco
export const SIGNAL = '#E5152D' // vermelho de traco, para o canal de clique da marca

// Disco redondo com os canais dentro. Mesma geometria do LogoMark e do app/icon.svg.
const CANAIS = [
  { x: 7.4, h: 19.7 },
  { x: 14.77, h: 34.46 },
  { x: 22.15, h: 49.23 },
  { x: 29.54, h: 29.54, cue: true },
  { x: 36.92, h: 44.31 },
  { x: 44.31, h: 24.62 },
  { x: 51.69, h: 12.31 },
]

export function Mark({ size: s = 64 }) {
  const u = s / 64
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: s,
        height: s,
        borderRadius: s,
        background: INK,
        overflow: 'hidden',
      }}
    >
      {CANAIS.map((c) => (
        <div
          key={c.x}
          style={{
            position: 'absolute',
            left: c.x * u,
            top: (32 - c.h / 2) * u,
            width: 3.94 * u,
            height: c.h * u,
            background: c.cue ? SIGNAL : PAPER,
          }}
        />
      ))}
    </div>
  )
}

export function Cabecalho() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <Mark size={58} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, color: INK, letterSpacing: -0.5 }}>Trilha Viva</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, letterSpacing: 4 }}>
          MULTITRACKS GOSPEL
        </div>
      </div>
    </div>
  )
}
