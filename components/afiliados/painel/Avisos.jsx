'use client'

import { useState } from 'react'
import { linkInterno } from '@/lib/afiliados-painel'
import { enviar, useHttp } from './api'

// Avisos no topo do Início. Fechar marca como lido: some na hora e o servidor
// guarda; se o servidor falhar, o aviso volta na próxima visita (nada se perde).
export default function Avisos({ avisos }) {
  const chamar = useHttp()
  const [fechados, setFechados] = useState([])
  const lista = avisos.filter((a) => !fechados.includes(a.id))
  if (!lista.length) return null

  function fechar(ids) {
    setFechados((f) => [...f, ...ids])
    enviar(chamar, '/api/afiliados/avisos', { ids })
  }

  return (
    <section aria-label="Avisos" className="space-y-3">
      {lista.map((a) => {
        const link = linkInterno(a.link)
        return (
          <article key={a.id} className="flex items-start gap-3 rounded-lg border border-line border-l-[4px] border-l-signal bg-white py-4 pl-4 pr-2 sm:pl-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16.5px] font-bold leading-snug text-ink">{a.titulo}</h2>
              {a.texto && <p className="mt-1 text-[15px] leading-[1.55] text-ink-muted">{a.texto}</p>}
              {link && (
                <a href={link} className="link-signal mt-1 min-h-11 items-center">
                  Ver detalhes
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => fechar([a.id])}
              aria-label={`Fechar aviso: ${a.titulo}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded text-ink-muted transition-colors hover:bg-mist hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </article>
        )
      })}
      {lista.length > 1 && (
        <button type="button" onClick={() => fechar(lista.map((a) => a.id))} className="link-quiet min-h-11 text-[14.5px] font-semibold">
          Fechar todos os avisos
        </button>
      )}
    </section>
  )
}
