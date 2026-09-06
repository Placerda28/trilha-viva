import { ImageResponse } from 'next/og'

// O Next nao aceita SVG em apple-icon, entao o icone da tela inicial do iPhone
// e gerado por codigo. O satori nao tem circle nem clipPath, entao o disco e
// uma div redonda e os canais sao divs dentro dela — mesma geometria do
// LogoMark e do app/icon.svg.
export const runtime = 'nodejs'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const INK = '#0D0D0D'
const PAPER = '#FFFFFF'
const SIGNAL = '#E5152D'

const CANAIS = [
  { x: 7.4, h: 19.7 },
  { x: 14.77, h: 34.46 },
  { x: 22.15, h: 49.23 },
  { x: 29.54, h: 29.54, cue: true },
  { x: 36.92, h: 44.31 },
  { x: 44.31, h: 24.62 },
  { x: 51.69, h: 12.31 },
]

export default function AppleIcon() {
  const u = 180 / 64
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          borderRadius: 180,
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
    ),
    size
  )
}
