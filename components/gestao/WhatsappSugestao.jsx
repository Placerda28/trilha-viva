'use client'

import { useEffect, useState } from 'react'
import { dataHora } from './formato'
import { postarGestao } from './AcaoGestao'

// Sugestão da IA acima do compositor do WhatsApp. A IA só escreve; nada sai
// sem o clique em Enviar. Texto puro, editável.

const LIMITE = 1000

export default function SugestaoIa({ c, onFeito }) {
  const r = c.rascunho
  const pendente = r?.status === 'pendente' ? r : null
  const [texto, setTexto] = useState(pendente?.texto || '')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  // Sugestão nova (ou outra conversa) troca o texto; recarregar não apaga o que foi digitado.
  useEffect(() => {
    setTexto(pendente?.texto || '')
    setErro('')
  }, [c.telefone, pendente?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r || !c.janela_aberta) return null
  if (r.status === 'gerando') {
    return <p className="border-t border-line bg-paper px-4 py-2.5 text-[13px] text-ink-muted">A IA está escrevendo sugestão…</p>
  }

  async function acao(nome, url, corpo, depois) {
    setErro('')
    setAviso('')
    setOcupado(nome)
    const res = await postarGestao(url, corpo)
    setOcupado('')
    if (!res.ok) return setErro(res.erro)
    depois?.()
    onFeito()
  }

  const trocar = () =>
    acao('regenerar', '/api/gestao/whatsapp/rascunho/regenerar', { telefone: c.telefone }, () =>
      setAviso('Pedido feito. A nova sugestão chega em até 10 minutos.'))
  const fazendo = Boolean(ocupado)
  const botaoTrocar = (
    <button type="button" onClick={trocar} disabled={fazendo} className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px] disabled:opacity-60">
      {ocupado === 'regenerar' ? 'Aguarde…' : 'Gerar outra'}
    </button>
  )

  if (r.status === 'falhou') {
    return (
      <div className="border-t border-line bg-paper px-3 py-2.5 sm:px-4">
        <p className="text-[13px] text-ink-muted">A IA não conseguiu escrever uma sugestão para esta pergunta.</p>
        {erro && <p role="alert" className="mt-1 text-[13px] text-signal-deep">{erro}</p>}
        {aviso && <p role="status" className="mt-1 text-[13px] text-ink">{aviso}</p>}
        <div className="mt-1">{botaoTrocar}</div>
      </div>
    )
  }

  const longo = texto.length > LIMITE
  return (
    <div className="border-t border-line bg-paper px-3 py-2.5 sm:px-4">
      <p className="text-[12.5px] font-semibold text-ink">Sugestão da IA <span className="font-normal text-ink-muted">· {dataHora(r.criado_em)}</span></p>
      {r.precisa_humano && (
        <p className="mt-1 text-[12.5px] font-semibold text-signal-deep">
          Precisa de você: a IA não deve responder isto sozinha.{r.motivo ? ' Motivo: ' + r.motivo : ''}
        </p>
      )}
      {r.desatualizado && <p className="mt-1 text-[12.5px] font-semibold text-ink">Chegou mensagem nova depois desta sugestão. Confira antes de enviar.</p>}
      {aviso && <p role="status" className="mt-1 text-[13px] text-ink">{aviso}</p>}
      {erro && <p role="alert" className="mt-1 rounded border border-signal px-3 py-2 text-[13.5px] font-medium text-signal-deep">{erro}</p>}
      <label htmlFor={'sugestao-' + c.telefone} className="sr-only">Sugestão da IA para {c.nome || c.nome_perfil || 'o cliente'}</label>
      <textarea
        id={'sugestao-' + c.telefone}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        className="mt-1.5 max-h-[220px] min-h-[76px] w-full resize-y rounded border border-line bg-white px-3.5 py-2.5 text-[15px] leading-snug text-ink focus:border-ink focus:outline-none"
      />
      <p className={'figs mt-1 text-right text-[11.5px] ' + (longo ? 'font-semibold text-signal-deep' : 'text-ink-muted')}>{texto.length}/{LIMITE}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={fazendo || longo || !texto.trim()}
          onClick={() => acao('enviar', '/api/gestao/whatsapp/rascunho/enviar', { telefone: c.telefone, texto: texto.trim(), rascunho_id: r.id })}
          className="btn-ink min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50"
        >
          {ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          type="button"
          disabled={fazendo}
          onClick={() => acao('descartar', '/api/gestao/whatsapp/rascunho/descartar', { rascunho_id: r.id })}
          className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px] disabled:opacity-60"
        >
          {ocupado === 'descartar' ? 'Aguarde…' : 'Descartar'}
        </button>
        {botaoTrocar}
      </div>
    </div>
  )
}

// Interruptor da IA de sugestões (só o master consegue mudar; o servidor confere).
export function InterruptorIa({ ia, onMudou }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const ligada = Boolean(ia?.ia_ligada)

  async function mudar() {
    setErro('')
    setEnviando(true)
    const r = await postarGestao('/api/gestao/whatsapp/ia', { ia_ligada: !ligada })
    setEnviando(false)
    if (r.ok) onMudou()
    else setErro(r.erro)
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-muted">IA de sugestões</p>
        <p className="text-[16px] font-bold text-ink">{ligada ? 'Ligada: escrevendo sugestões' : 'Pausada'}</p>
        <p className="text-[13px] text-ink-muted">A IA só sugere a resposta. Nada sai para o cliente sem o seu clique em Enviar.</p>
        {ia?.atualizado_por && ia?.atualizado_em && (
          <p className="figs text-[12.5px] text-ink-faint">Última mudança: {dataHora(ia.atualizado_em)} · {ia.atualizado_por}</p>
        )}
      </div>
      <button type="button" onClick={mudar} disabled={enviando} className={(ligada ? 'btn-quiet' : 'btn-ink') + ' min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-60'}>
        {enviando ? 'Aguarde…' : ligada ? 'Pausar a IA' : 'Ligar a IA'}
      </button>
      {erro && <p role="alert" className="w-full text-[13.5px] text-signal-deep">{erro}</p>}
    </div>
  )
}
