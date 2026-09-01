import { ImageResponse } from 'next/og'

// O Next não aceita SVG em apple-icon, então o ícone da tela inicial do iPhone
// é gerado por código — mesma cruz do favicon, desenhada com retângulos.
export const runtime = 'nodejs'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const INK = '#14110F'
const PAPER = '#FBFAF8'
const ACCENT = '#C4653F'

export default function AppleIcon() {
  const u = 180 / 64
  const bar = (left, top, w, h, fill) => (
    <div
      key={`${left}-${top}`}
      style={{
        position: 'absolute',
        left: left * u,
        top: top * u,
        width: w * u,
        height: h * u,
        background: fill,
        borderRadius: 1.5 * u,
      }}
    />
  )

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          background: INK,
        }}
      >
        {bar(26, 6, 12, 52, PAPER)}
        {bar(12, 19, 40, 12, ACCENT)}
      </div>
    ),
    size
  )
}
