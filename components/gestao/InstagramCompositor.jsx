'use client'

import { useEffect, useRef, useState } from 'react'
import { postarGestao } from './AcaoGestao'
import { LIMITE_BYTES, MSG_JANELA, bytesDe, nomeDaSituacao } from './instagramUtil'

// A caixa de resposta. O rascunho da IA já vem dentro dela, editável, com a
// situação e o motivo acima. Tudo é texto puro (nunca HTML). Enviar,
// Descartar e Gerar de novo; com a janela de 24 h vencida, o envio é bloqueado.

function Cabecalho({ r }) {
  if (!r) return null
  return (
    <div className="mb-2 text-[12.5px] text-ink-muted">
      {r.precisa_humano && <p className="font-semibold text-signal-deep">Precisa de você: a IA não deve responder isto sozinha.</p>}
      {r.situacao && <p>Situação: {nomeDaSituacao(r.situacao)}</p>}
      {r.motivo && <p>Motivo: {r.motivo}</p>}
      {r.desatualizado && (
        <p className="font-semibold text-ink">Chegou mensagem nova depois deste rascunho. Confira antes de enviar.</p>
      )}
    </div>
  )
}

export default function InstagramCompositor({ c, configurado, onFeito }) {
  const r = c.rascunho?.status === 'pendente' ? c.rascunho : null
  const [texto, setTexto] = useState(r?.texto || '')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const campo = useRef(null)

  // Rascunho novo (ou outra conversa) troca o texto; recarregar a mesma tela não apaga o que a pessoa digitou.
  useEffect(() => {
    setTexto(r?.texto || '')
    setErro('')
  }, [c.igsid, r?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 220) + 'px'
  }, [texto])

  const bytes = bytesDe(texto)
  const longo = bytes > LIMITE_BYTES
  const fazendo = Boolean(ocupado)

  async function acao(nome, url, corpo, depois) {
    setErro('')
    setAviso('')
    setOcupado(nome)
    const res = await postarGestao(url, corpo)
    setOcupado('')
    if (!res.ok) return setErro(res.erro)
    depois?.(res)
    onFeito()
  }

  const enviar = (e) => {
    e.preventDefault()
    if (!texto.trim() || longo || fazendo) return
    acao('enviar', '/api/gestao/instagram/enviar', { igsid: c.igsid, texto: texto.trim(), rascunho_id: r?.id }, (res) => {
      setTexto('')
      if (res.aviso) setAviso(res.aviso)
    })
  }
  const descartar = () => acao('descartar', '/api/gestao/instagram/descartar', { rascunho_id: r.id })
  const gerarDeNovo = () =>
    acao('regenerar', '/api/gestao/instagram/regenerar', { igsid: c.igsid }, () =>
      setAviso('Pedido feito. O novo rascunho chega em até 10 minutos.'))

  if (!c.janela_aberta) {
    return <p className="border-t border-line bg-white px-4 py-3.5 text-center text-[13.5px] text-ink-muted">{MSG_JANELA}.</p>
  }
  const gerando = c.rascunho?.status === 'gerando'
  const podeTrocar = Boolean(r) || (!gerando && c.mensagens[c.mensagens.length - 1]?.direcao === 'entrada')

  return (
    <form onSubmit={enviar} className="border-t border-line bg-white px-3 py-2.5 sm:px-4">
      {!configurado && <p className="mb-2 text-[13px] text-ink-muted">Enviar fica disponível quando o Instagram for configurado.</p>}
      {gerando && <p className="mb-2 text-[13px] text-ink-muted">A IA está escrevendo um rascunho…</p>}
      {aviso && <p role="status" className="mb-2 text-[13px] text-ink">{aviso}</p>}
      {erro && <p role="alert" className="mb-2 rounded border border-signal px-3 py-2 text-[13.5px] font-medium text-signal-deep">{erro}</p>}
      <Cabecalho r={r} />
      <label htmlFor={'resposta-' + c.igsid} className="sr-only">Resposta para {c.nome || c.usuario || 'o cliente'}</label>
      <textarea
        ref={campo}
        id={'resposta-' + c.igsid}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        className="max-h-[220px] min-h-[88px] w-full resize-none rounded border border-line bg-paper px-3.5 py-2.5 text-[15px] leading-snug text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        placeholder="Escreva a resposta"
      />
      <p className={'figs mt-1 text-right text-[11.5px] ' + (longo ? 'font-semibold text-signal-deep' : 'text-ink-muted')}>
        {bytes}/{LIMITE_BYTES} bytes{longo ? ' · texto longo demais para o Instagram' : ''}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={fazendo || !configurado || longo || !texto.trim()} className="btn-ink min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50">
          {ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}
        </button>
        {r && (
          <button type="button" onClick={descartar} disabled={fazendo} className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px] disabled:opacity-60">
            {ocupado === 'descartar' ? 'Aguarde…' : 'Descartar'}
          </button>
        )}
        {podeTrocar && (
          <button type="button" onClick={gerarDeNovo} disabled={fazendo} className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px] disabled:opacity-60">
            {ocupado === 'regenerar' ? 'Aguarde…' : 'Gerar de novo'}
          </button>
        )}
      </div>
      {podeTrocar && <p className="mt-1 text-[12px] text-ink-muted">Gerar de novo: o novo rascunho chega em até 10 minutos.</p>}
    </form>
  )
}
