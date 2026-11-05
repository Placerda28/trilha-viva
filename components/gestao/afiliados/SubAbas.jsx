'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAvisosDaCasca } from '../Casca'

// As sete sub-abas de Afiliados, na ordem da especificação. Dashboard e
// Financeiro levam o período (?de&ate) de uma aba para a outra. Saques e
// Alertas mostram o número vermelho que o menu também soma (`avisos` da casca;
// o do Alertas conta só os três avisos mais baratos, como o menu).
export const SUBABAS = [
  { id: 'dashboard', rotulo: 'Dashboard', href: '/gestao/afiliados/dashboard', periodo: true },
  { id: 'afiliados', rotulo: 'Afiliados', href: '/gestao/afiliados/lista' },
  { id: 'metas', rotulo: 'Metas e fechamentos', href: '/gestao/afiliados/metas' },
  { id: 'saques', rotulo: 'Saques', href: '/gestao/afiliados/saques', contador: 'afiliados_saques_pendentes', texto: 'pedidos de saque esperando' },
  { id: 'financeiro', rotulo: 'Financeiro', href: '/gestao/afiliados/financeiro', periodo: true },
  { id: 'alertas', rotulo: 'Alertas', href: '/gestao/afiliados/alertas', contador: 'afiliados_alertas', texto: 'alertas abertos' },
  { id: 'config', rotulo: 'Configurações', href: '/gestao/afiliados/config' },
]

// Aba sublinhada: o fio vermelho de 2 px é o mesmo marcador do menu lateral.
export const classeAba = (ativa) =>
  'relative flex min-h-11 shrink-0 items-center whitespace-nowrap px-3.5 text-[14.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ' +
  (ativa ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-signal' : 'text-ink-muted hover:text-ink')

export default function SubAbas({ atual }) {
  const params = useSearchParams()
  const avisos = useAvisosDaCasca()
  const ativaRef = useRef(null)
  const de = params.get('de')
  const ate = params.get('ate')
  const periodo = de && ate ? '?de=' + encodeURIComponent(de) + '&ate=' + encodeURIComponent(ate) : ''

  // No celular as sete abas não cabem: a aba atual rola para dentro da vista.
  useEffect(() => {
    ativaRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [atual])

  return (
    <nav aria-label="Seções de afiliados" className="-mx-4 mb-5 overflow-x-auto border-b border-line px-1 md:mx-0 md:px-0">
      <ul className="flex">
        {SUBABAS.map((s) => {
          const n = s.contador ? Number(avisos?.[s.contador]) || 0 : 0
          return (
            <li key={s.id}>
              <Link
                ref={s.id === atual ? ativaRef : undefined}
                href={s.href + (s.periodo ? periodo : '')}
                prefetch={false}
                aria-current={s.id === atual ? 'page' : undefined}
                className={classeAba(s.id === atual)}
              >
                {s.rotulo}
                {n > 0 && (
                  <span className="figs ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-signal px-1 text-[11px] font-bold leading-none text-white">
                    <span className="sr-only">{n + ' ' + s.texto}</span>
                    <span aria-hidden="true">{n}</span>
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
