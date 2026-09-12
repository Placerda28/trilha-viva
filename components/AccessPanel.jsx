'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ContaForm from './ContaForm'

// A tela depois do pagamento. O trabalho dela é um só: transformar quem
// acabou de pagar em quem já tem acesso. Por isso o único caminho visível
// aqui é criar a senha — sem link alternativo, sem menu, sem distração.
export default function AccessPanel() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState({ status: sessionId ? 'loading' : 'missing' })
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

  if (state.status === 'missing') {
    return (
      <Painel titulo="Nada por aqui ainda">
        <p>
          Esta página só aparece depois de um pagamento confirmado. Se você já comprou, entre na
          sua conta.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/entrar" className="btn-ink">
            Entrar na minha conta
          </Link>
          <Link href="/assinar" className="btn-quiet">
            Ver o acervo
          </Link>
        </div>
      </Painel>
    )
  }

  if (state.status === 'loading') {
    return (
      <Painel titulo="Confirmando seu pagamento…">
        <p>Só um instante. Estamos verificando com a operadora.</p>
        <div className="mt-6 h-[2px] w-full overflow-hidden bg-line">
          <div className="h-full w-1/3 animate-pulse bg-signal" />
        </div>
      </Painel>
    )
  }

  if (state.status === 'pending') {
    return (
      <Painel titulo="Aguardando a confirmação do pagamento" alerta>
        <p>{state.message}</p>
        <p className="mt-3">
          Pode deixar esta página aberta — assim que o pagamento cair, ela segue sozinha para o
          próximo passo.
        </p>
      </Painel>
    )
  }

  if (state.status === 'paid') {
    return (
      <Painel titulo="Pagamento confirmado. Falta criar sua senha." ok>
        <p>
          Sua conta usa{' '}
          <strong className="font-semibold text-ink">{state.email || 'o e-mail da compra'}</strong>.
          Escolha uma senha e o acervo abre em seguida.
        </p>

        <div className="mt-7 border-t border-line pt-7">
          <ContaForm modo="criar" />
        </div>

        <p className="mt-6 text-[13.5px] leading-relaxed text-ink-faint">
          {state.mailed
            ? 'Se você fechar esta página antes de terminar, tudo bem: enviamos o mesmo link para o seu e-mail.'
            : 'Termine agora, nesta tela. Se fechar antes, use "Esqueci minha senha" na página de entrada com este mesmo e-mail.'}
        </p>
      </Painel>
    )
  }

  return (
    <Painel titulo="Não conseguimos confirmar automaticamente" alerta>
      <p>{state.error || 'Tente recarregar a página em alguns instantes.'}</p>
      <p className="mt-3">
        Se o valor já saiu da sua conta, o acesso não se perde: o link para criar a senha também vai
        para o e-mail informado no pagamento. Confira a caixa de spam.
      </p>
      <button type="button" onClick={check} className="btn-quiet mt-6">
        Verificar de novo
      </button>
    </Painel>
  )
}

function Painel({ titulo, children, ok, alerta }) {
  const borda = alerta ? 'border-signal/40' : 'border-line'
  return (
    <div className={`border ${borda} bg-white p-8 sm:p-11`}>
      <div className="flex items-start gap-3">
        {(ok || alerta) && (
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-signal/30 text-signal">
            {ok ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 5v4.3l2.6 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}
        <h1 className="font-bold text-[26px] leading-[1.18] text-ink sm:text-[32px]">{titulo}</h1>
      </div>
      <div className="mt-5 text-[16px] leading-[1.7] text-ink-muted">{children}</div>
    </div>
  )
}
