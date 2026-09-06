import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Trilha Viva — Multitracks Gospel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#0D0D0D'
const PAPER = '#F2F3F5'
const MUTED = '#5C5C5C'
const LINE = '#E0E2E6'
const ACCENT = '#C40F24' // vermelho de texto, para o preco
const SIGNAL = '#E5152D' // vermelho de traco, para o canal de clique da marca

// A marca desenhada para o satori: disco redondo com os canais dentro. Mesma
// geometria do LogoMark e do app/icon.svg.
const CANAIS = [
  { x: 7.4, h: 19.7 },
  { x: 14.77, h: 34.46 },
  { x: 22.15, h: 49.23 },
  { x: 29.54, h: 29.54, cue: true },
  { x: 36.92, h: 44.31 },
  { x: 44.31, h: 24.62 },
  { x: 51.69, h: 12.31 },
]

function Mark({ size: s = 64 }) {
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

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: '68px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Mark size={58} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, color: INK, letterSpacing: -0.5 }}>Trilha Viva</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, letterSpacing: 4 }}>
              MULTITRACKS GOSPEL
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, color: INK, lineHeight: 1.08, letterSpacing: -2 }}>
            4.000 multitracks gospel
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 8 }}>
            <div style={{ fontSize: 40, color: MUTED, letterSpacing: -1 }}>por</div>
            <div style={{ fontSize: 96, color: ACCENT, letterSpacing: -4, lineHeight: 1 }}>
              R$ 89,90
            </div>
            <div
              style={{
                fontSize: 30,
                color: MUTED,
                textDecoration: 'line-through',
                display: 'flex',
              }}
            >
              R$ 899,00
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderTop: `1px solid ${LINE}`,
            paddingTop: 26,
            fontSize: 26,
            color: MUTED,
          }}
        >
          Clique, guia e canais separados · pagamento único · acesso vitalício
        </div>
      </div>
    ),
    size
  )
}
