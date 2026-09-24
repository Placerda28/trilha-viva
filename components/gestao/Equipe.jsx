'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { dataHora, numero } from './formato'

// Só o master chega aqui: a rota da página e as rotas de dados recusam o
// resto. Esconder a aba no menu é conforto; a trava de verdade é no servidor.

const MINIMO = 10

// Senha provisória legível (sem 0/O, 1/l/I), para ser ditada ou copiada sem
// confusão. crypto.getRandomValues, nunca Math.random.
function gerarSenha(tamanho = 14) {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho))
  let s = ''
  for (const b of bytes) s += letras[b % letras.length]
  return s
}

async function enviar(url, corpo) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const dados = await res.json().catch(() => null)
  return { res, dados }
}

function NovoMembro({ onMudou }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState({ campo: '', msg: '' })
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null) // { email, senha, contaExistente }
  const [copiado, setCopiado] = useState(false)

  async function adicionar(e) {
    e.preventDefault()
    setErro({ campo: '', msg: '' })
    setResultado(null)
    if (senha.length < MINIMO) {
      return setErro({ campo: 'senha', msg: 'A senha provisória precisa ter pelo menos ' + MINIMO + ' caracteres.' })
    }
    setEnviando(true)
    try {
      const { res, dados } = await enviar('/api/gestao/equipe', { email: email.trim(), senha })
      if (res.status === 404) return setErro({ campo: '', msg: 'Sua sessão acabou. Entre de novo para continuar.' })
      if (!res.ok || !dados?.ok) {
        return setErro({ campo: dados?.campo || '', msg: dados?.erro || 'Não consegui adicionar agora.' })
      }
      setResultado({ email: dados.membro.email, senha, contaExistente: Boolean(dados.conta_existente) })
      setEmail('')
      setSenha('')
      onMudou()
    } catch {
      setErro({ campo: '', msg: 'Falha de conexão. Confira a internet e tente de novo.' })
    } finally {
      setEnviando(false)
    }
  }

  const campo = (nome) =>
    'w-full rounded border bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none ' +
    (erro.campo === nome ? 'border-signal-deep' : 'border-line')

  return (
    <form onSubmit={adicionar} noValidate className="mt-8 rounded border border-line bg-white px-4 py-5 sm:px-6">
      <h2 className="text-[17px] font-bold text-ink">Adicionar à equipe</h2>
      <p className="mt-1 text-[14px] text-ink-muted">
        A pessoa vê toda a gestão, menos esta aba. No primeiro acesso ela é obrigada a trocar a senha provisória.
        O acervo fica desligado até você liberar.
      </p>

      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <div>
          <label htmlFor="m-email" className="text-[13px] text-ink-muted">
            E-mail
          </label>
          <input
            id="m-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (erro.campo === 'email') setErro({ campo: '', msg: '' })
            }}
            placeholder="pessoa@exemplo.com"
            aria-invalid={erro.campo === 'email'}
            className={campo('email') + ' mt-1'}
          />
          {erro.campo === 'email' && <p className="mt-1 text-[13px] text-signal-deep">{erro.msg}</p>}
        </div>
        <div>
          <label htmlFor="m-senha" className="text-[13px] text-ink-muted">
            Senha provisória (mínimo {MINIMO})
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="m-senha"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                if (erro.campo === 'senha') setErro({ campo: '', msg: '' })
              }}
              aria-invalid={erro.campo === 'senha'}
              className={campo('senha') + ' font-semibold tracking-[0.02em]'}
            />
            <button
              type="button"
              onClick={() => setSenha(gerarSenha())}
              className="btn-quiet shrink-0 !px-3.5 !py-2.5 !text-[14px]"
            >
              Gerar
            </button>
          </div>
          {erro.campo === 'senha' && <p className="mt-1 text-[13px] text-signal-deep">{erro.msg}</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-4 border-t border-line pt-4">
        <button type="submit" disabled={enviando} className="btn-ink !px-5 !py-3 !text-[14.5px] disabled:opacity-60">
          {enviando ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>

      {erro.msg && !erro.campo && (
        <p role="alert" className="mt-3 text-[14px] text-signal-deep">
          {erro.msg}
        </p>
      )}

      {resultado && (
        <div role="status" className="mt-4 rounded border border-ink px-4 py-4">
          {resultado.contaExistente ? (
            <p className="text-[14.5px] text-ink">
              <strong className="break-all">{resultado.email}</strong> já tinha conta no site. Ela entra na gestão com
              a senha que já usa; a senha provisória não foi usada.
            </p>
          ) : (
            <>
              <p className="text-[14.5px] text-ink">
                Pronto. Passe para <strong className="break-all">{resultado.email}</strong> o endereço{' '}
                <strong>trilhaviva.org/entrar</strong> e a senha provisória abaixo, por um canal seguro (de
                preferência falando, não por e-mail).
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-sm bg-paper px-2 py-1 text-[15px] font-semibold tracking-[0.03em] text-ink">
                  {resultado.senha}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resultado.senha)
                      setCopiado(true)
                      setTimeout(() => setCopiado(false), 2000)
                    } catch {
                      /* a senha continua visível para copiar à mão */
                    }
                  }}
                  className="link-quiet text-[13.5px] font-semibold"
                >
                  {copiado ? 'Copiada' : 'Copiar senha'}
                </button>
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">
                Ela some desta tela ao sair. O site não guarda a senha provisória.
              </p>
            </>
          )}
        </div>
      )}
    </form>
  )
}

function Etiquetas({ m }) {
  return (
    <>
      {!m.ativo && (
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-muted">
          Removido
        </span>
      )}
      {m.ativo && m.precisa_trocar_senha && (
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-muted">
          Ainda não trocou a senha
        </span>
      )}
    </>
  )
}

// Liga/desliga o acervo do membro. É um botão com aria-pressed, não um
// interruptor inventado: a mesma cara dos outros botões da gestão.
function Acervo({ m, onMudou }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  if (!m.ativo) return <span className="text-[13.5px] text-ink-muted">—</span>
  async function alternar() {
    setEnviando(true)
    setErro('')
    try {
      const { res, dados } = await enviar('/api/gestao/equipe/acervo', { id: m.id, libera: !m.libera_acervo })
      if (!res.ok || !dados?.ok) return setErro('Não consegui mudar.')
      onMudou()
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={alternar}
        disabled={enviando}
        aria-pressed={m.libera_acervo}
        aria-label={(m.libera_acervo ? 'Tirar' : 'Liberar') + ' o acervo de ' + m.email}
        className={
          'rounded border px-3 py-1.5 text-[13.5px] font-semibold transition-colors duration-150 disabled:opacity-60 ' +
          (m.libera_acervo ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink')
        }
      >
        {m.libera_acervo ? 'Acervo liberado' : 'Liberar acervo'}
      </button>
      {erro && <span className="text-[13px] text-signal-deep">{erro}</span>}
    </span>
  )
}

function Remover({ m, onMudou }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  if (!m.ativo) return null

  async function remover() {
    setEnviando(true)
    setErro('')
    try {
      const { res, dados } = await enviar('/api/gestao/equipe/remover', { id: m.id })
      if (!res.ok || !dados?.ok) return setErro('Não consegui remover.')
      onMudou()
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="link-quiet text-[13.5px] font-semibold">
        Remover
      </button>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink-muted">Cortar o acesso agora?</span>
      <button
        type="button"
        onClick={remover}
        disabled={enviando}
        className="rounded border border-signal-deep px-2.5 py-1 text-[13px] font-semibold text-signal-deep transition-colors duration-150 hover:bg-signal-deep hover:text-white disabled:opacity-60"
      >
        {enviando ? 'Removendo...' : 'Sim, remover'}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="text-[13px] text-ink-muted hover:text-ink">
        Cancelar
      </button>
      {erro && <span className="text-[13px] text-signal-deep">{erro}</span>}
    </span>
  )
}

function Lista({ itens, onMudou }) {
  return (
    <ul className="mt-6 divide-y divide-line rounded border border-line bg-white">
      {itens.map((m) => (
        <li key={m.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className={'break-all font-semibold ' + (m.ativo ? 'text-ink' : 'text-ink-muted')}>{m.email}</span>
              <Etiquetas m={m} />
            </span>
            <span className="block text-[12.5px] text-ink-muted">
              {m.nome ? m.nome + ' · ' : ''}
              {m.ativo
                ? 'adicionado por ' + m.criado_por + ' em ' + dataHora(m.criado_em).slice(0, 10)
                : 'removido por ' + (m.removido_por || '—') + ' em ' + dataHora(m.removido_em).slice(0, 10)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Acervo m={m} onMudou={onMudou} />
            <Remover m={m} onMudou={onMudou} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Equipe() {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro } = useGestao('/api/gestao/equipe', tentativa)
  const recarregar = () => setTentativa((n) => n + 1)
  const ativos = dados ? dados.itens.filter((m) => m.ativo).length : 0

  return (
    <section aria-labelledby="titulo-equipe">
      <h2 id="titulo-equipe" className="sr-only">
        Equipe
      </h2>
      <NovoMembro onMudou={recarregar} />

      <h3 className="mt-10 text-[17px] font-bold text-ink">
        Equipe {dados && <span className="figs font-normal text-ink-muted">({numero(ativos)} com acesso)</span>}
      </h3>
      <p className="mt-1 text-[14px] text-ink-muted">
        Você, como administrador master, não aparece aqui: esse papel vem da configuração do site e não pode ser
        tirado nem dado por esta tela.
      </p>
      {erro ? (
        <Aviso erro={erro} onTentar={recarregar} />
      ) : !dados ? (
        <Esqueleto linhas={2} />
      ) : dados.itens.length === 0 ? (
        <Vazio titulo="Ninguém na equipe ainda" texto="Adicione alguém acima para dividir o trabalho da gestão." />
      ) : (
        <Lista itens={dados.itens} onMudou={recarregar} />
      )}
    </section>
  )
}
