'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Botao } from '@/components/ds'
import PagamentoAprovado from '@/components/sucesso/PagamentoAprovado'
import PagamentoPendente from '@/components/sucesso/PagamentoPendente'
import { Cabeca, PaginaSucesso } from '@/components/sucesso/Pecas'
import { esquecer } from '@/lib/checkout-campos'
import { CHAVE_EMAIL_ENTRAR, INTERVALO_MS, proximoPasso } from '@/lib/pos-pagamento'

// A tela depois do pagamento (MUDANÇAS §5). O trabalho dela é um só: transformar
// quem acabou de pagar em quem já tem acesso. O Mercado Pago volta com
// ?payment_id= e ?external_reference= (a referência aleatória que prova que a
// compra é desta pessoa); sem os dois juntos, nada é consultado.
//
// A conferência é a de sempre (lib/pos-pagamento.js): a cada 3 segundos, por até
// 3 minutos; "Já paguei, verificar agora" começa outra rodada de 3 minutos.
// O Pixel não carrega aqui (components/MetaPixel.jsx, SEM_PIXEL): o endereço
// traz a chave da compra, e a compra vai à Meta só pelo servidor.
//
// `convite` é o ConvitePalco (variante sucesso), montado em app/sucesso/page.js.
export default function AccessPanel({ convite }) {
  const params = useSearchParams()
  const paymentId = params.get('payment_id')
  const ref = params.get('external_reference')
  const temCompra = Boolean(paymentId && paymentId !== 'null' && ref)
  const [state, setState] = useState({ status: temCompra ? 'loading' : 'missing' })
  const [passo, setPasso] = useState(temCompra ? 'esperar' : 'missing')
  const [rodada, setRodada] = useState(0)

  const consultar = useCallback(async () => {
    try {
      const res = await fetch('/api/acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, ref }),
        cache: 'no-store',
      })
      return await res.json()
    } catch {
      // Queda de internet no meio da espera não encerra nada: conta como
      // "ainda pendente" e a próxima consulta tenta de novo.
      return { status: 'pending' }
    }
  }, [paymentId, ref])

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

  // Já tem senha: "Entrar" leva para a entrada com o e-mail preenchido. O e-mail
  // passa pela memória da aba, nunca pelo endereço (o Pixel lê o endereço).
  useEffect(() => {
    if (passo !== 'entrar') return
    try {
      sessionStorage.setItem(CHAVE_EMAIL_ENTRAR, state.email || '')
    } catch {
      /* sem memória da aba: a pessoa digita o e-mail */
    }
  }, [passo, state.email])

  // Compra aprovada: os dados lembrados para a próxima compra não servem mais.
  const pago = state.status === 'paid'
  useEffect(() => {
    if (pago) esquecer()
  }, [pago])

  const verificar = () => setRodada((n) => n + 1)
  let tela

  if (passo === 'missing') {
    tela = (
      <>
        <Cabeca titulo="Nada por aqui ainda">
          Esta página só aparece depois de um pagamento confirmado. Se você já comprou, entre na sua conta.
        </Cabeca>
        <div className="flex flex-wrap gap-3">
          <Botao href="/entrar" tamanho="lg">
            Entrar na minha conta
          </Botao>
          <Botao href="/musicas" variante="contorno" tamanho="lg">
            Ver o acervo
          </Botao>
        </div>
      </>
    )
  } else if (passo === 'esperar') {
    tela = (
      <PagamentoPendente
        momento={state.status === 'pending' ? 'pendente' : 'confirmando'}
        state={state}
        onVerificar={verificar}
      />
    )
  } else if (passo === 'esgotado') {
    tela = <PagamentoPendente momento="esgotado" state={state} onVerificar={verificar} />
  } else if (passo === 'senha' || passo === 'entrar') {
    tela = (
      <PagamentoAprovado state={state} passo={passo} paymentId={paymentId} convite={convite} />
    )
  } else {
    const recusado = passo === 'recusado'
    tela = (
      <>
        <Cabeca tipo="problema" titulo={recusado ? 'O pagamento não foi aprovado' : 'Não deu para conferir o pagamento'}>
          {recusado
            ? 'O Mercado Pago recusou ou cancelou este pagamento e nada foi cobrado por nós. Tente outro cartão ou pague com Pix, que libera na hora.'
            : state.error || 'Não conseguimos conferir este pagamento agora.'}
        </Cabeca>
        <div className="flex flex-wrap gap-3">
          {recusado && (
            <Botao href="/assinar" tamanho="lg">
              Tentar de novo
            </Botao>
          )}
          <Botao variante="contorno" tamanho="lg" onClick={verificar}>
            Já paguei, verificar agora
          </Botao>
        </div>
      </>
    )
  }

  return <PaginaSucesso>{tela}</PaginaSucesso>
}
