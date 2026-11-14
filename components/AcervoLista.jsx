'use client'

import { useEffect, useMemo, useState } from 'react'
import { songs, artists, categorias } from '@/lib/catalog'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'

const PAGINA = 40
const botao = 'inline-flex min-h-11 items-center justify-center rounded border px-4 py-2 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink'
const botaoNeutro = botao + ' border-line text-ink hover:border-ink'
const botaoPrincipal = botao + ' border-signal-deep text-signal-deep hover:bg-signal-deep hover:text-white'
const botaoDesabilitado = botao + ' pointer-events-none border-line text-ink-faint'

function semAcento(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// Mesmo rótulo de variante da lista anterior.
function rotulo(v, i) {
  const partes = []
  if (v.versao) partes.push(v.versao)
  if (v.tom) partes.push('tom ' + v.tom)
  if (v.bpm) partes.push(v.bpm + ' BPM')
  if (v.tipo === 'VS MP3') partes.push('playback')
  return partes.length ? partes.join(' · ') : 'Versão ' + (i + 1)
}

export function AcaoDownload({ musica, acabou, onBaixar, repetido = false }) {
  const [aberto, setAberto] = useState(false)

  if (musica.variantes.length <= 1) {
    return (
      <a
        href={'/api/baixar?slug=' + musica.slug}
        onClick={() => onBaixar(musica.slug)}
        aria-disabled={acabou}
        tabIndex={acabou ? -1 : undefined}
        className={acabou ? botaoDesabilitado : botaoPrincipal}
      >
        {repetido ? 'Baixar de novo' : 'Baixar'}
      </a>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <button
        type="button"
        disabled={acabou}
        aria-disabled={acabou}
        onClick={() => setAberto(true)}
        className={botaoNeutro + ' disabled:text-ink-faint'}
      >
        Escolher versão ({musica.variantes.length})
      </button>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-lg sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <DialogTitle>{musica.title}</DialogTitle>
        <div className="flex flex-col gap-2">
          {musica.variantes.map((v, i) => (
            <a
              key={i}
              href={'/api/baixar?slug=' + musica.slug + '&i=' + i}
              onClick={() => { onBaixar(musica.slug); setAberto(false) }}
              aria-disabled={acabou}
              tabIndex={acabou ? -1 : undefined}
              className={acabou ? botaoDesabilitado : botaoNeutro}
            >
              {rotulo(v, i)}
            </a>
          ))}
        </div>
        <DialogClose className="min-h-11 rounded border border-line px-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
          Fechar
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function LinhaMusica({ musica, baixado, acabou, onBaixar }) {
  const variante = musica.variantes[0]
  const detalhe = musica.variantes.length === 1 && (variante.tom || variante.bpm)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-semibold text-ink">{musica.title}</p>
        <p className="text-[13.5px] text-ink-muted">
          {musica.artist} · {musica.categoria}
          {baixado && (
            <span className="ml-2 inline-block rounded border border-line px-2 py-1 text-[12px] text-ink-muted">
              Já baixei
            </span>
          )}
        </p>
        {detalhe && (
          <p className="figs text-[13px] text-ink-faint">
            {[variante.tom && 'tom ' + variante.tom, variante.bpm && variante.bpm + ' BPM']
              .filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <AcaoDownload musica={musica} acabou={acabou} onBaixar={onBaixar} />
    </li>
  )
}

export default function AcervoLista({ sobrando, baixados, estado, onBaixar }) {
  const [montado, setMontado] = useState(false)
  const [q, setQ] = useState('')
  const [artista, setArtista] = useState('')
  const [categoria, setCategoria] = useState('')
  const [soNovas, setSoNovas] = useState(false)
  const [limite40, setLimite40] = useState(PAGINA)

  // Montar as músicas no servidor gastaria o orçamento de CPU da visita.
  useEffect(() => setMontado(true), [])
  const filtradas = useMemo(() => {
    if (!montado) return []
    const busca = semAcento(q.trim())
    return songs.filter((s) => {
      if (artista && s.artist !== artista && s.tambem !== artista) return false
      if (categoria && s.categoria !== categoria) return false
      if (soNovas && baixados.has(s.slug)) return false
      return !busca || semAcento(s.title).includes(busca) || semAcento(s.artist).includes(busca)
    })
  }, [montado, q, artista, categoria, soNovas, baixados])

  if (!montado) return <p className="mt-10 text-[15px] text-ink-muted">Carregando o acervo…</p>

  return (
    <div className="mt-7">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full">
          <label htmlFor="acervo-busca" className="mb-1 block text-[13px] font-semibold text-ink">
            Buscar música
          </label>
          <input
            id="acervo-busca"
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimite40(PAGINA) }}
            placeholder="Música ou artista"
            className="min-h-11 w-full rounded border border-line bg-white px-4 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="acervo-artista" className="mb-1 block text-[13px] font-semibold text-ink">
            Artista
          </label>
          <select
            id="acervo-artista"
            value={artista}
            onChange={(e) => { setArtista(e.target.value); setLimite40(PAGINA) }}
            className="min-h-11 w-full rounded border border-line bg-white px-4 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:w-auto"
          >
            <option value="">Todos os artistas</option>
            {artists.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink">Categoria</p>
        <div className="flex flex-wrap gap-2">
          {[["", 'Todas'], ...categorias.map((c) => [c, c])].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={categoria === valor}
              onClick={() => { setCategoria(valor); setLimite40(PAGINA) }}
              className="min-h-11 rounded border border-line bg-white px-3 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {texto}
            </button>
          ))}
        </div>
      </div>
      {estado !== 'erro' && (
        <label className="mt-5 flex min-h-11 items-center gap-3 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={soNovas}
            disabled={estado === 'carregando'}
            onChange={(e) => { setSoNovas(e.target.checked); setLimite40(PAGINA) }}
            className="h-5 w-5 accent-ink focus-visible:ring-2 focus-visible:ring-ink"
          />
          Só o que ainda não baixei
          {estado === 'carregando' && <span className="ml-1 text-ink-faint">carregando…</span>}
        </label>
      )}
      <p className="figs mt-5 text-[13px] text-ink-faint">
        {filtradas.length === songs.length
          ? `${songs.length} músicas no acervo`
          : `${filtradas.length} de ${songs.length} músicas`}
        {' · '}
        {sobrando <= 0 ? 'limite de hoje atingido' : `restam ${sobrando} downloads hoje`}
      </p>
      <ul className="mt-6 divide-y divide-line border-t border-line">
        {filtradas.slice(0, limite40).map((s) => (
          <LinhaMusica
            key={s.slug}
            musica={s}
            baixado={baixados.has(s.slug)}
            acabou={sobrando <= 0}
            onBaixar={onBaixar}
          />
        ))}
      </ul>
      {filtradas.length === 0 && (
        <p className="py-10 text-[15px] text-ink-muted">Nada com esses filtros. Tente outra busca.</p>
      )}
      {limite40 < filtradas.length && (
        <button
          type="button"
          onClick={() => setLimite40((n) => n + PAGINA)}
          className="btn-quiet mt-8 min-h-11 w-full sm:w-auto"
        >
          Ver mais {Math.min(PAGINA, filtradas.length - limite40)} de {filtradas.length - limite40} restantes
        </button>
      )}
    </div>
  )
}
