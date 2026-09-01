import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Trilha Viva — Multitracks Gospel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#14110F'
const PAPER = '#FBFAF8'
const MUTED = '#6B615A'
const LINE = '#E3DED7'
const ACCENT = '#A8431E'

// A marca desenhada com retângulos — mesma geometria do LogoMark do site.
function Mark({ size: s = 64 }) {
  const u = s / 64
  const bar = (left, top, w, h, fill, opacity = 1) => (
    <div
      key={`${left}-${top}`}
      style={{
        position: 'absolute',
        left: left * u,
        top: top * u,
        width: w * u,
        height: h * u,
        background: fill,
        opacity,
        borderRadius: 2 * u,
      }}
    />
  )
  return (
    <div style={{ position: 'relative', display: 'flex', width: s, height: s }}>
      {bar(13, 20, 5, 24, INK, 0.45)}
      {bar(29, 11, 6, 42, INK)}
      {bar(21, 22, 22, 6, ACCENT)}
      {bar(46, 20, 5, 24, INK, 0.45)}
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
