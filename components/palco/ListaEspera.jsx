'use client'

import { useId, useState } from 'react'
import { Botao, Icone } from '@/components/ds'
import Turnstile, { useTurnstile } from '@/components/afiliados/Turnstile'

// Lista de espera do Palco (MUDANÇAS §9, estado "Em breve"): e-mail + onde a
// pessoa vai usar. Grava em POST /api/palco/lista-espera (Turnstile, limite por
// IP, sem e-mail de volta). Quadro escuro: fica no topo preto da vitrine.
const SISTEMAS = [
  ['windows', 'Windows'],
  ['mac', 'Mac'],
  ['celular', 'Celular'],
]

export default function ListaEspera({ lancamento }) {
  const id = useId()
  const anti = useTurnstile()
  const [email, setEmail] = useState('')
  const [sistema, setSistema] = useState('windows')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState('')

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    const endereco = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return setErro('Esse e-mail parece incompleto. Confira o que vem depois do @.')
    if (anti.falta) return setErro('Falta a verificação anti-robô: se apareceu a caixa "Confirme que é humano", marque e envie de novo.')
    setEnviando(true)
    try {
      const res = await fetch('/api/palco/lista-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: endereco, sistema, turnstile: anti.usar() }),
      })
      const dados = await res.json().catch(() => ({}))
      if (res.ok && dados.ok) setPronto(endereco)
      else setErro(dados.erro || 'Não foi possível entrar na lista agora. Tente de novo em instantes.')
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  const quadro = 'flex flex-[0_1_400px] flex-col gap-3.5 border border-dark-frame p-[22px]'

  if (pronto) {
    return (
      <div id="lista-de-espera" role="status" className={quadro}>
        <p className="font-semi-condensed text-[22px] font-[750]">Pronto. Você está na lista.</p>
        <p className="text-[15px] leading-[1.5] text-dark-text-2">
          Avisamos em <strong className="break-all font-semibold text-white">{pronto}</strong> no dia do lançamento do Palco para{' '}
          {SISTEMAS.find(([v]) => v === sistema)[1]}.
        </p>
      </div>
    )
  }

  return (
    <form id="lista-de-espera" onSubmit={enviar} noValidate className={`${quadro} scroll-mt-24`}>
      <p className="font-semi-condensed text-[22px] font-[750]">{lancamento}</p>
      <p className="text-[15px] leading-[1.5] text-dark-text-2">Entre na lista e avisamos no seu e-mail no dia.</p>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className="text-[14px] font-semibold">
          E-mail
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className="box-border h-12 w-full rounded-control border border-dark-border bg-dark-surface px-3.5 text-[16px] text-white transition-colors hover:border-white motion-reduce:transition-none"
        />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-[14px] font-semibold">Onde você vai usar?</legend>
        <div className="grid grid-cols-3 gap-2">
          {SISTEMAS.map(([valor, nome]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={sistema === valor}
              onClick={() => setSistema(valor)}
              className={`min-h-11 rounded-control border px-2 text-[15px] font-semibold transition-colors hover:border-white motion-reduce:transition-none ${
                sistema === valor ? 'border-white bg-white text-ink' : 'border-dark-border text-white'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>
      </fieldset>
      <Turnstile {...anti.props} />
      {erro && (
        <p id={`${id}-erro`} role="alert" className="flex items-start gap-1.5 text-[14px] font-medium leading-[1.45] text-red-text-dark">
          <Icone nome="alerta" tamanho={16} className="mt-[2px]" />
          <span>{erro}</span>
        </p>
      )}
      <Botao type="submit" variante="compra" bloco carregando={enviando}>
        Entrar na lista de espera
      </Botao>
    </form>
  )
}
