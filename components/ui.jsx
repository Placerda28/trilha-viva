import Link from 'next/link'
import Cover from './Cover'

export function SectionHead({ eyebrow, title, sub, className = '' }) {
  return (
    <div className={className}>
      {eyebrow && <p className="label">{eyebrow}</p>}
      <h2 className="display mt-6 max-w-3xl text-[30px] leading-[1.16] sm:text-[42px]">{title}</h2>
      {sub && <p className="mt-5 max-w-text text-[17px] leading-[1.7] text-ink-muted">{sub}</p>}
    </div>
  )
}

export function SongCard({ song }) {
  return (
    <Link href={`/musicas/${song.slug}`} className="group block" aria-label={`${song.title} — ${song.artist}`}>
      <Cover song={song} className="aspect-square transition-opacity duration-200 group-hover:opacity-80" />
      <p className="mt-2.5 text-[12.5px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
        Ver detalhes
      </p>
    </Link>
  )
}

export function Faq({ items, className = '' }) {
  return (
    <div className={`border-t border-line ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line py-6">
          <summary className="flex cursor-pointer list-none items-baseline gap-5 marker:hidden">
            <span className="mt-1 h-px w-4 shrink-0 bg-ink-faint transition-colors group-open:bg-accent" />
            <span className="font-display text-[19px] leading-snug text-ink sm:text-[21px]">{item.q}</span>
          </summary>
          <div className="mt-4 max-w-3xl pl-9 text-[16px] leading-[1.75] text-ink-muted">{item.a}</div>
        </details>
      ))}
    </div>
  )
}

export function Check({ className = '' }) {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" className={className} aria-hidden="true">
      <path d="M1 5.2L4.6 8.8L12 1.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" />
    </svg>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Trilha de navegação" className="flex flex-wrap items-center gap-2 text-[13px] text-ink-faint">
      {items.map((it, i) => (
        <span key={it.href || it.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-line">·</span>}
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

export function Figure({ src, alt, caption, className = '', priority = false, ratio = 'aspect-[16/9]', position = 'center' }) {
  return (
    <figure className={className}>
      <div className={`relative overflow-hidden bg-ink ${ratio}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="h-full w-full object-cover"
          style={{ objectPosition: position }}
        />
      </div>
      {caption && <figcaption className="mt-3 text-[12.5px] text-ink-faint">{caption}</figcaption>}
    </figure>
  )
}
