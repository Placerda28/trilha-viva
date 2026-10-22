import { ImageResponse } from 'next/og'
import { INK, PAPER, MUTED, LINE, ACCENT, Cabecalho } from '@/lib/og-marca'

export const runtime = 'nodejs'
export const alt = 'Trilha Viva — Multitracks Gospel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        <Cabecalho />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, color: INK, lineHeight: 1.08, letterSpacing: -2 }}>
            2.000 multitracks gospel
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
