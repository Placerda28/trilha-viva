'use client'

import { useEffect, useState } from 'react'

// Aviso de "pagamento cancelado" em /assinar. O Mercado Pago (e a Stripe, na
// reserva) devolvem a pessoa para /assinar?cancelado=1 quando ela desiste.
// O parametro e lido aqui, no navegador, e nao no servidor: ler searchParams
// no servidor tornava a pagina dinamica (montada a cada visita, sem cache),
// e o site tem 10 ms de processamento por visita no Cloudflare.
export default function AvisoCancelado() {
  const [cancelado, setCancelado] = useState(false)

  useEffect(() => {
    setCancelado(new URLSearchParams(window.location.search).has('cancelado'))
  }, [])

  if (!cancelado) return null
  return (
    <p className="mt-4 border border-line bg-white px-5 py-4 text-[14.5px] text-ink-muted" role="status">
      O pagamento foi cancelado e nada foi cobrado. Quando quiser, é só continuar de onde parou.
    </p>
  )
}
