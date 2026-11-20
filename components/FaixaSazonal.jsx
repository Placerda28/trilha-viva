'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { faixaAtiva } from '@/lib/colecoes-datas'

// A home é estática: a data só pode ser conferida no navegador. Por isso a
// faixa começa escondida e aparece depois de carregar, se estiver no período.
// Visual do redesenho: linha com fio preto em cima e embaixo, 56 px de altura de
// toque, sem vermelho.
export default function FaixaSazonal({ href, faixa }) {
  const [ativa, setAtiva] = useState(false)
  useEffect(() => setAtiva(faixaAtiva(faixa, new Date())), [faixa])
  if (!ativa) return null
  return (
    <div className="mx-auto w-full max-w-[1280px] px-[clamp(20px,4vw,32px)] pt-[clamp(32px,4vw,56px)]">
      <Link
        href={href}
        className="flex min-h-14 items-center border-y border-ink py-3 text-[16px] font-semibold text-ink hover:bg-surface"
      >
        {faixa.texto}
      </Link>
    </div>
  )
}
