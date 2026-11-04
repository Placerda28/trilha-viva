'use client'

import { useState } from 'react'
import { enviar, useHttp } from './api'

// Chave "Me avise por e-mail a cada venda". Muda na hora e volta atrás se o
// servidor não aceitar.
export default function AvisarPorEmail({ inicial }) {
  const chamar = useHttp()
  const [ligado, setLigado] = useState(Boolean(inicial))
  const [falhou, setFalhou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function alternar() {
    const novo = !ligado
    setLigado(novo)
    setFalhou(false)
    setSalvando(true)
    const r = await enviar(chamar, '/api/afiliados/preferencias', { avisar_cada_venda: novo })
    setSalvando(false)
    if (!r.ok || !r.corpo?.ok) {
      setLigado(!novo)
      setFalhou(true)
    } else if (typeof r.corpo.avisar_cada_venda === 'boolean') {
      setLigado(r.corpo.avisar_cada_venda)
    }
  }

  return (
    <div className="card-line flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <div className="min-w-0">
        <p id="aviso-email-rotulo" className="text-[16px] font-bold text-ink">Me avise por e-mail a cada venda</p>
        <p className="mt-0.5 text-[14px] leading-[1.5] text-ink-muted">
          {falhou ? 'Não deu para salvar agora. Tente de novo.' : 'Você recebe um e-mail quando alguém comprar pelo seu código.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-labelledby="aviso-email-rotulo"
        onClick={alternar}
        disabled={salvando}
        className="group grid h-11 w-[68px] shrink-0 place-items-center focus-visible:outline-none"
      >
        <span className={`relative h-8 w-[52px] rounded-full border-2 transition-colors duration-150 group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 ${ligado ? 'border-ink bg-ink' : 'border-ink-faint bg-white'}`}>
          <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-150 motion-reduce:transition-none ${ligado ? 'left-[24px] bg-white' : 'left-[3px] bg-ink-faint'}`} />
        </span>
        <span className="sr-only">{ligado ? 'Ligado' : 'Desligado'}</span>
      </button>
    </div>
  )
}
