'use client'

import { useState } from 'react'

// Primeiro acesso de quem entrou na equipe: a senha provisória foi escolhida
// pelo administrador, então a pessoa troca antes de ver qualquer dado. Até
// trocar, todas as outras rotas da gestão respondem como se não existissem.
const MINIMO = 10

export default function TrocarSenha({ email }) {
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)

  async function trocar(e) {
    e.preventDefault()
    setErro('')
    if (nova.length < MINIMO) return setErro('A senha precisa ter pelo menos ' + MINIMO + ' caracteres.')
    if (nova !== repetir) return setErro('As duas senhas não são iguais.')
    setEnviando(true)
    try {
      const res = await fetch('/api/gestao/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nova }),
      })
      if (res.status === 404) return setErro('Sua sessão acabou. Entre de novo com a senha provisória.')
      const dados = await res.json().catch(() => null)
      if (!res.ok || !dados?.ok) return setErro(dados?.erro || 'Não consegui trocar a senha agora.')
      setPronto(true)
      // Recarrega: agora o layout entrega a gestão completa.
      setTimeout(() => window.location.reload(), 900)
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const campo =
    'w-full rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none'

  return (
    <form onSubmit={trocar} noValidate className="mt-8 max-w-md rounded border border-line bg-white px-5 py-6">
      <h2 className="text-[19px] font-bold text-ink">Crie a sua senha</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
        Você entrou com uma senha provisória. Antes de usar a gestão, escolha uma senha só sua para{' '}
        <span className="break-all font-semibold text-ink">{email}</span>.
      </p>

      <label htmlFor="s-nova" className="mt-5 block text-[13px] text-ink-muted">
        Nova senha (mínimo {MINIMO} caracteres)
      </label>
      <input
        id="s-nova"
        type={mostrar ? 'text' : 'password'}
        autoComplete="new-password"
        value={nova}
        onChange={(e) => setNova(e.target.value)}
        className={campo + ' mt-1'}
      />
      <label htmlFor="s-repetir" className="mt-4 block text-[13px] text-ink-muted">
        Repita a nova senha
      </label>
      <input
        id="s-repetir"
        type={mostrar ? 'text' : 'password'}
        autoComplete="new-password"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
        className={campo + ' mt-1'}
      />
      <label className="mt-3 flex items-center gap-2 text-[13.5px] text-ink-muted">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
        Mostrar senha
      </label>

      {erro && (
        <p role="alert" className="mt-4 text-[14px] text-signal-deep">
          {erro}
        </p>
      )}
      {pronto && (
        <p role="status" className="mt-4 text-[14px] font-semibold text-ink">
          Senha trocada. Abrindo a gestão...
        </p>
      )}

      <button type="submit" disabled={enviando || pronto} className="btn-ink mt-5 w-full !py-3 !text-[15px] disabled:opacity-60">
        {enviando ? 'Salvando...' : 'Salvar senha e continuar'}
      </button>
    </form>
  )
}
