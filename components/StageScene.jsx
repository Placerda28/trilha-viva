export default function StageScene({ className = '', label = 'I WILL LIFT MY HANDS AND SING', id = 'st' }) {
  const heads = []
  let s = 7
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  for (let i = 0; i < 46; i++) {
    const x = 8 + rnd() * 784
    const row = Math.floor(rnd() * 3)
    const y = 372 + row * 14
    const r = 11 + rnd() * 5 - row * 1.5
    heads.push({ x, y, r, arm: rnd() > 0.55, tilt: rnd() * 24 - 12 })
  }

  return (
    <svg
      viewBox="0 0 800 450"
      className={className}
      role="img"
      aria-label="Igreja em momento de louvor com banda no palco e luzes"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="800" y2="450" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B1020" />
          <stop offset="0.5" stopColor="#101527" />
          <stop offset="1" stopColor="#070A14" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#93C5FD" stopOpacity="0.55" />
          <stop offset="1" stopColor="#93C5FD" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-beam2`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FDBA74" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FDBA74" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.42" r="0.55">
          <stop stopColor="#60A5FA" stopOpacity="0.35" />
          <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#3B82F6" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#6366F1" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0B1020" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="800" height="450" fill={`url(#${id}-sky)`} />
      <rect width="800" height="450" fill={`url(#${id}-halo)`} />

      <g style={{ mixBlendMode: 'screen' }}>
        <polygon points="120,20 150,20 300,340 190,340" fill={`url(#${id}-beam)`} />
        <polygon points="250,14 276,14 372,330 292,330" fill={`url(#${id}-beam2)`} />
        <polygon points="530,14 556,14 500,330 424,330" fill={`url(#${id}-beam)`} />
        <polygon points="660,20 690,20 604,340 500,340" fill={`url(#${id}-beam2)`} />
        <polygon points="400,10 414,10 420,320 388,320" fill={`url(#${id}-beam)`} />
      </g>

      <rect x="0" y="10" width="800" height="7" rx="3.5" fill="#1E293B" />
      {[120, 250, 400, 545, 672].map((x) => (
        <g key={x}>
          <rect x={x - 9} y="17" width="18" height="13" rx="3" fill="#334155" />
          <circle cx={x} cy="31" r="4.5" fill="#DBEAFE" opacity="0.9" />
        </g>
      ))}

      <rect x="196" y="86" width="410" height="150" rx="10" fill={`url(#${id}-wall)`} />
      <rect x="196" y="86" width="410" height="150" rx="10" fill="none" stroke="#38BDF8" strokeOpacity="0.22" />
      <text
        x="401"
        y="150"
        textAnchor="middle"
        fill="#E2E8F0"
        fillOpacity="0.75"
        fontSize="21"
        fontWeight="600"
        letterSpacing="3"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.split(' ').slice(0, 3).join(' ')}
      </text>
      <text
        x="401"
        y="182"
        textAnchor="middle"
        fill="#E2E8F0"
        fillOpacity="0.55"
        fontSize="21"
        fontWeight="600"
        letterSpacing="3"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.split(' ').slice(3).join(' ')}
      </text>

      <rect x="0" y="300" width="800" height="10" fill="#0B1220" />
      <rect x="0" y="310" width="800" height="140" fill="#05070E" />
      <rect x="0" y="306" width="800" height="120" fill={`url(#${id}-haze)`} />

      <g fill="#020409">
        <circle cx="401" cy="252" r="13" />
        <path d="M383 300v-24c0-11 8-19 18-19s18 8 18 19v24z" />
        <rect x="396" y="228" width="4" height="26" rx="2" transform="rotate(14 398 240)" />
        <circle cx="286" cy="258" r="11" />
        <path d="M270 300v-20c0-10 7-17 16-17s16 7 16 17v20z" />
        <circle cx="516" cy="258" r="11" />
        <path d="M500 300v-20c0-10 7-17 16-17s16 7 16 17v20z" />
        <rect x="486" y="282" width="62" height="6" rx="2" />
        <circle cx="612" cy="262" r="10" />
        <path d="M598 300v-18c0-9 6-15 14-15s14 6 14 15v18z" />
        <ellipse cx="640" cy="284" rx="19" ry="4" />
        <ellipse cx="576" cy="280" rx="16" ry="3.5" />
      </g>

      <g fill="#01030A">
        {heads.map((h, i) => (
          <g key={i}>
            {h.arm && (
              <rect
                x={h.x - 3}
                y={h.y - h.r - 40}
                width="6"
                height="44"
                rx="3"
                transform={`rotate(${h.tilt} ${h.x} ${h.y - h.r})`}
              />
            )}
            <circle cx={h.x} cy={h.y} r={h.r} />
            <path d={`M${h.x - h.r * 2} 450v-20c0-${h.r} ${h.r} -${h.r * 1.6} ${h.r * 2}-${h.r * 1.6}s${h.r * 2} ${h.r * 0.6} ${h.r * 2} ${h.r * 1.6}v20z`} />
          </g>
        ))}
      </g>
    </svg>
  )
}
