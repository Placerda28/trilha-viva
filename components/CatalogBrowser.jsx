'use client'

import { useMemo, useState } from 'react'
import { SongGrid } from './ui'

const PAGE = 40

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
            placeholder="Buscar por música ou artista"
            aria-label="Buscar multitrack por música ou artista"
            className="w-full rounded border border-line bg-white py-3.5 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCat('')
              setLimit(PAGE)
            }}
            className={`rounded border px-4 py-2 text-[13.5px] font-medium transition-colors ${
              cat === '' ? 'border-ink bg-ink text-white' : 'border-line text-ink-muted hover:border-ink'
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
              className={`rounded border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                cat === c ? 'border-ink bg-ink text-white' : 'border-line text-ink-muted hover:border-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="figs mt-6 text-[14px] text-ink-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'música encontrada' : 'músicas encontradas'} nesta
        amostra pública do acervo.
      </p>

      {shown.length === 0 ? (
        <div className="mt-10 rounded-lg bg-mist px-6 py-16 text-center">
          <p className="text-[19px] font-bold text-ink">Nada encontrado com esse termo.</p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-muted">
            A amostra pública mostra parte do acervo. O pacote completo tem mais de 4.000 multitracks.
          </p>
        </div>
      ) : (
        <div className="mt-8 border-t-2 border-ink">
          <SongGrid songs={shown} />
        </div>
      )}

      {limit < filtered.length && (
        <div className="mt-12 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-quiet">
            Carregar mais músicas
          </button>
        </div>
      )}
    </>
  )
}
