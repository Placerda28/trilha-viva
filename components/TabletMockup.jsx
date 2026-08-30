const CHANNELS = [
  { name: 'CLIQUE', short: 'CLK', level: 72, color: '#F97316', tag: 'retorno' },
  { name: 'GUIA', short: 'GUI', level: 64, color: '#FBBF24', tag: 'retorno' },
  { name: 'BATERIA', short: 'BAT', level: 86, color: '#38BDF8' },
  { name: 'BAIXO', short: 'BSS', level: 78, color: '#60A5FA' },
  { name: 'TECLADO', short: 'KEY', level: 68, color: '#A78BFA' },
  { name: 'GUITARRA', short: 'GTR', level: 74, color: '#34D399' },
  { name: 'PADS', short: 'PAD', level: 52, color: '#22D3EE' },
  { name: 'VOCAL', short: 'VOX', level: 82, color: '#F472B6' },
]

function Wave({ color, seed }) {
  const bars = Array.from({ length: 46 }, (_, i) => {
    const n = (seed * (i + 5) * 37) % 100
    return 18 + (n / 100) * 82
  })
  return (
    <div className="flex h-full items-center gap-[1.5px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-full rounded-[1px]"
          style={{ height: `${h}%`, background: color, opacity: 0.55 + (i % 4) * 0.11 }}
        />
      ))}
    </div>
  )
}

export default function TabletMockup({ className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[26px] bg-gradient-to-b from-[#2A2F3A] to-[#14171F] p-[10px] shadow-[0_40px_80px_-30px_rgba(4,8,20,.75)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[18px] bg-[#0B0E16]">
          <div className="flex items-center justify-between border-b border-white/[.07] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-gradient-to-br from-brand-500 to-flame-500 text-[9px] font-bold text-white">
                TV
              </span>
              <span className="text-[10.5px] font-semibold tracking-tight text-white/85">
                Ousado Amor — Isaías Saad
              </span>
              <span className="rounded-full bg-white/10 px-1.5 py-[1px] text-[8px] font-semibold tracking-wide text-white/60">
                MULTITRACK
              </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-medium text-white/45">
              <span className="rounded bg-white/[.07] px-1.5 py-[2px]">Tom G</span>
              <span className="rounded bg-white/[.07] px-1.5 py-[2px]">72 BPM</span>
              <span className="rounded bg-flame-500/20 px-1.5 py-[2px] text-flame-400">● REC</span>
            </div>
          </div>

          <div className="space-y-[3px] px-3 py-2.5">
            {CHANNELS.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span
                  className="w-[52px] shrink-0 truncate text-[8.5px] font-semibold tracking-wide"
                  style={{ color: c.color }}
                >
                  {c.name}
                </span>
                <div className="h-[18px] flex-1 overflow-hidden rounded-[3px] bg-white/[.045] px-[3px]">
                  <Wave color={c.color} seed={i * 13 + 7} />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[.07] bg-[#080B12] px-3 pb-3 pt-2.5">
            <div className="flex items-end justify-between gap-[6px]">
              {CHANNELS.map((c) => (
                <div key={c.name} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="relative h-[54px] w-[7px] rounded-full bg-white/[.08]">
                    <div
                      className="absolute bottom-0 w-full rounded-full"
                      style={{ height: `${c.level}%`, background: c.color, opacity: 0.85 }}
                    />
                    <div
                      className="absolute left-1/2 h-[9px] w-[15px] -translate-x-1/2 rounded-[3px] bg-[#E5E7EB] shadow"
                      style={{ bottom: `calc(${c.level}% - 4px)` }}
                    />
                  </div>
                  <span className="truncate text-[7.5px] font-semibold tracking-wide text-white/55">
                    {c.short}
                  </span>
                  {c.tag ? (
                    <span className="rounded-[3px] bg-flame-500/20 px-1 py-[1px] text-[6.5px] font-bold uppercase tracking-wide text-flame-400">
                      fone
                    </span>
                  ) : (
                    <span className="rounded-[3px] bg-white/[.07] px-1 py-[1px] text-[6.5px] font-bold uppercase tracking-wide text-white/40">
                      pa
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2.5 border-t border-white/[.07] pt-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="#fff" aria-hidden="true">
                  <path d="M1 0.5v9l8-4.5z" />
                </svg>
              </span>
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full w-[38%] rounded-full bg-gradient-to-r from-brand-500 to-flame-500" />
              </span>
              <span className="font-mono text-[8.5px] tracking-tight text-white/50">01:47 / 04:32</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Saída 1 · fones
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">Clique + Guia</p>
      </div>
      <div className="absolute -right-3 -top-4 hidden rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Saída 2 · PA
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">Mix da banda</p>
      </div>
    </div>
  )
}
