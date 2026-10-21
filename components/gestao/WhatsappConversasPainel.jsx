'use client'

import { useState } from 'react'
import { numero } from './formato'
import {
  HORA,
  aguardandoVoce,
  celular,
  combina,
  data,
  diaChave,
  fimDaJanela,
  iniciais,
  nomeDe,
  quandoCurto,
  ultimaMensagem,
} from './whatsappUtil'
import { Mensagens } from './WhatsappMensagens'
import Compositor from './WhatsappCompositor'

// ---------------------------------------------------- conversas ----
// Organizada como o WhatsApp: a lista de conversas à esquerda e a conversa
// aberta à direita. No celular, a lista ocupa a tela; tocar numa conversa
// abre ela, e a seta volta para a lista.

function Avatar({ c, pequeno }) {
  return (
    <span
      aria-hidden="true"
      className={
        'figs flex shrink-0 items-center justify-center rounded-full bg-mist font-bold text-ink ' +
        (pequeno ? 'h-10 w-10 text-[14px]' : 'h-11 w-11 text-[14.5px]')
      }
    >
      {iniciais(c)}
    </span>
  )
}

function ItemDaLista({ c, ativa, onAbrir }) {
  const ultima = ultimaMensagem(c)
  const esperando = aguardandoVoce(c)
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => onAbrir(c.telefone)}
        aria-current={ativa ? 'true' : undefined}
        className={
          'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 ' +
          (ativa ? 'bg-paper' : 'hover:bg-paper/60')
        }
      >
        <Avatar c={c} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-ink">{nomeDe(c)}</span>
            <span className={'figs shrink-0 text-[12px] ' + (esperando ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {quandoCurto(data(c.ultima_em))}
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[13.5px] text-ink-muted">
              {ultima ? (ultima.direcao === 'saida' ? 'Você: ' : '') + ultima.texto : 'Sem mensagens'}
            </span>
            {esperando && (
              <span className="flex shrink-0 items-center">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-signal" />
                <span className="sr-only">esperando resposta</span>
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}

function ConversaAberta({ c, configurado, onEnviado, onVoltar }) {
  const fecha = fimDaJanela(c)
  const hoje = fecha && diaChave(fecha) === diaChave(new Date())
  const janela = c.janela_aberta && fecha
    ? 'Pode responder até ' + (hoje ? '' : quandoCurto(fecha) + ' ') + HORA.format(fecha)
    : 'Janela fechada'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-white px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onVoltar}
          aria-label="Voltar para as conversas"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-paper md:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <Avatar c={c} pequeno />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{nomeDe(c)}</p>
          <p className="figs truncate text-[12.5px] text-ink-muted">
            {celular(c.telefone)}
            {c.email ? ' · ' + c.email : ''}
          </p>
          <p className="figs truncate text-[12px] text-ink-muted sm:hidden">{janela}</p>
        </div>
        <span
          className={
            'figs hidden shrink-0 rounded border px-2 py-1 text-[12px] font-semibold sm:inline-block ' +
            (c.janela_aberta ? 'border-ink text-ink' : 'border-line text-ink-muted')
          }
        >
          {janela}
        </span>
      </div>
      <Mensagens c={c} />
      <Compositor c={c} configurado={configurado} onEnviado={onEnviado} />
    </div>
  )
}

export default function Conversas({ conversas, configurado, onEnviado }) {
  const [aberta, setAberta] = useState(null)
  const [busca, setBusca] = useState('')

  const termo = busca.trim()
  const filtradas = termo ? conversas.filter((c) => combina(c, termo)) : conversas
  const atual = conversas.find((c) => c.telefone === aberta) || null
  const esperando = conversas.filter(aguardandoVoce).length

  return (
    <div className="mt-5 grid h-[min(80vh,760px)] min-h-[480px] overflow-hidden rounded border border-line bg-white md:grid-cols-[340px_1fr]">
      <div className={'min-h-0 flex-col md:flex md:border-r md:border-line ' + (atual ? 'hidden' : 'flex')}>
        <div className="border-b border-line px-3.5 py-3">
          <p className="figs text-[13px] text-ink-muted">
            {numero(conversas.length)} {conversas.length === 1 ? 'conversa' : 'conversas'}
            {esperando ? ' · ' + numero(esperando) + ' esperando resposta' : ''}
          </p>
          <label htmlFor="busca-conversa" className="sr-only">
            Buscar conversa
          </label>
          <input
            id="busca-conversa"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome ou número"
            className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-[14px] focus-visible:rounded-full text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>
        {filtradas.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13.5px] text-ink-muted">Nenhuma conversa encontrada.</p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversas">
            {filtradas.map((c) => (
              <ItemDaLista key={c.telefone} c={c} ativa={c.telefone === aberta} onAbrir={setAberta} />
            ))}
          </ul>
        )}
      </div>
      <div className={'min-h-0 ' + (atual ? 'block' : 'hidden md:block')}>
        {atual ? (
          <ConversaAberta c={atual} configurado={configurado} onEnviado={onEnviado} onVoltar={() => setAberta(null)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-paper px-6 text-center">
            <p className="text-[15px] font-semibold text-ink">Escolha uma conversa</p>
            <p className="mt-1 max-w-xs text-[13.5px] text-ink-muted">
              O ponto vermelho marca quem está esperando resposta. Dá para responder até 24 h depois da última mensagem do cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
