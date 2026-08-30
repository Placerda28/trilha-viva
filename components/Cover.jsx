const PALETTES = [
  ['#1D4ED8', '#7C3AED', '#0EA5E9'],
  ['#0F766E', '#22C55E', '#065F46'],
  ['#B45309', '#F97316', '#DC2626'],
  ['#4C1D95', '#DB2777', '#7C3AED'],
  ['#0C4A6E', '#0EA5E9', '#1E40AF'],
  ['#7C2D12', '#F59E0B', '#B91C1C'],
  ['#1E293B', '#475569', '#0F172A'],
  ['#831843', '#F43F5E', '#9D174D'],
]

function initials(title) {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(w))
  const letters = (words.length ? words : title.split(/\s+/)).slice(0, 2).map((w) => w[0])
  return letters.join('').toUpperCase()
}

export default function Cover({ song, className = '', rounded = 'rounded-xl' }) {
  const p = PALETTES[song.seed % PALETTES.length]
  const uid = `c${song.seed}${song.hue}`
  const rot = (song.seed % 60) - 30
  const bars = Array.from({ length: 22 }, (_, i) => {
    const n = (song.seed * (i + 3)) % 100
    return 12 + (n / 100) * 62
  })

  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label={`Capa de ${song.title}`}>
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor={p[0]} />
            <stop offset="0.55" stopColor={p[1]} />
            <stop offset="1" stopColor={p[2]} />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="0.3" cy="0.15" r="0.9">
            <stop stopColor="#fff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-clip`}>
            <rect width="400" height="400" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="400" height="400" fill={`url(#${uid}-bg)`} />
          <rect width="400" height="400" fill={`url(#${uid}-glow)`} />

          <g transform={`rotate(${rot} 200 200)`} opacity="0.22">
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx="200"
                cy="200"
                r={70 + i * 58}
                fill="none"
                stroke="#fff"
                strokeWidth="1.4"
              />
            ))}
          </g>

          <g opacity="0.5">
            {bars.map((h, i) => (
              <rect
                key={i}
                x={16 + i * 17.2}
                y={330 - h}
                width="7"
                height={h}
                rx="3.5"
                fill="#fff"
                opacity={0.35 + (i % 5) * 0.13}
              />
            ))}
          </g>

          <text
            x="30"
            y="120"
            fill="#fff"
            fillOpacity="0.92"
            fontSize="86"
            fontWeight="800"
            letterSpacing="-4"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {initials(song.title)}
          </text>
          <text
            x="32"
            y="372"
            fill="#fff"
            fillOpacity="0.8"
            fontSize="15"
            fontWeight="600"
            letterSpacing="2.6"
            fontFamily="Inter, system-ui, sans-serif"
          >
            MULTITRACK
          </text>
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
    </div>
  )
}
