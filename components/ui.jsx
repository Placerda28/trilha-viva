import Link from 'next/link'
import Cover from './Cover'

export function SectionHead({ eyebrow, title, sub, align = 'left', className = '' }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-4 text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-ink sm:text-[40px]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[17px] leading-[1.65] text-ink-muted">{sub}</p>}
    </div>
  )
}

export function SongCard({ song, className = '' }) {
  return (
    <Link
      href={`/musicas/${song.slug}`}
      className={`group block ${className}`}
      aria-label={`${song.title} — ${song.artist}`}
    >
      <div className="relative overflow-hidden rounded-xl transition-transform duration-300 group-hover:-translate-y-1">
        <Cover song={song} rounded="rounded-xl" className="aspect-square" />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="mb-3 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink">
            Ver detalhes
          </span>
        </div>
      </div>
      <h3 className="mt-3 truncate text-[14.5px] font-semibold tracking-[-0.01em] text-ink">
        {song.title}
      </h3>
      <p className="truncate text-[13px] text-ink-faint">{song.artist}</p>
    </Link>
  )
}

export function Faq({ items, className = '' }) {
  return (
    <div className={`divide-y divide-line border-y border-line ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[16.5px] font-semibold tracking-[-0.01em] text-ink marker:hidden">
            {item.q}
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition-transform group-open:rotate-45">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="mt-3 max-w-3xl text-[15.5px] leading-[1.7] text-ink-muted">{item.a}</div>
        </details>
      ))}
    </div>
  )
}

export function Check({ className = '' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" fillOpacity=".12" />
      <path d="M4.6 8.2l2.2 2.2 4.6-4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Trilha de navegação" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-faint">
      {items.map((it, i) => (
        <span key={it.href || it.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-line">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink-muted">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
