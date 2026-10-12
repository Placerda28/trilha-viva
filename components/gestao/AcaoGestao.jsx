'use client'

import { useState } from 'react'

// Um botão de ação da gestão com confirmação em dois toques: o primeiro mostra
// o que vai acontecer e o segundo confirma. Nada de janela do navegador
// (confirm), que no celular some atrás do teclado e não segue o visual.

export async function postarGestao(url, corpo) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    const dados = await res.json().catch(() => null)
    if (res.status === 404) return { ok: false, erro: 'Sua sessão acabou. Entre de novo.' }
    if (!res.ok || !dados?.ok) return { ok: false, erro: dados?.erro || 'Não consegui agora. Tente de novo.' }
    return dados
  } catch {
    return { ok: false, erro: 'Falha de conexão. Confira a internet e tente de novo.' }
  }
}

export const linkAcao =
  'min-h-[32px] text-[13px] font-semibold text-ink-muted underline decoration-line underline-offset-2 hover:text-ink disabled:opacity-60'

export default function AcaoGestao({ rotulo, explicacao, confirmar = 'Confirmar', url, corpo, onFeito }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function fazer() {
    setErro('')
    setEnviando(true)
    const r = await postarGestao(url, corpo)
    setEnviando(false)
    if (!r.ok) return setErro(r.erro)
    setAberto(false)
    onFeito?.(r)
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={linkAcao}>
        {rotulo}
      </button>
    )
  }

  return (
    <div className="mt-1.5 w-full space-y-2 rounded border border-line bg-paper/60 px-3 py-2.5 text-[13px]">
      <p className="leading-relaxed text-ink">{explicacao}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={fazer} disabled={enviando} className="btn-ink !px-4 !py-2 !text-[13.5px] disabled:opacity-60">
          {enviando ? 'Salvando…' : confirmar}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={enviando}
          className="btn-quiet !px-4 !py-2 !text-[13.5px] disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {erro && (
        <p role="alert" className="text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}

// Selo "TESTE" para compras, clientes e carrinhos marcados.
export function SeloTeste() {
  return (
    <span className="rounded-sm bg-ink px-1.5 py-0.5 text-[11.5px] font-semibold tracking-[0.04em] text-white">
      TESTE
    </span>
  )
}

// "Mostrar testes": por padrão as listas escondem o que foi marcado como teste.
export function MostrarTestes({ valor, onMudar }) {
  return (
    <label className="flex min-h-[32px] w-fit cursor-pointer items-center gap-2 text-[13.5px] text-ink-muted">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onMudar(e.target.checked)}
        className="h-4 w-4 accent-signal-deep"
      />
      Mostrar testes
    </label>
  )
}
