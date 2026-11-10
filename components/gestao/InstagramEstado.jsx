'use client'

import { useState } from 'react'
import { dataHora } from './formato'
import { postarGestao } from './AcaoGestao'

// Liga/pausa a IA que escreve os rascunhos. Pausada, nenhum rascunho novo
// nasce; as conversas e o envio manual continuam funcionando.
export default function InstagramEstado({ estado, onMudou }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const ligada = Boolean(estado?.ia_ligada)

  async function mudar() {
    setErro('')
    setEnviando(true)
    const r = await postarGestao('/api/gestao/instagram/estado', { ia_ligada: !ligada })
    setEnviando(false)
    if (r.ok) onMudou()
    else setErro(r.erro)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-muted">IA do Instagram</p>
        <p className="text-[16px] font-bold text-ink">{ligada ? 'Ligada: escrevendo rascunhos' : 'Pausada'}</p>
        <p className="text-[13px] text-ink-muted">
          A IA só escreve rascunhos. Nada sai para o cliente sem o seu clique em Enviar.
        </p>
        {estado?.atualizado_por && estado?.atualizado_em && (
          <p className="figs text-[12.5px] text-ink-faint">
            Última mudança: {dataHora(estado.atualizado_em)} · {estado.atualizado_por}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={mudar}
        disabled={enviando}
        className={(ligada ? 'btn-quiet' : 'btn-ink') + ' min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-60'}
      >
        {enviando ? 'Aguarde…' : ligada ? 'Pausar a IA' : 'Ligar a IA'}
      </button>
      {erro && (
        <p role="alert" className="w-full text-[13.5px] text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}
