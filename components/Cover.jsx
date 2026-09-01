// Capas no espírito de encarte de disco: tom sobre tom, sem gradiente colorido.
const TONES = [
  { bg: '#17130F', ink: '#EFE9E2', mark: '#A8431E' },
  { bg: '#1D1A17', ink: '#EDE7E0', mark: '#7C7168' },
  { bg: '#221A15', ink: '#F0E8E0', mark: '#A8431E' },
  { bg: '#15171A', ink: '#E8EAEC', mark: '#6E7A85' },
  { bg: '#1A1512', ink: '#EFE8E1', mark: '#8A6A4F' },
  { bg: '#101312', ink: '#E7ECEA', mark: '#5F7A70' },
]

export default function Cover({ song, className = '', rounded = '' }) {
  const t = TONES[song.seed % TONES.length]
  const angle = 12 + (song.seed % 5) * 14
  const shift = 18 + (song.seed % 7) * 6

  return (
    <div
      className={`relative flex flex-col justify-end overflow-hidden ${rounded} ${className}`}
      style={{ background: t.bg }}
      role="img"
      aria-label={`Capa de ${song.title}, de ${song.artist}`}
    >
      {/* faixa tonal diagonal — textura, não decoração colorida */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(${angle}deg, rgba(255,255,255,.05) 0 1px, transparent 1px ${shift}px)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-[18%] -top-[22%] h-[70%] w-[70%] rounded-full"
        style={{ background: t.mark, opacity: 0.16 }}
      />

      <div className="relative flex h-full flex-col justify-between p-[7%]">
        <span
          className="font-semibold uppercase leading-none tracking-[0.16em]"
          style={{ color: t.ink, opacity: 0.5, fontSize: 'clamp(7px, 6.5%, 11px)' }}
        >
          VS · Multitrack
        </span>

        <span className="block">
          <span
            className="block font-display leading-[1.12]"
            style={{ color: t.ink, fontSize: 'clamp(13px, 13%, 26px)' }}
          >
            {song.title}
          </span>
          <span
            className="mt-[4%] block leading-tight"
            style={{ color: t.ink, opacity: 0.55, fontSize: 'clamp(9px, 7.5%, 13px)' }}
          >
            {song.artist}
          </span>
        </span>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)' }}
      />
    </div>
  )
}
