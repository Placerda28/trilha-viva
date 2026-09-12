'use client'

import { useEffect, useState } from 'react'

// Uma peça para as quatro telas de conta. O que muda entre elas é pouco —
// quais campos aparecem, para onde o formulário vai e o que dizer depois —
// e manter isso junto evita quatro cópias que envelhecem diferente.
const MODOS = {
  entrar: {
    rota: '/api/conta/entrar',
    botao: 'Entrar',
    enviando: 'Entrando…',
    pedeEmail: true,
    pedeSenha: true,
    confirma: false,
  },
  criar: {
    rota: '/api/conta/criar',
    botao: 'Criar senha e abrir o acervo',
    enviando: 'Criando sua conta…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
  recuperar: {
    rota: '/api/conta/recuperar',
    botao: 'Enviar link de redefinição',
    enviando: 'Enviando…',
    pedeEmail: true,
    pedeSenha: false,
    confirma: false,
  },
  redefinir: {
    rota: '/api/conta/redefinir',
    botao: 'Salvar nova senha',
    enviando: 'Salvando…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
}

const campo =
  'mt-2 w-full rounded border border-line bg-white px-4 py-3.5 text-[15.5px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'

export default function ContaForm({ modo }) {
  const cfg = MODOS[modo]

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [pronto, setPronto] = useState('')
  const [token, setToken] = useState('')
  const [sessionId, setSessionId] = useState('')

  // O endereço é lido no navegador, e não no servidor, de propósito: ler
  // parâmetro no servidor obrigaria a montar a página a cada visita, e essas
  // telas ficam prontas de antemão.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setToken(p.get('t') || '')
    setSessionId(p.get('session_id') || p.get('s') || '')
    if (p.get('criada')) setAviso('Senha criada. Entre com ela abaixo.')
    if (p.get('expirou')) setAviso('Sua sessão expirou. Entre de novo para continuar.')
  }, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')

    if (cfg.pedeSenha && senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (cfg.confirma && senha !== senha2) {
      setErro('As duas senhas não são iguais.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(cfg.rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, token, session_id: sessionId }),
      })
      const dados = await res.json().catch(() => ({}))

      if (modo === 'recuperar') {
        setPronto(dados.mensagem || 'Se existir uma conta com esse e-mail, o link chega em instantes.')
        setEnviando(false)
        return
      }

      if (!res.ok || !dados.ok) {
        if (dados.jaExiste) {
          window.location.href = '/entrar?criada=1'
          return
        }
        setErro(dados.erro || 'Não consegui concluir agora. Tente de novo.')
        setEnviando(false)
        return
      }

      window.location.href = '/acervo'
    } catch {
      setErro('Falha de conexão. Confira sua internet e tente de novo.')
      setEnviando(false)
    }
  }

  if (pronto) {
    return (
      <div className="card-cut bg-white px-6 py-7">
        <p className="text-[15px] leading-relaxed text-ink">{pronto}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          Não chegou em alguns minutos? Confira a caixa de spam ou a aba Promoções.
        </p>
        <a href="/entrar" className="link-signal mt-5 inline-block text-[14px] font-semibold">
          Voltar para a entrada
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {aviso && (
        <p className="rounded border-l-4 border-ink bg-mist px-4 py-3 text-[14px] text-ink">{aviso}</p>
      )}

      {cfg.pedeEmail && (
        <div>
          <label htmlFor="email" className="block text-[13px] font-semibold text-ink">
            E-mail da compra
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={campo}
          />
        </div>
      )}

      {cfg.pedeSenha && (
        <div>
          <label htmlFor="senha" className="block text-[13px] font-semibold text-ink">
            {modo === 'entrar' ? 'Sua senha' : 'Escolha uma senha'}
          </label>
          <input
            id="senha"
            name="senha"
            type={mostrar ? 'text' : 'password'}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={modo === 'entrar' ? 'Sua senha' : 'Pelo menos 8 caracteres'}
            className={campo}
          />
        </div>
      )}

      {cfg.confirma && (
        <div>
          <label htmlFor="senha2" className="block text-[13px] font-semibold text-ink">
            Repita a senha
          </label>
          <input
            id="senha2"
            name="senha2"
            type={mostrar ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
            placeholder="A mesma senha de novo"
            className={campo}
          />
        </div>
      )}

      {cfg.pedeSenha && (
        <label className="flex items-center gap-2 text-[13px] text-ink-muted">
          <input
            type="checkbox"
            checked={mostrar}
            onChange={(e) => setMostrar(e.target.checked)}
            className="h-4 w-4 accent-signal-deep"
          />
          Mostrar senha
        </label>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded border-l-4 border-signal bg-signal-wash px-4 py-3 text-[14px] font-medium text-ink"
        >
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn-signal w-full disabled:opacity-60">
        {enviando ? cfg.enviando : cfg.botao}
      </button>

      {modo === 'entrar' && (
        <p className="text-center text-[13px] text-ink-muted">
          <a href="/recuperar" className="link-signal font-semibold">
            Esqueci minha senha
          </a>
        </p>
      )}
    </form>
  )
}
