export function LogoMark({ size = 36, className = '', id = 'tv' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2B5CE6" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${id}-g)`} />
      <rect x="10" y="27" width="5" height="10" rx="2.5" fill="#fff" fillOpacity=".62" />
      <rect x="17.5" y="22" width="5" height="20" rx="2.5" fill="#fff" fillOpacity=".82" />
      <rect x="29.5" y="11" width="5.5" height="42" rx="2.75" fill="#fff" />
      <rect x="24" y="23" width="16.5" height="5.5" rx="2.75" fill="#fff" />
      <rect x="45" y="22" width="5" height="20" rx="2.5" fill="#fff" fillOpacity=".82" />
      <rect x="52.5" y="27" width="5" height="10" rx="2.5" fill="#fff" fillOpacity=".62" />
    </svg>
  )
}

export function Logo({ className = '', markSize = 34, id = 'tv' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} id={id} />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-ink">
          Trilha{' '}
          <span className="bg-gradient-to-r from-brand-600 to-flame-500 bg-clip-text text-transparent">
            Viva
          </span>
        </span>
        <span className="mt-[3px] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Multitracks Gospel
        </span>
      </span>
    </span>
  )
}

export function LogoInverse({ markSize = 34, id = 'tvi' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} id={id} />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-white">
          Trilha <span className="text-flame-400">Viva</span>
        </span>
        <span className="mt-[3px] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Multitracks Gospel
        </span>
      </span>
    </span>
  )
}
