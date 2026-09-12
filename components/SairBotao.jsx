'use client'

import { useState } from 'react'

export default function SairBotao() {
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    try {
      await fetch('/api/conta/sair', { method: 'POST' })
    } catch {
      /* mesmo sem resposta, manda para a entrada */
    }
    window.location.href = '/entrar'
  }

  return (
    <button type="button" onClick={sair} disabled={saindo} className="link-quiet text-[13.5px] font-semibold">
      {saindo ? 'Saindo…' : 'Sair desta conta'}
    </button>
  )
}
