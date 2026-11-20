'use client'

import { useEffect, useState } from 'react'
import { Aviso } from '@/components/ds'

// Aviso de pagamento não aprovado, no topo do formulário de /assinar. O Mercado
// Pago (e a Stripe, na reserva) devolvem a pessoa para /assinar?cancelado=1
// quando o pagamento é recusado ou ela desiste. O formulário continua com os
// dados preenchidos (ficam guardados só no navegador dela).
//
// O parâmetro é lido aqui, no navegador, e não no servidor: ler searchParams no
// servidor tornava a página dinâmica (montada a cada visita, sem cache), e o
// site tem 10 ms de processamento por visita no Cloudflare.
export default function AvisoCancelado() {
  const [cancelado, setCancelado] = useState(false)

  useEffect(() => {
    setCancelado(new URLSearchParams(window.location.search).has('cancelado'))
  }, [])

  if (!cancelado) return null
  return (
    <Aviso variante="erro" titulo="O pagamento não foi aprovado.">
      Nada foi cobrado. Tente outro cartão ou pague com Pix, que libera na hora.
    </Aviso>
  )
}
