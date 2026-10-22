'use client'

import { useEffect, useId, useState } from 'react'

// Busca e filtro da tabela de /bpm. A tabela inteira já vem no HTML (para o
// Google ler); aqui só escondemos linhas, sem carregar os dados de novo.
const FAIXAS = [
  { id: '', rotulo: 'Todas' },
  { id: 'lenta', rotulo: 'Lentas (até 80)' },
  { id: 'media', rotulo: 'Médias (81 a 115)' },
  { id: 'rapida', rotulo: 'Rápidas (acima de 115)' },
]
const naFaixa = (bpm, faixa) =>
  !faixa || (faixa === 'lenta' ? bpm <= 80 : faixa === 'media' ? bpm > 80 && bpm <= 115 : bpm > 115)
const plano = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function FiltroBpm({ tabelaId }) {
  const id = useId()
  const [busca, setBusca] = useState('')
  const [faixa, setFaixa] = useState('')
  const [visiveis, setVisiveis] = useState(null)

  useEffect(() => {
    const linhas = document.querySelectorAll(`#${tabelaId} tbody tr`)
    const termo = plano(busca.trim())
    // Sem filtro, nada a esconder: não percorre as linhas ao abrir a página.
    if (!termo && !faixa) {
      for (const tr of linhas) if (tr.hidden) tr.hidden = false
      setVisiveis(linhas.length)
      return
    }
    let n = 0
    for (const tr of linhas) {
      const mostra = naFaixa(Number(tr.dataset.bpm), faixa) && (!termo || tr.dataset.busca.includes(termo))
      if (tr.hidden === mostra) tr.hidden = !mostra
      if (mostra) n++
    }
    setVisiveis(n)
  }, [busca, faixa, tabelaId])

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label htmlFor={`${id}-busca`} className="block w-full sm:w-80">
        <span className="text-[14px] font-semibold text-ink">Buscar música ou artista</span>
        <input id={`${id}-busca`} type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: Galileu, Fernandinho"
          className="mt-2 w-full rounded border border-line bg-white px-4 py-3 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none" />
      </label>
      <div role="group" aria-label="Faixa de andamento" className="flex flex-wrap gap-2">
        {FAIXAS.map((f) => (
          <button key={f.id} type="button" aria-pressed={faixa === f.id} onClick={() => setFaixa(f.id)}
            className={`min-h-[44px] border px-3.5 text-[14px] font-semibold ${
              faixa === f.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink'
            }`}>
            {f.rotulo}
          </button>
        ))}
      </div>
      {visiveis !== null && (
        <p role="status" className="figs w-full text-[14px] text-ink-muted">
          {visiveis.toLocaleString('pt-BR')} músicas
        </p>
      )}
    </div>
  )
}
