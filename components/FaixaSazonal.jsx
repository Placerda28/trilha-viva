'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { faixaAtiva } from '@/lib/colecoes-datas'

// A home é estática: a data só pode ser conferida no navegador. Por isso a
// faixa começa escondida e aparece depois de carregar, se estiver no período.
export default function FaixaSazonal({ href, faixa }) {
  const [ativa, setAtiva] = useState(false)
  useEffect(() => setAtiva(faixaAtiva(faixa, new Date())), [faixa])
  if (!ativa) return null
  return (
    <div className="shell pt-20 sm:pt-28">
      <Link
        href={href}
        className="block border-y-2 border-ink py-4 text-[16px] font-semibold text-ink hover:underline"
      >
        {faixa.texto}
      </Link>
    </div>
  )
}
