const ACCENT = '#C4653F'
const NEUTRAL = '#A9A29B'

const CHANNELS = [
  { name: 'CLIQUE', short: 'CLK', level: 72, fone: true },
  { name: 'GUIA', short: 'GUI', level: 64, fone: true },
  { name: 'BATERIA', short: 'BAT', level: 86 },
  { name: 'BAIXO', short: 'BSS', level: 78 },
  { name: 'TECLADO', short: 'KEY', level: 68 },
  { name: 'GUITARRA', short: 'GTR', level: 74 },
  { name: 'PADS', short: 'PAD', level: 52 },
  { name: 'VOCAL', short: 'VOX', level: 82 },
]

function Wave({ color, seed }) {
  const bars = Array.from({ length: 52 }, (_, i) => {
    const n = (seed * (i + 5) * 37) % 100
    return 16 + (n / 100) * 84
  })
  return (
    <div className="flex h-full items-center gap-[1px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-full"
          style={{ height: `${h}%`, background: color, opacity: 0.42 + (i % 4) * 0.12 }}
        />
      ))}
    </div>
  )
}

export default function TabletMockup({ className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[14px] bg-[#22201E] p-[9px] shadow-[0_24px_60px_-28px_rgba(20,17,15,.55)]">
        <div className="overflow-hidden rounded-[8px] bg-[#0E0D0C]">
          {/* barra do app */}
          <div className="flex items-center justify-between border-b border-white/[.08] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[10.5px] font-medium tracking-tight text-white/80">
                Ousado Amor — Isaías Saad
              </span>
              <span className="text-[8.5px] uppercase tracking-[0.14em] text-white/35">Multitrack</span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-white/40">
              <span>Tom G</span>
              <span>72 BPM</span>
            </div>
          </div>

          {/* linha do tempo */}
          <div className="space-y-[4px] px-3.5 py-3">
            {CHANNELS.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2.5">
                <span
                  className="w-[54px] shrink-0 truncate text-[8px] font-semibold tracking-[0.06em]"
                  style={{ color: c.fone ? ACCENT : 'rgba(255,255,255,.42)' }}
                >
                  {c.name}
                </span>
                <div className="h-[17px] flex-1 overflow-hidden bg-white/[.035] px-[3px]">
                  <Wave color={c.fone ? ACCENT : NEUTRAL} seed={i * 13 + 7} />
                </div>
              </div>
            ))}
          </div>

          {/* mesa */}
          <div className="border-t border-white/[.08] bg-[#0A0908] px-3.5 pb-3.5 pt-3">
            <div className="flex items-end justify-between gap-[7px]">
              {CHANNELS.map((c) => (
                <div key={c.name} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="relative h-[52px] w-[5px] bg-white/[.08]">
                    <div
                      className="absolute bottom-0 w-full"
                      style={{
                        height: `${c.level}%`,
                        background: c.fone ? ACCENT : 'rgba(255,255,255,.55)',
                      }}
                    />
                    <div
                      className="absolute left-1/2 h-[8px] w-[14px] -translate-x-1/2 bg-[#E8E3DC]"
                      style={{ bottom: `calc(${c.level}% - 4px)` }}
                    />
                  </div>
                  <span className="truncate text-[7px] font-semibold tracking-[0.08em] text-white/45">
                    {c.short}
                  </span>
                  <span
                    className="text-[6.5px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: c.fone ? ACCENT : 'rgba(255,255,255,.28)' }}
                  >
                    {c.fone ? 'fone' : 'pa'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3.5 flex items-center gap-3 border-t border-white/[.08] pt-3">
              <span className="flex h-[18px] w-[18px] items-center justify-center bg-white/90">
                <svg width="7" height="7" viewBox="0 0 10 10" fill="#0A0908" aria-hidden="true">
                  <path d="M1 0.5v9l8-4.5z" />
                </svg>
              </span>
              <span className="h-[2px] flex-1 bg-white/[.12]">
                <span className="block h-full w-[38%]" style={{ background: ACCENT }} />
              </span>
              <span className="font-mono text-[8px] text-white/40">01:47 / 04:32</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
