'use client'

import { useEffect, useMemo, useState } from 'react'
import { songs, artists } from '@/lib/catalog'

const PAGINA = 40

function semAcento(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// Como uma variante se apresenta quando a música tem mais de um arquivo.
// Só entra o que diferencia de verdade: tom, BPM, "ao vivo". Se nada
// diferencia, vira "Versão 2" — honesto e sem inventar rótulo.
function rotulo(v, i) {
  const partes = []
  if (v.versao) partes.push(v.versao)
  if (v.tom) partes.push('tom ' + v.tom)
  if (v.bpm) partes.push(v.bpm + ' BPM')
  if (v.tipo === 'VS MP3') partes.push('playback')
  return partes.length ? partes.join(' · ') : 'Versão ' + (i + 1)
}

export default function AcervoLista({ restam, limite }) {
  const [montado, setMontado] = useState(false)
  const [q, setQ] = useState('')
  const [artista, setArtista] = useState('')
  const [limite40, setLimite40] = useState(PAGINA)
  const [sobrando, setSobrando] = useState(restam)

  // A lista só é desenhada depois que a página abre. São 720 músicas: montar
  // isso no servidor a cada visita gastaria o orçamento de processamento que
  // já derrubou o site duas vezes. Aqui o servidor entrega uma casca e o
  // navegador preenche.
  useEffect(() => setMontado(true), [])

  const filtradas = useMemo(() => {
    if (!montado) return []
    const busca = semAcento(q.trim())
    return songs.filter((s) => {
      if (artista && s.artist !== artista && s.tambem !== artista) return false
      if (!busca) return true
      return semAcento(s.title).includes(busca) || semAcento(s.artist).includes(busca)
    })
  }, [montado, q, artista])

  const mostradas = filtradas.slice(0, limite40)
  const acabou = sobrando <= 0

  if (!montado) {
    return (
      <div className="mt-10 border-t border-line pt-10">
        <p className="text-[15px] text-ink-muted">Carregando o acervo…</p>
      </div>
    )
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setLimite40(PAGINA)
          }}
          placeholder="Buscar por música ou artista"
          aria-label="Buscar no acervo"
          className="w-full rounded border border-line bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
        <select
          value={artista}
          onChange={(e) => {
            setArtista(e.target.value)
            setLimite40(PAGINA)
          }}
          aria-label="Filtrar por artista"
          className="w-full rounded border border-line bg-white px-4 py-3.5 text-[15px] text-ink focus:border-ink focus:outline-none sm:w-auto"
        >
          <option value="">Todos os artistas</option>
          {artists.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-[13px] text-ink-faint">
        {filtradas.length === songs.length
          ? songs.length + ' músicas no acervo'
          : filtradas.length + ' de ' + songs.length + ' músicas'}
        {' · '}
        {acabou ? (
          <span className="text-signal-deep">limite de hoje atingido</span>
        ) : (
          'restam ' + sobrando + ' downloads hoje'
        )}
      </p>

      <ul className="mt-6 divide-y divide-line border-t border-line">
        {mostradas.map((s) => (
          <li key={s.slug} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15.5px] font-semibold text-ink">{s.title}</p>
              <p className="truncate text-[13.5px] text-ink-muted">{s.artist}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {s.variantes.length <= 1 ? (
                <a
                  href={'/api/baixar?slug=' + s.slug}
                  onClick={() => setSobrando((n) => Math.max(0, n - 1))}
                  aria-disabled={acabou}
                  className={
                    acabou
                      ? 'pointer-events-none rounded border border-line px-4 py-2 text-[13.5px] text-ink-faint'
                      : 'rounded border border-signal-deep px-4 py-2 text-[13.5px] font-semibold text-signal-deep transition-colors hover:bg-signal-deep hover:text-white'
                  }
                >
                  Baixar
                </a>
              ) : (
                s.variantes.map((v, i) => (
                  <a
                    key={i}
                    href={'/api/baixar?slug=' + s.slug + '&i=' + i}
                    onClick={() => setSobrando((n) => Math.max(0, n - 1))}
                    aria-disabled={acabou}
                    title={'Baixar ' + s.title + ' — ' + rotulo(v, i)}
                    className={
                      acabou
                        ? 'pointer-events-none rounded border border-line px-3 py-2 text-[12.5px] text-ink-faint'
                        : 'rounded border border-line px-3 py-2 text-[12.5px] text-ink transition-colors hover:border-signal-deep hover:text-signal-deep'
                    }
                  >
                    {rotulo(v, i)}
                  </a>
                ))
              )}
            </div>
          </li>
        ))}
      </ul>

      {filtradas.length === 0 && (
        <p className="py-10 text-[15px] text-ink-muted">
          Nada com esse nome. Tente só o começo do título, ou procure pelo artista.
        </p>
      )}

      {limite40 < filtradas.length && (
        <button
          type="button"
          onClick={() => setLimite40((n) => n + PAGINA)}
          className="btn-quiet mt-8 w-full sm:w-auto"
        >
          Ver mais {Math.min(PAGINA, filtradas.length - limite40)} de{' '}
          {filtradas.length - limite40} restantes
        </button>
      )}
    </div>
  )
}
