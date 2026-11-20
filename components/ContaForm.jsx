'use client'

import { useEffect, useState } from 'react'
import { Aviso, Botao, Campo } from '@/components/ds'
import CampoSenha from '@/components/acesso/CampoSenha'
import { LinkEnviado, LinkVencido, SenhaTrocada, TITULO } from '@/components/acesso/Estados'
import { CHAVE_EMAIL_ENTRAR, mascararEmail } from '@/lib/pos-pagamento'
import { voltaPermitida } from '@/lib/afiliados-campos'
import { EMAIL_SUPORTE } from '@/lib/site'

// Uma peça para as telas de conta (MUDANÇAS §6): /entrar, /primeiro-acesso,
// /criar-senha, /recuperar e /redefinir. O que muda entre elas é pouco (quais
// campos aparecem, para onde o formulário vai e o que dizer depois), e manter
// isso junto evita cinco cópias que envelhecem diferente. As rotas da API, as
// regras de senha (mínimo de 8 caracteres) e a validade dos links são as de sempre.
//
// `embutido`: dentro da /sucesso (AccessPanel), sem título nem links de rodapé.
// `emailFixo`: na /sucesso o e-mail vem da compra; aparece travado.
const DESTINO = '/minha-conta/acervo'

const MODOS = {
  entrar: {
    rota: '/api/conta/entrar',
    titulo: 'Entrar',
    sub: 'Use o e-mail da sua compra.',
    botao: 'Entrar',
    enviando: 'Entrando…',
    pedeEmail: true,
    pedeSenha: true,
    confirma: false,
  },
  criar: {
    rota: '/api/conta/criar',
    titulo: 'Crie sua senha',
    sub: 'É o último passo. A conta usa o e-mail da sua compra.',
    botao: 'Criar senha e abrir Minhas VS',
    enviando: 'Criando sua conta…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
  // Comprou e fechou a tela sem criar a senha: pede o link de criar senha.
  primeiro: {
    rota: '/api/conta/primeiro-acesso',
    titulo: 'Primeiro acesso',
    sub: 'Comprou e ainda não criou sua senha? Digite o e-mail que você usou no pagamento. Mandamos um link para criar a senha.',
    botao: 'Enviar link',
    enviando: 'Enviando…',
    pedeEmail: true,
    pedeSenha: false,
    confirma: false,
  },
  recuperar: {
    rota: '/api/conta/recuperar',
    titulo: 'Esqueci a senha',
    sub: 'Digite seu e-mail. Mandamos um link para você criar uma senha nova.',
    botao: 'Enviar link',
    enviando: 'Enviando…',
    pedeEmail: true,
    pedeSenha: false,
    confirma: false,
  },
  redefinir: {
    rota: '/api/conta/redefinir',
    titulo: 'Senha nova',
    sub: 'Escolha a nova senha. Ao salvar, quem estiver logado nesta conta em outros aparelhos será desconectado.',
    botao: 'Salvar senha nova',
    enviando: 'Salvando…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
}

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const LINK = 'inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-[3px]'

// Mensagem do servidor que diz que o link de uso único já foi usado ou venceu.
const linkVencido = (status, texto) => status === 410 || (status === 400 && /link/i.test(texto || ''))

function Rodape({ modo }) {
  if (modo === 'entrar') {
    return (
      <div className="flex flex-col border-t border-line pt-3 text-[15px] text-text-2">
        <p className="flex flex-wrap items-center gap-x-1.5">
          Comprou e ainda não tem senha?{' '}
          <a href="/primeiro-acesso" className={LINK}>
            Fazer o primeiro acesso
          </a>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5">
          Ainda não tem o pacote?{' '}
          <a href="/assinar" className={LINK}>
            Liberar as 2.000 VS
          </a>
        </p>
      </div>
    )
  }
  if (modo === 'redefinir') {
    return (
      <p className="border-t border-line pt-3 text-[15px] text-text-2">
        O link vence em 1 hora e vale uma vez só. Se ele não funcionar mais,{' '}
        <a href="/recuperar" className={LINK}>
          peça outro
        </a>
        .
      </p>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 border-t border-line pt-3 text-[15px] text-text-2">
      {modo === 'criar' ? 'Já criou a senha antes?' : 'Já tem senha?'}{' '}
      <a href="/entrar" className={LINK}>
        Entrar
      </a>
    </p>
  )
}

export default function ContaForm({ modo, emailFixo = '', embutido = false }) {
  const cfg = MODOS[modo]
  const exigeChave = modo === 'criar' || modo === 'redefinir'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState({}) // { geral, email, senha, senha2 }
  const [aviso, setAviso] = useState(null) // { variante, texto }
  const [enviado, setEnviado] = useState(null) // { mensagem } (primeiro e recuperar)
  const [vencido, setVencido] = useState(false)
  const [trocada, setTrocada] = useState(false)
  const [chave, setChave] = useState(null) // { token, sessionId, paymentId, ref, volta }

  // O endereço é lido no navegador, e não no servidor, de propósito: ler
  // parâmetro no servidor obrigaria a montar a página a cada visita, e essas
  // telas ficam prontas de antemão.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setChave({
      token: p.get('t') || '',
      sessionId: p.get('session_id') || p.get('s') || '',
      paymentId: p.get('payment_id') || '',
      ref: p.get('external_reference') || '',
      // Para onde ir depois de entrar ou criar a senha. Só passa um caminho da
      // lista fechada de lib/afiliados-campos.js; qualquer outro vira Minhas VS.
      volta: voltaPermitida(p.get('volta')),
    })
    if (p.get('criada')) setAviso({ variante: 'ok', texto: 'Senha criada. Entre com ela abaixo.' })
    if (p.get('expirou')) setAviso({ variante: 'info', texto: 'Sua sessão expirou. Entre de novo para continuar.' })
    // Vindo da /sucesso de quem já tem senha: o e-mail chega pela memória da
    // aba (nunca pelo endereço) e é apagado depois de lido.
    if (p.get('ja')) {
      setAviso({ variante: 'info', texto: 'Pagamento confirmado. Você já tem uma senha com este e-mail: entre com ela.' })
      try {
        const guardado = sessionStorage.getItem(CHAVE_EMAIL_ENTRAR)
        if (guardado) setEmail(guardado)
        sessionStorage.removeItem(CHAVE_EMAIL_ENTRAR)
      } catch {
        /* sem memória da aba: a pessoa digita o e-mail */
      }
    }
  }, [])

  const corpo = () =>
    JSON.stringify({
      email,
      senha,
      token: chave.token,
      session_id: chave.sessionId,
      payment_id: chave.paymentId,
      ref: chave.ref,
    })

  // primeiro e recuperar: o servidor responde igual exista a conta ou não.
  async function pedirLink() {
    try {
      const res = await fetch(cfg.rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo() })
      const dados = await res.json().catch(() => ({}))
      // Respeitar o erro do servidor aqui é essencial: sem isto, uma resposta
      // "o envio de e-mail não está ativo" virava a mesma mensagem de sucesso, e a
      // tela mentia para quem estava esperando o link.
      if (!res.ok || !dados.ok) return { erro: dados.erro || 'Não consegui enviar agora. Tente de novo em instantes.' }
      return { mensagem: dados.mensagem || 'Se existir uma conta com esse e-mail, o link chega em instantes.' }
    } catch {
      return { erro: 'Falha de conexão. Confira sua internet e tente de novo.' }
    }
  }

  async function reenviar() {
    const r = await pedirLink()
    if (r.erro) {
      setEnviado(null)
      setErros({ geral: r.erro })
    } else {
      setEnviado({ mensagem: r.mensagem })
    }
  }

  async function enviar(e) {
    e.preventDefault()
    setErros({})
    setAviso(null)

    const novos = {}
    if (cfg.pedeEmail && !EMAIL_OK.test(email.trim())) {
      novos.email = email.trim() ? 'Esse e-mail parece incompleto. Confira o que vem depois do @.' : 'Escreva o e-mail da sua compra.'
    }
    if (modo === 'entrar' && !senha) novos.senha = 'Escreva a sua senha.'
    if (cfg.confirma && senha.length < 8) novos.senha = 'A senha precisa ter pelo menos 8 caracteres.'
    if (cfg.confirma && !novos.senha && senha !== senha2) novos.senha2 = 'As duas senhas não são iguais.'
    if (Object.keys(novos).length) {
      setErros(novos)
      return
    }

    setEnviando(true)
    if (!cfg.pedeSenha) {
      const r = await pedirLink()
      setEnviando(false)
      if (r.erro) setErros({ geral: r.erro })
      else setEnviado({ mensagem: r.mensagem })
      return
    }

    try {
      const res = await fetch(cfg.rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo() })
      const dados = await res.json().catch(() => ({}))
      if (res.ok && dados.ok) {
        if (modo === 'redefinir') {
          setTrocada(true)
          return
        }
        window.location.href = chave.volta || DESTINO
        return
      }
      if (dados.jaExiste) {
        window.location.href = '/entrar?criada=1' + (chave.volta ? '&volta=' + encodeURIComponent(chave.volta) : '')
        return
      }
      if (exigeChave && linkVencido(res.status, dados.erro)) {
        setVencido(true)
        return
      }
      setErros({ geral: modo === 'entrar' && res.status === 401 ? 'senha-errada' : dados.erro || 'Não consegui concluir agora. Tente de novo.' })
    } catch {
      setErros({ geral: 'Falha de conexão. Confira sua internet e tente de novo.' })
    }
    setEnviando(false)
  }

  // Páginas de link único sem nenhuma chave no endereço: o link está vencido ou
  // incompleto. Até ler o endereço, só reserva o espaço (sem piscar o formulário).
  if (exigeChave && !chave) return <div className="min-h-[320px]" />
  const semChave = exigeChave && !chave.token && !chave.sessionId && !(chave.paymentId && chave.ref)
  if (vencido || semChave) return <LinkVencido modo={modo} />
  if (trocada) return <SenhaTrocada />

  const cabeca = !embutido && (
    <div className="flex flex-col gap-2">
      <h1 className={TITULO}>{cfg.titulo}</h1>
      <p className="text-[16px] leading-[1.5] text-text-2 [text-wrap:pretty]">{cfg.sub}</p>
    </div>
  )

  if (enviado) {
    return (
      <div className="flex flex-col gap-6">
        {cabeca}
        <LinkEnviado
          titulo={`Confira o e-mail ${mascararEmail(email) || email}`}
          texto={enviado.mensagem}
          onReenviar={reenviar}
          extra={
            modo === 'primeiro' && (
              <span className="text-[14px] leading-[1.5] text-text-3">
                Confira se é o mesmo e-mail do pagamento. Ainda sem o link? Escreva para{' '}
                <a href={`mailto:${EMAIL_SUPORTE}`} className="font-semibold text-ink underline underline-offset-[3px]">
                  {EMAIL_SUPORTE}
                </a>
                .
              </span>
            )
          }
        />
        {!embutido && <Rodape modo={modo} />}
      </div>
    )
  }

  const geral =
    erros.geral === 'senha-errada' ? (
      <>
        E-mail ou senha não conferem. Confira e tente de novo, ou{' '}
        <a href="/recuperar" className="font-semibold underline underline-offset-[3px]">
          crie uma senha nova
        </a>
        .
      </>
    ) : (
      erros.geral
    )

  return (
    <div className="flex flex-col gap-6">
      {cabeca}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {aviso && <Aviso variante={aviso.variante}>{aviso.texto}</Aviso>}
        {geral && <Aviso variante="erro">{geral}</Aviso>}

        {emailFixo && !cfg.pedeEmail && (
          <Campo rotulo="E-mail da compra" tipo="email" value={emailFixo} readOnly autoComplete="username" campoClassName="bg-surface" />
        )}
        {cfg.pedeEmail && (
          <Campo
            rotulo="E-mail"
            tipo="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erros.email}
          />
        )}
        {cfg.pedeSenha && (
          <CampoSenha
            rotulo={modo === 'redefinir' ? 'Senha nova' : 'Senha'}
            name="senha"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            mostrar={mostrar}
            onAlternar={() => setMostrar((v) => !v)}
            ajuda={cfg.confirma ? 'Use pelo menos 8 caracteres.' : undefined}
            erro={erros.senha}
            extra={
              modo === 'entrar' && (
                <a href="/recuperar" className="inline-flex min-h-11 items-center text-[14px] text-ink underline underline-offset-[3px]">
                  Esqueci a senha
                </a>
              )
            }
          />
        )}
        {cfg.confirma && (
          <CampoSenha
            rotulo="Repita a senha"
            name="senha2"
            autoComplete="new-password"
            required
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
            mostrar={mostrar}
            erro={erros.senha2}
          />
        )}
        <Botao type="submit" tamanho="lg" bloco carregando={enviando}>
          {enviando ? cfg.enviando : cfg.botao}
        </Botao>
      </form>
      {!embutido && <Rodape modo={modo} />}
    </div>
  )
}
