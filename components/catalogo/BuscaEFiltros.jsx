'use client'

import { useId, useState } from 'react'

// Busca no topo das listas do acervo e, ao lado, os filtros em caixas de seleção.
// No celular os filtros ficam atrás do botão "Filtrar" (a busca fica sempre à
// vista). Não guarda o valor dos campos: quem usa decide (CatalogBrowser, FiltroBpm).
//
//   <BuscaEFiltros rotuloBusca="Buscar música ou artista" busca={q} onBusca={setQ}
//     filtros={[{ id: 'artista', rotulo: 'Artista', valor, onChange, opcoes: ['Aline Barros', …] }]} />
// `opcoes` são textos (valor = texto) ou { valor, rotulo }.
const CAMPO =
  'w-full rounded-control border border-field-border bg-white text-[15px] text-ink transition-colors hover:border-ink motion-reduce:transition-none'

export default function BuscaEFiltros({ rotuloBusca, busca, onBusca, filtros = [], className = '' }) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  return (
    <div className={`flex flex-col gap-2.5 border-y border-b-line border-t-ink py-4 ${className}`}>
      <div className="flex flex-wrap gap-2.5">
        <div className="relative min-w-0 flex-[1_1_280px]">
          <label htmlFor={`${id}-busca`} className="sr-only">
            {rotuloBusca}
          </label>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-3.5 text-text-3"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id={`${id}-busca`}
            type="search"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder={rotuloBusca}
            autoComplete="off"
            className={`${CAMPO} h-12 pl-11 pr-3.5 text-[16px] placeholder:text-text-4`}
          />
        </div>
        {filtros.length > 0 && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls={`${id}-filtros`}
            className="flex h-12 items-center gap-2 rounded-control border border-ink bg-white px-4 text-[15px] font-semibold hover:bg-surface sm:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M7 12h10M10 18h4" />
            </svg>
            Filtrar
          </button>
        )}
      </div>
      {filtros.length > 0 && (
        <div
          id={`${id}-filtros`}
          className={`${aberto ? 'grid' : 'hidden'} grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 sm:grid`}
        >
          {filtros.map((f) => (
            <div key={f.id} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${f.id}`} className="text-[13px] font-semibold">
                {f.rotulo}
              </label>
              <select
                id={`${id}-${f.id}`}
                value={f.valor}
                onChange={(e) => f.onChange(e.target.value)}
                className={`${CAMPO} h-11 cursor-pointer px-3`}
              >
                <option value="">Todos</option>
                {f.opcoes.map((o) => {
                  const { valor, rotulo } = typeof o === 'string' ? { valor: o, rotulo: o } : o
                  return (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  )
                })}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
