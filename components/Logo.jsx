export function LogoMark({ size = 30, className = '', tone = 'ink' }) {
  const main = tone === 'light' ? '#FBFAF8' : '#14110F'
  const accent = '#A8431E'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* onda + cruz, traço plano, sem gradiente */}
      <rect x="0" y="16" width="3" height="8" rx="1.5" fill={main} opacity=".35" />
      <rect x="6" y="11" width="3" height="18" rx="1.5" fill={main} opacity=".6" />
      <rect x="18.5" y="2" width="3.5" height="36" rx="1" fill={main} />
      <rect x="13" y="12" width="14.5" height="3.5" rx="1" fill={accent} />
      <rect x="31" y="11" width="3" height="18" rx="1.5" fill={main} opacity=".6" />
      <rect x="37" y="16" width="3" height="8" rx="1.5" fill={main} opacity=".35" />
    </svg>
  )
}

export function Logo({ markSize = 28 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[19px] tracking-[-0.01em] text-ink">Trilha Viva</span>
        <span className="mt-[4px] text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Multitracks Gospel
        </span>
      </span>
    </span>
  )
}

export function LogoInverse({ markSize = 28 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} tone="light" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[19px] tracking-[-0.01em] text-paper">Trilha Viva</span>
        <span className="mt-[4px] text-[9px] font-semibold uppercase tracking-[0.2em] text-paper/45">
          Multitracks Gospel
        </span>
      </span>
    </span>
  )
}
