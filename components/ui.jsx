import Link from 'next/link'
import { TrackList } from './Track'

export { TrackList, TrackRow, ChannelStrip, SessionPanel, CHANNELS } from './Track'

/**
 * Cabeça de seção. Sem rótulo em caixa alta em cima: quem separa as seções é a
 * troca de superfície (branco, névoa, tinta) e o tamanho do título.
 */
export function SectionHead({ title, sub, className = '', tone = 'ink' }) {
  const light = tone === 'light'
  return (
    <div className={className}>
      <h2 className={`text-d2 max-w-4xl ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
      {sub && (
        <p
          className={`mt-5 max-w-text font-read text-[18px] leading-[1.7] ${
            light ? 'text-white/60' : 'text-ink-muted'
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

/** Lista de músicas em duas colunas no desktop, uma no celular. */
export function SongGrid({ songs, tone = 'ink', className = '' }) {
  const half = Math.ceil(songs.length / 2)
  const left = songs.slice(0, half)
  const right = songs.slice(half)
  return (
    <div className={`grid gap-x-10 md:grid-cols-2 ${className}`}>
      <TrackList songs={left} tone={tone} start={0} />
      {right.length > 0 && <TrackList songs={right} tone={tone} start={half} />}
    </div>
  )
}

export function Faq({ items, className = '' }) {
  return (
    <div className={`border-t border-line ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line py-6">
          <summary className="flex cursor-pointer list-none items-start gap-4 marker:hidden">
            <span
              aria-hidden="true"
              className="mt-2.5 h-[9px] w-[9px] shrink-0 bg-line transition-colors group-open:bg-signal"
            />
            <span className="text-[19px] font-bold leading-snug tracking-[-0.015em] text-ink sm:text-[21px]">
              {item.q}
            </span>
          </summary>
          <div className="mt-4 max-w-3xl pl-[25px] font-read text-[17px] leading-[1.72] text-ink-muted">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  )
}

/** Marca de item incluído. Um quadrado âmbar, não um check genérico. */
export function Check({ className = '' }) {
  return <span aria-hidden="true" className={`block h-[9px] w-[9px] bg-signal ${className}`} />
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Trilha de navegação" className="flex flex-wrap items-center gap-2 text-[13.5px]">
      {items.map((it, i) => (
        <span key={it.href || it.label} className="flex items-center gap-2">
          {i > 0 && (
            <svg width="5" height="9" viewBox="0 0 5 9" fill="none" aria-hidden="true" className="text-line">
              <path d="M1 1l3 3.5L1 8" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
          {it.href ? (
            <Link href={it.href} className="text-ink-muted hover:text-ink">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function Figure({
  src,
  alt,
  caption,
  className = '',
  priority = false,
  ratio = 'aspect-[16/9]',
  position = 'center',
}) {
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
      {caption && <figcaption className="mt-3 text-[13px] text-ink-muted">{caption}</figcaption>}
    </figure>
  )
}
