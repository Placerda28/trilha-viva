'use client'

import { useId, useState } from 'react'
import Turnstile, { CHAVE_TURNSTILE } from './Turnstile'

const campo =
  'mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'
const rotulo = 'block text-[14px] font-semibold text-ink'

// Visitante sem login: nome e e-mail, e o servidor manda o link para criar a
// senha. A resposta é sempre a mesma para quem já tem conta e para quem não
// tem, então a tela não diz qual dos dois aconteceu.
export default function CriarContaAfiliado() {
  const id = useId()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [ciclo, setCiclo] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState('')

  async function enviar(ev) {
    ev.preventDefault()
    setErro('')
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Confira o e-mail.')
    if (CHAVE_TURNSTILE && !token) {
      return setErro('Falta a verificação anti-robô: se apareceu a caixa "Confirme que é humano", marque e envie de novo.')
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/afiliados/conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), turnstile: token }),
      })
      const dados = await res.json().catch(() => ({}))
      if (res.ok && dados.ok) {
        setEnviado(email.trim())
        return
      }
      setErro(dados.erro || 'Não foi possível criar agora. Tente de novo em instantes.')
      setToken('')
      setCiclo((c) => c + 1)
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div role="status" className="bg-white p-7 text-ink sm:p-9">
        <p className="text-[22px] font-bold tracking-[-0.015em]">Enviamos um e-mail para criar sua senha.</p>
        <p className="mt-3 text-[15.5px] leading-[1.65] text-ink-muted">
          Abra a mensagem enviada para <strong className="text-ink">{enviado}</strong> e crie sua senha. Depois é só entrar para
          pegar seu código de afiliado.
        </p>
        <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-muted">
          Não achou? Olhe a caixa de spam e a aba Promoções.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 bg-white p-7 sm:p-9">
      <h2 className="text-[22px] font-bold tracking-[-0.015em] text-ink">Criar minha conta de afiliado</h2>
      <div>
        <label htmlFor={`${id}-nome`} className={rotulo}>
          Seu nome
        </label>
        <input id={`${id}-nome`} name="name" type="text" autoComplete="name" autoCapitalize="words" maxLength={80}
          value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className={rotulo}>
          E-mail
        </label>
        <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off"
          spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com" className={campo} />
      </div>
      <Turnstile onToken={setToken} ciclo={ciclo} />
      {erro && (
        <p role="alert" className="text-[14px] font-semibold text-signal-deep">
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className="btn-signal w-full min-h-[52px] disabled:opacity-60">
        {enviando ? 'Enviando…' : 'Criar minha conta'}
      </button>
    </form>
  )
}
