'use client'

import { useEffect, useRef } from 'react'
import { useGestao } from './useGestao'
import { Aviso } from './Estados'
import { HORA, apelido, data, diaChave, separadorDoDia } from './whatsappUtil'
import { nomeDe, relogio, textoDaMensagem } from './instagramUtil'
import InstagramCompositor from './InstagramCompositor'

// A conversa aberta: mensagens (sempre como texto) e a caixa de resposta.

function Bolha({ m }) {
  const minha = m.direcao === 'saida'
  const d = data(m.em)
  return (
    <li className={'flex ' + (minha ? 'justify-end' : 'justify-start')}>
      <div className={'max-w-[85%] rounded-lg px-3 pb-1.5 pt-2 text-[14.5px] leading-snug sm:max-w-[70%] ' + (minha ? 'rounded-br-sm bg-ink text-white' : 'rounded-bl-sm border border-line bg-white text-ink')}>
        <p className="whitespace-pre-wrap break-words">{textoDaMensagem(m)}</p>
        <p className={'figs mt-0.5 text-right text-[11px] ' + (minha ? 'text-white/70' : 'text-ink-muted')}>
          {minha ? (m.enviado_por === 'app' ? 'pelo celular' : m.enviado_por ? apelido(m.enviado_por) : '') + ' · ' : ''}
          {d ? HORA.format(d) : ''}
        </p>
      </div>
    </li>
  )
}

function Mensagens({ c }) {
  const caixa = useRef(null)
  useEffect(() => {
    if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight
  }, [c.igsid, c.mensagens.length])

  const itens = []
  let dia = ''
  for (const m of c.mensagens) {
    const d = data(m.em)
    if (d && diaChave(d) !== dia) {
      dia = diaChave(d)
      itens.push(
        <li key={'dia-' + dia} className="flex justify-center py-1.5">
          <span className="rounded bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-muted">{separadorDoDia(d)}</span>
        </li>
      )
    }
    itens.push(<Bolha key={m.id} m={m} />)
  }
  return (
    <div ref={caixa} className="min-h-0 flex-1 overflow-y-auto bg-paper px-3 py-4 sm:px-6">
      <ol className="space-y-1.5" aria-label={'Mensagens com ' + nomeDe(c)}>{itens}</ol>
    </div>
  )
}

export default function InstagramConversa({ igsid, configurado, tentativa, onFeito, onVoltar }) {
  const { dados, erro } = useGestao('/api/gestao/instagram?conversa=' + encodeURIComponent(igsid), tentativa)
  const c = dados?.conversa
  if (!c) {
    return erro
      ? <div className="p-4"><Aviso erro={erro} onTentar={onFeito} /></div>
      : <p className="p-6 text-center text-[13.5px] text-ink-muted">{dados ? 'Conversa não encontrada.' : 'Carregando…'}</p>
  }
  const relogioTexto = relogio(c.ultima_entrada_em)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-white px-3 py-2.5 sm:px-4">
        <button type="button" onClick={onVoltar} aria-label="Voltar para as conversas" className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-paper md:hidden">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{nomeDe(c)}</p>
          {c.usuario && <p className="truncate text-[12.5px] text-ink-muted">@{c.usuario}</p>}
        </div>
        <span className={'figs shrink-0 rounded border px-2 py-1 text-[12px] font-semibold ' + (c.janela_aberta ? 'border-ink text-ink' : 'border-line text-ink-muted')}>
          {relogioTexto}
        </span>
      </div>
      <Mensagens c={c} />
      <InstagramCompositor c={c} configurado={configurado} onFeito={onFeito} />
    </div>
  )
}
