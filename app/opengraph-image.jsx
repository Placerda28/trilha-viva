import { ImageResponse } from 'next/og'

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
          background: '#ffffff',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: 'linear-gradient(135deg,#2B5CE6,#7C3AED,#F97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            TV
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#0A0A0B', letterSpacing: -1 }}>
              Trilha Viva
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#8E8E98', letterSpacing: 3 }}>
              MULTITRACKS GOSPEL
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              color: '#0A0A0B',
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            4.000 multitracks gospel.
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: '#EA580C',
            }}
          >
            Um pacote só.
          </div>
          <div style={{ fontSize: 30, color: '#61616B', marginTop: 22 }}>
            Clique, guia e canais separados · acesso vitalício
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              background: '#0A0A0B',
              color: '#fff',
              fontSize: 28,
              fontWeight: 700,
              padding: '16px 34px',
              borderRadius: 999,
              display: 'flex',
            }}
          >
            R$ 89,90
          </div>
          <div style={{ fontSize: 26, color: '#8E8E98', textDecoration: 'line-through', display: 'flex' }}>
            R$ 899,00
          </div>
        </div>
      </div>
    ),
    size
  )
}
