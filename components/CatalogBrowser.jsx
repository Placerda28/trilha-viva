'use client'

import { useMemo, useState } from 'react'
import { SongCard } from './ui'

const PAGE = 36

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function CatalogBrowser({ songs, categorias, initialCat = '', initialQuery = '' }) {
  const [q, setQ] = useState(initialQuery)
  const [cat, setCat] = useState(initialCat)
  const [limit, setLimit] = useState(PAGE)

  const filtered = useMemo(() => {
    const nq = norm(q.trim())
    return songs.filter((s) => {
      if (cat && s.categoria !== cat) return false
      if (!nq) return true
      return norm(s.title).includes(nq) || norm(s.artist).includes(nq)
    })
  }, [songs, q, cat])

  const shown = filtered.slice(0, limit)

  return (
    <>
      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Buscar por música ou artista…"
            aria-label="Buscar multitrack por música ou artista"
            className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-ink/25 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCat('')
              setLimit(PAGE)
            }}
            className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
              cat === '' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/25'
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCat(c)
                setLimit(PAGE)
              }}
              className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                cat === c ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-muted hover:border-ink/25'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-[13.5px] text-ink-faint" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'música encontrada' : 'músicas encontradas'} nesta
        amostra pública do acervo.
      </p>

      {shown.length === 0 ? (
        <div className="mt-14 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-[16px] font-semibold text-ink">Nada encontrado com esse termo.</p>
          <p className="mt-2 text-[14.5px] text-ink-muted">
            A amostra pública mostra parte do acervo. O pacote completo tem mais de 4.000 multitracks.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
          {shown.map((s) => (
            <SongCard key={s.slug} song={s} />
          ))}
        </div>
      )}

      {limit < filtered.length && (
        <div className="mt-12 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-ghost">
            Carregar mais músicas
          </button>
        </div>
      )}
    </>
  )
}
