'use client'

import { useEffect, useState } from 'react'
import { useGestao } from './useGestao'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { numero } from './formato'
import { data, quandoCurto } from './whatsappUtil'
import { combina, iniciais, nomeDe, relogio } from './instagramUtil'
import InstagramConversa from './InstagramConversa'
import InstagramEstado from './InstagramEstado'
import InstagramQualidade from './InstagramQualidade'

// Aba Instagram: lista de conversas à esquerda e a conversa à direita (no
// celular, lista -> conversa). A IA só escreve rascunhos; quem envia é você.

const ATUALIZAR_MS = 30000

function Selo({ c }) {
  if (c.precisa_humano) return <span className="shrink-0 rounded border border-signal px-1.5 py-0.5 text-[11px] font-semibold text-signal-deep">Precisa de você</span>
  if (c.rascunho_pendente) return <span className="shrink-0 rounded border border-ink px-1.5 py-0.5 text-[11px] font-semibold text-ink">Rascunho pronto</span>
  return null
}

function ItemDaLista({ c, ativa, onAbrir }) {
  const u = c.ultima
  const previa = u.texto || (u.midia_tipo ? '[mídia]' : '')
  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={() => onAbrir(c.igsid)} aria-current={ativa ? 'true' : undefined} className={'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 ' + (ativa ? 'bg-paper' : 'hover:bg-paper/60')}>
        <span aria-hidden="true" className="figs flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-[14.5px] font-bold text-ink">{iniciais(c)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-ink">{nomeDe(c)}</span>
            <span className={'figs shrink-0 text-[12px] ' + (c.esperando ? 'font-semibold text-ink' : 'text-ink-muted')}>{quandoCurto(data(c.ultima_em))}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13.5px] text-ink-muted">{(u.direcao === 'saida' ? 'Você: ' : '') + previa}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <Selo c={c} />
            {c.janela_aberta && <span className="figs text-[12px] text-ink-muted">{relogio(c.ultima_entrada_em)}</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function Instagram() {
  const [tentativa, setTentativa] = useState(0)
  const [aberta, setAberta] = useState(null)
  const [busca, setBusca] = useState('')
  const { dados, erro } = useGestao('/api/gestao/instagram', tentativa)
  const recarregar = () => setTentativa((n) => n + 1)

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') recarregar()
    }, ATUALIZAR_MS)
    return () => clearInterval(id)
  }, [])

  if (erro && !dados) return <section className="mt-8"><Aviso erro={erro} onTentar={recarregar} /></section>
  if (!dados) return <section className="mt-8"><Esqueleto linhas={4} /></section>

  const termo = busca.trim()
  const lista = termo ? dados.conversas.filter((c) => combina(c, termo)) : dados.conversas
  const esperando = dados.conversas.filter((c) => c.esperando).length

  return (
    <section aria-labelledby="titulo-instagram" className="mt-8">
      <h2 id="titulo-instagram" className="sr-only">Instagram</h2>
      <InstagramEstado estado={dados.estado} onMudou={recarregar} />
      <InstagramQualidade tentativa={tentativa} />
      {dados.conversas.length === 0 ? (
        <Vazio titulo="Nenhuma conversa ainda" texto="Quando alguém mandar uma mensagem no Direct do Instagram, a conversa aparece aqui." />
      ) : (
        <div className="grid h-[calc(100dvh-9rem-5.5rem-env(safe-area-inset-bottom))] min-h-0 overflow-hidden rounded border border-line bg-white md:h-[calc(100dvh-9.5rem-2.5rem)] md:grid-cols-[minmax(220px,340px)_minmax(0,1fr)]">
          <div className={'min-h-0 min-w-0 flex-col md:flex md:border-r md:border-line ' + (aberta ? 'hidden' : 'flex')}>
            <div className="border-b border-line px-3.5 py-3">
              <p className="figs text-[13px] text-ink-muted">
                {numero(dados.conversas.length)} {dados.conversas.length === 1 ? 'conversa' : 'conversas'}
                {esperando ? ' · ' + numero(esperando) + ' esperando resposta' : ''}
              </p>
              <label htmlFor="busca-instagram" className="sr-only">Buscar conversa</label>
              <input id="busca-instagram" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou @" className="mt-2 min-h-11 w-full rounded-full border border-line bg-paper px-4 py-2 text-[14px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none" />
            </div>
            {lista.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13.5px] text-ink-muted">Nenhuma conversa encontrada.</p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversas">
                {lista.map((c) => <ItemDaLista key={c.igsid} c={c} ativa={c.igsid === aberta} onAbrir={setAberta} />)}
              </ul>
            )}
          </div>
          <div className={'min-h-0 min-w-0 ' + (aberta ? 'block' : 'hidden md:block')}>
            {aberta ? (
              <InstagramConversa key={aberta} igsid={aberta} configurado={dados.configurado} tentativa={tentativa} onFeito={recarregar} onVoltar={() => setAberta(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-paper px-6 text-center">
                <p className="text-[15px] font-semibold text-ink">Escolha uma conversa</p>
                <p className="mt-1 max-w-xs text-[13.5px] text-ink-muted">Dá para responder até 24 h depois da última mensagem do cliente. O rascunho da IA já vem na caixa de resposta.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
