'use client'

import { useId, useState } from 'react'

// "Corrigir e-mail" de um cliente (e-mail digitado errado na compra) e, logo
// depois, "Reenviar acesso" para o endereço novo. O servidor troca o e-mail
// em tudo que é do cliente e recusa e-mail que já é de outra pessoa.

async function postar(url, corpo) {
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

export default function CorrigirEmail({ c, onMudou }) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState(c.email)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [corrigido, setCorrigido] = useState('')
  const [envio, setEnvio] = useState({ estado: '', texto: '' })

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const r = await postar('/api/gestao/clientes/email', { id: c.id, email })
    setSalvando(false)
    if (!r.ok) return setErro(r.erro)
    setCorrigido(r.email)
    setAberto(false)
    onMudou?.()
  }

  async function reenviar() {
    setErro('')
    setEnvio({ estado: 'enviando', texto: '' })
    const r = await postar('/api/gestao/clientes/acesso', { id: c.id })
    setEnvio(
      r.ok
        ? { estado: 'ok', texto: 'Acesso enviado para ' + r.para + (r.tipo === 'redefinir_senha' ? ' (link de redefinir a senha).' : ' (link de criar a senha).') }
        : { estado: 'erro', texto: r.erro }
    )
  }

  if (corrigido) {
    return (
      <div className="mt-2 space-y-2 text-[13.5px]" aria-live="polite">
        <p className="text-ink">
          E-mail corrigido para <span className="break-all font-semibold">{corrigido}</span>.
        </p>
        {envio.estado !== 'ok' && (
          <button
            type="button"
            onClick={reenviar}
            disabled={envio.estado === 'enviando'}
            className="btn-ink !px-4 !py-2 !text-[13.5px] disabled:opacity-60"
          >
            {envio.estado === 'enviando' ? 'Enviando…' : 'Reenviar acesso'}
          </button>
        )}
        {envio.texto && (
          <p role={envio.estado === 'erro' ? 'alert' : undefined} className={envio.estado === 'erro' ? 'text-signal-deep' : 'text-ink'}>
            {envio.texto}
          </p>
        )}
      </div>
    )
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setEmail(c.email)
          setErro('')
          setAberto(true)
        }}
        className="mt-1.5 min-h-[32px] text-[13px] font-semibold text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
      >
        Corrigir e-mail
      </button>
    )
  }

  return (
    <form onSubmit={salvar} className="mt-2 space-y-2">
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
        E-mail correto
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="off"
        spellCheck={false}
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? id + '-erro' : undefined}
        className="w-full min-w-0 rounded border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none"
      />
      {erro && (
        <p id={id + '-erro'} role="alert" className="text-[13px] text-signal-deep">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={salvando} className="btn-ink !px-4 !py-2 !text-[13.5px] disabled:opacity-60">
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={salvando}
          className="btn-quiet !px-4 !py-2 !text-[13.5px] disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
      {/* O e-mail já está certo e só falta o acesso chegar. */}
      {envio.estado !== 'ok' && (
        <button
          type="button"
          onClick={reenviar}
          disabled={salvando || envio.estado === 'enviando'}
          className="min-h-[32px] text-[13px] font-semibold text-ink-muted underline decoration-line underline-offset-2 hover:text-ink disabled:opacity-60"
        >
          {envio.estado === 'enviando' ? 'Enviando…' : 'Só reenviar o acesso para ' + c.email}
        </button>
      )}
      {envio.texto && (
        <p role={envio.estado === 'erro' ? 'alert' : undefined} aria-live="polite" className={'break-all text-[13.5px] ' + (envio.estado === 'erro' ? 'text-signal-deep' : 'text-ink')}>
          {envio.texto}
        </p>
      )}
    </form>
  )
}
