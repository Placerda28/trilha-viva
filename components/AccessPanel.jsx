'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from './ui'

export default function AccessPanel() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState({ status: sessionId ? 'loading' : 'missing' })
  const [copied, setCopied] = useState(false)
  const tries = useRef(0)

  const check = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch('/api/acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
        cache: 'no-store',
      })
      const data = await res.json()
      setState(data)
      return data.status
    } catch {
      setState({ status: 'error', error: 'Falha de conexão ao verificar o pagamento.' })
      return 'error'
    }
  }, [sessionId])

  useEffect(() => {
    let stop = false
    let timer

    const run = async () => {
      const status = await check()
      if (stop) return
      if (status === 'pending' && tries.current < 20) {
        tries.current += 1
        timer = setTimeout(run, 4000)
      }
    }
    run()

    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [check])

  async function copy() {
    if (!state.url) return
    try {
      await navigator.clipboard.writeText(state.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* noop */
    }
  }

  if (state.status === 'missing') {
    return (
      <Panel tone="neutral" title="Nada por aqui ainda">
        <p>
          Esta página só mostra o acervo depois de um pagamento confirmado. Se você já pagou, abra o
          link que enviamos para o seu e-mail.
        </p>
        <Link href="/assinar" className="btn-primary mt-6">
          Ir para o pagamento
        </Link>
      </Panel>
    )
  }

  if (state.status === 'loading') {
    return (
      <Panel tone="neutral" title="Confirmando seu pagamento…">
        <p>Só um instante. Estamos verificando com a operadora.</p>
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-600" />
        </div>
      </Panel>
    )
  }

  if (state.status === 'pending') {
    return (
      <Panel tone="pending" title="Aguardando a confirmação do pagamento">
        <p>{state.message}</p>
        <p className="mt-3">
          Pode deixar esta página aberta — assim que o pagamento cair, o link aparece aqui
          automaticamente. O acesso também vai para{' '}
          <strong className="font-semibold text-ink">{state.email || 'o seu e-mail'}</strong>.
        </p>
      </Panel>
    )
  }

  if (state.status === 'paid' || state.status === 'paid_no_link') {
    return (
      <Panel tone="ok" title="Pagamento confirmado. Acesso liberado!">
        <p>
          Enviamos o link do acervo para{' '}
          <strong className="font-semibold text-ink">{state.email || 'o seu e-mail'}</strong> — e ele
          já está aqui embaixo, pronto para abrir agora.
        </p>

        {state.url ? (
          <>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-flame flex-1"
              >
                Abrir o acervo completo
              </a>
              <button type="button" onClick={copy} className="btn-ghost">
                {copied ? 'Link copiado!' : 'Copiar link'}
              </button>
            </div>
            <p className="mt-4 break-all rounded-xl bg-surface px-4 py-3 text-[12.5px] text-ink-faint">
              {state.url}
            </p>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-surface px-4 py-3 text-[14px] text-ink-muted">
            {state.error}
          </p>
        )}

        <ul className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {[
            'Guarde o e-mail: ele é o seu comprovante de acesso vitalício',
            'O acesso é pessoal, para o seu ministério',
            'Comece pelo guia de configuração do REAPER',
            'Qualquer dúvida, é só responder o e-mail da compra',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-muted">
              <Check className="mt-0.5 shrink-0 text-brand-600" />
              {t}
            </li>
          ))}
        </ul>

        <Link href="/como-usar" className="btn-primary mt-7">
          Ver o guia: do download ao domingo
        </Link>
      </Panel>
    )
  }

  return (
    <Panel tone="pending" title="Não conseguimos confirmar automaticamente">
      <p>{state.error || 'Tente recarregar a página em alguns instantes.'}</p>
      <p className="mt-3">
        Se o valor já saiu da sua conta, não se preocupe: o link do acervo é enviado para o e-mail
        informado no checkout. Se não chegar em alguns minutos, confira a caixa de spam e responda
        o recibo da Stripe que você recebeu.
      </p>
      <button type="button" onClick={check} className="btn-ghost mt-6">
        Verificar de novo
      </button>
    </Panel>
  )
}

function Panel({ tone, title, children }) {
  const ring =
    tone === 'ok' ? 'border-brand-100' : tone === 'pending' ? 'border-flame-400/40' : 'border-line'
  return (
    <div className={`rounded-[24px] border ${ring} bg-white p-8 shadow-lift sm:p-11`}>
      <div className="flex items-center gap-3">
        {tone === 'ok' && (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 10.5l3.2 3.2L15 7"
                stroke="#1D4ED8"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {tone === 'pending' && (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flame-500/10 text-flame-600">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 5v4.3l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.033em] text-ink sm:text-[32px]">
          {title}
        </h1>
      </div>
      <div className="mt-5 text-[16px] leading-[1.7] text-ink-muted">{children}</div>
    </div>
  )
}
