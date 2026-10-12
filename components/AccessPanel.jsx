'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import ContaForm from './ContaForm'
import { rastrear } from './MetaPixel'
import { site } from '@/lib/site'
import { esquecer } from '@/lib/checkout-campos'
import { CHAVE_EMAIL_ENTRAR, INTERVALO_MS, proximoPasso } from '@/lib/pos-pagamento'

// A tela depois do pagamento. O trabalho dela é um só: transformar quem
// acabou de pagar em quem já tem acesso. Por isso o único caminho visível
// aqui é criar a senha — sem link alternativo, sem menu, sem distração.
export default function AccessPanel() {
  const params = useSearchParams()
  // Stripe volta com ?session_id=. O Mercado Pago volta com ?payment_id= e
  // ?external_reference= (a referência aleatória que prova que a compra é
  // desta pessoa). Sem os dois juntos, nada é consultado.
  const sessionId = params.get('session_id')
  const paymentId = params.get('payment_id')
  const ref = params.get('external_reference')
  const temCompra = Boolean(sessionId || (paymentId && paymentId !== 'null' && ref))
  const [state, setState] = useState({ status: temCompra ? 'loading' : 'missing' })
  const [passo, setPasso] = useState(temCompra ? 'esperar' : 'missing')
  const [rodada, setRodada] = useState(0)

  const consultar = useCallback(async () => {
    try {
      const res = await fetch('/api/acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionId ? { session_id: sessionId } : { payment_id: paymentId, ref }),
        cache: 'no-store',
      })
      return await res.json()
    } catch {
      // Queda de internet no meio da espera não encerra nada: conta como
      // "ainda pendente" e a próxima consulta tenta de novo.
      return { status: 'pending' }
    }
  }, [sessionId, paymentId, ref])

  // Confere a cada 3 segundos, por até 3 minutos. "Já paguei, conferir de
  // novo" começa uma nova rodada de 3 minutos.
  useEffect(() => {
    if (!temCompra) return
    let parar = false
    let timer
    let tentativas = 0
    const rodar = async () => {
      const dados = await consultar()
      if (parar) return
      // Guarda o que a resposta trouxe (e-mail mascarado, aviso de WhatsApp)
      // sem perder o que veio antes.
      setState((antes) => ({ ...antes, ...dados }))
      const p = proximoPasso(dados, tentativas)
      if (p === 'esperar') {
        tentativas += 1
        timer = setTimeout(rodar, INTERVALO_MS)
        return
      }
      setPasso(p)
    }
    setPasso('esperar')
    rodar()
    return () => {
      parar = true
      clearTimeout(timer)
    }
  }, [temCompra, consultar, rodada])

  // Já tem senha: vai para a entrada com o e-mail preenchido. O e-mail passa
  // pela memória da aba, nunca pelo endereço (o Pixel lê o endereço).
  useEffect(() => {
    if (passo !== 'entrar') return
    try {
      sessionStorage.setItem(CHAVE_EMAIL_ENTRAR, state.email || '')
    } catch {
      /* sem memória da aba: a pessoa digita o e-mail */
    }
    window.location.replace('/entrar?ja=1')
  }, [passo, state.email])

  // Compra no Pixel, uma vez por pagamento (recarregar a página não conta de
  // novo). O id é o mesmo que o aviso da operadora manda pelo servidor: a
  // sessão na Stripe, a referência no Mercado Pago. Compra de teste não vai.
  const compraId = sessionId || ref
  const pago = state.status === 'paid'
  useEffect(() => {
    if (!pago || !compraId) return
    // Compra aprovada: os dados lembrados para a próxima compra não servem mais.
    esquecer()
    if (state.teste) return
    const chave = 'tv-compra-' + compraId
    try {
      if (sessionStorage.getItem(chave)) return
      sessionStorage.setItem(chave, '1')
    } catch {
      /* sem sessionStorage: a Meta ainda deduplica pelo id */
    }
    rastrear('Purchase', { value: site.price, currency: site.currency }, compraId)
  }, [pago, state.teste, compraId])

  if (passo === 'missing') {
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

  if (passo === 'esperar' || passo === 'entrar') {
    return (
      <Painel titulo={passo === 'entrar' ? 'Pagamento confirmado' : 'Confirmando seu pagamento…'}>
        <p>
          {passo === 'entrar'
            ? 'Você já tem uma senha com este e-mail. Levando você para a entrada…'
            : 'Só um instante. Estamos conferindo com o Mercado Pago. No Pix, isso leva alguns segundos depois que você paga.'}
        </p>
        <div className="mt-6 h-[2px] w-full overflow-hidden bg-line">
          <div className="h-full w-1/3 animate-pulse bg-signal" />
        </div>
        {passo === 'esperar' && (
          <p className="mt-5 text-[14px] text-ink-faint">Pode deixar esta página aberta. Ela segue sozinha.</p>
        )}
      </Painel>
    )
  }

  if (passo === 'senha') {
    // A criação de senha é a primeira coisa da tela: título curto e o
    // formulário logo abaixo, com o e-mail da compra já preenchido e travado.
    return (
      <Painel titulo="Pagamento confirmado. Crie sua senha." ok>
        <ContaForm modo="criar" emailFixo={state.email || ''} />
        <p className="mt-6 text-[13.5px] leading-relaxed text-ink-faint">
          {state.mailed
            ? 'Se você fechar esta página antes de terminar, tudo bem: enviamos o mesmo link para o seu e-mail.'
            : 'Termine agora, nesta tela. Se fechar antes, use "Primeiro acesso" na página de entrada com este mesmo e-mail.'}
        </p>
      </Painel>
    )
  }

  const recusado = passo === 'recusado'
  const destino = state.emailMascarado ? (
    <strong className="font-semibold text-ink">{state.emailMascarado}</strong>
  ) : (
    'informado na compra'
  )
  return (
    <Painel titulo={recusado ? 'O pagamento não foi aprovado' : 'Ainda não recebemos a confirmação'} alerta>
      {recusado ? (
        <p>
          O Mercado Pago recusou ou cancelou este pagamento e nada foi cobrado por nós. Se quiser,
          tente de novo pela página de compra.
        </p>
      ) : passo === 'erro' ? (
        <p>{state.error || 'Não conseguimos conferir este pagamento agora.'}</p>
      ) : (
        <p>
          Assim que o pagamento cair, você recebe o link de acesso no e-mail {destino}
          {state.whatsapp ? ' e no WhatsApp' : ''}. Confira também a caixa de spam.
        </p>
      )}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setRodada((n) => n + 1)} className="btn-ink">
          Já paguei, conferir de novo
        </button>
        {recusado && (
          <Link href="/assinar" className="btn-quiet">
            Tentar de novo
          </Link>
        )}
      </div>
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
