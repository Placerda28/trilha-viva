'use client'

import { useEffect, useMemo, useState } from 'react'
import { SongGrid } from './ui'

const PAGE = 40

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export default function CatalogBrowser({ songs, artistas = [] }) {
  const [q, setQ] = useState('')
  const [artist, setArtist] = useState('')
  const [limit, setLimit] = useState(PAGE)

  // ?artista= e ?q= sao lidos aqui, no navegador, e nao no servidor: assim a
  // pagina do acervo continua sendo montada uma vez so, na publicacao. Roda
  // depois que a lista ja apareceu na tela, entao um link com filtro abre o
  // acervo inteiro por um instante e em seguida filtra.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const a = sp.get('artista')
    const busca = sp.get('q')
    if (a) setArtist(a)
    if (busca) setQ(busca)
  }, [])

  const filtered = useMemo(() => {
    const nq = norm(q.trim())
    return songs.filter((s) => {
      if (artist && s.artist !== artist && s.tambem !== artist) return false
      if (!nq) return true
      return norm(s.title).includes(nq) || norm(s.artist).includes(nq)
    })
  }, [songs, q, artist])

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

        {/* Filtro por artista: com 77 bandas no acervo, e por artista que a
            pessoa procura, nao por categoria. */}
        <div className="w-full lg:w-auto">
          <label htmlFor="filtro-artista" className="sr-only">
            Filtrar por artista ou ministério
          </label>
          <select
            id="filtro-artista"
            value={artist}
            onChange={(e) => {
              setArtist(e.target.value)
              setLimit(PAGE)
            }}
            className="w-full rounded border border-line bg-white px-4 py-3.5 text-[15px] text-ink focus:border-ink focus:outline-none lg:w-auto"
          >
            <option value="">Todos os artistas</option>
            {artistas.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name} ({a.total})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="figs mt-6 text-[14px] text-ink-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'música' : 'músicas'} no acervo
        {artist ? ` de ${artist}` : ''}.
      </p>

      {shown.length === 0 ? (
        <div className="mt-10 rounded-lg bg-mist px-6 py-16 text-center">
          <p className="text-[19px] font-bold text-ink">Nada encontrado com esse termo.</p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-muted">
            Tente só uma palavra do título, ou procure pelo nome do artista. O acervo continua
            crescendo, e novas trilhas entram no mesmo pacote.
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
