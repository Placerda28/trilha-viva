'use client'

import { useEffect, useRef, useState } from 'react'
import { HORA, apelido, data, diaChave, nomeDe, separadorDoDia } from './whatsappUtil'

// As mensagens da conversa aberta na sub-aba WhatsApp: balões, anexos e o
// separador de cada dia.

export function IconeArquivo({ className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

const ROTULO_MIDIA = { image: 'Foto', sticker: 'Figurinha', audio: 'Áudio', video: 'Vídeo', document: 'Arquivo' }

// O arquivo vem da Meta na hora (rota /midia). Ela guarda por uns 30 dias;
// depois disso, o balão avisa em vez de mostrar uma imagem quebrada.
function Anexo({ m, minha }) {
  const [falhou, setFalhou] = useState(false)
  const src = '/api/gestao/whatsapp/midia?id=' + encodeURIComponent(m.id)
  const tipo = m.midia.tipo
  const tom = minha ? 'border-white/25 text-white' : 'border-line text-ink'

  if (falhou) {
    return (
      <p className={'mb-1 rounded border border-dashed px-2.5 py-2 text-[13px] ' + (minha ? 'border-white/30 text-white/80' : 'border-line text-ink-muted')}>
        {ROTULO_MIDIA[tipo] || 'Arquivo'} indisponível. A Meta guarda os arquivos por cerca de 30 dias.
      </p>
    )
  }
  if (tipo === 'image' || tipo === 'sticker') {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="-mx-1.5 -mt-1 mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={m.texto || ROTULO_MIDIA[tipo]} loading="lazy" onError={() => setFalhou(true)} className="max-h-72 w-full rounded object-cover" />
      </a>
    )
  }
  if (tipo === 'audio') {
    return <audio controls preload="none" src={src} onError={() => setFalhou(true)} className="mb-1 h-10 w-64 max-w-full" />
  }
  if (tipo === 'video') {
    return <video controls preload="metadata" src={src} onError={() => setFalhou(true)} className="-mx-1.5 -mt-1 mb-1 max-h-72 w-full rounded bg-black" />
  }
  return (
    <a href={src} className={'mb-1 flex items-center gap-2.5 rounded border px-2.5 py-2 transition-opacity duration-150 hover:opacity-80 ' + tom}>
      <IconeArquivo className="h-6 w-6 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold">{m.midia.nome || 'Arquivo'}</span>
        <span className={'block text-[12px] ' + (minha ? 'text-white/70' : 'text-ink-muted')}>Baixar</span>
      </span>
    </a>
  )
}

function Bolha({ m }) {
  const minha = m.direcao === 'saida'
  const d = data(m.em)
  return (
    <li className={'flex ' + (minha ? 'justify-end' : 'justify-start')}>
      <div
        className={
          'max-w-[85%] rounded-lg px-3 pb-1.5 pt-2 text-[14.5px] leading-snug sm:max-w-[70%] ' +
          (minha ? 'rounded-br-sm bg-ink text-white' : 'rounded-bl-sm border border-line bg-white text-ink')
        }
      >
        {m.modelo && <p className="mb-1 text-[11.5px] font-semibold text-white/70">Chamar de novo · mensagem paga</p>}
        {m.midia && m.id && <Anexo m={m} minha={minha} />}
        {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
        <p className={'figs mt-0.5 text-right text-[11px] ' + (minha ? 'text-white/70' : 'text-ink-muted')}>
          {minha && m.enviado_por ? apelido(m.enviado_por) + ' · ' : ''}
          {d ? HORA.format(d) : ''}
        </p>
      </div>
    </li>
  )
}

// Mensagens agrupadas por dia, com o separador no meio, como no WhatsApp.
export function Mensagens({ c }) {
  const caixa = useRef(null)
  // Fica no fim da conversa enquanto quem lê não subir para ver o começo,
  // inclusive quando uma foto termina de carregar depois.
  const noFim = useRef(true)
  function descer() {
    const el = caixa.current
    if (el) el.scrollTop = el.scrollHeight
  }
  useEffect(() => {
    noFim.current = true
    descer()
  }, [c.telefone, c.mensagens.length])
  // A caixa muda de tamanho (anexo escolhido, foto carregada, campo que
  // cresce): quem estava no fim continua no fim.
  useEffect(() => {
    const el = caixa.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observador = new ResizeObserver(() => {
      if (noFim.current) descer()
    })
    observador.observe(el)
    if (el.firstElementChild) observador.observe(el.firstElementChild)
    return () => observador.disconnect()
  }, [])

  const itens = []
  let diaAnterior = ''
  c.mensagens.forEach((m, i) => {
    const d = data(m.em)
    const dia = d ? diaChave(d) : ''
    if (d && dia !== diaAnterior) {
      itens.push(
        <li key={'dia-' + dia} className="flex justify-center py-1.5">
          <span className="rounded bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-muted">{separadorDoDia(d)}</span>
        </li>
      )
      diaAnterior = dia
    }
    itens.push(<Bolha key={i} m={m} />)
  })

  return (
    <div
      ref={caixa}
      onScroll={(e) => {
        const el = e.currentTarget
        noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="min-h-0 flex-1 overflow-y-auto bg-paper px-3 py-4 sm:px-6"
    >
      <ol className="space-y-1.5" aria-label={'Mensagens com ' + nomeDe(c)}>
        {itens}
      </ol>
    </div>
  )
}
