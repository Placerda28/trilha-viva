'use client'

import { useEffect, useRef, useState } from 'react'
import { TIPOS_DE_ARQUIVO, textoRetomar, tipoDaMidia } from '@/lib/whatsapp-meta'
import { HORA, PRECO, data, diaChave, nomeDe, tamanhoLegivel } from './whatsappUtil'
import { IconeArquivo } from './WhatsappMensagens'

// Onde a equipe escreve na conversa aberta: texto e anexo dentro da janela de
// 24 h; fora dela, o "Chamar de novo".

const LIMITE = 1000

export default function Compositor({ c, configurado, onEnviado }) {
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const campo = useRef(null)
  const seletor = useRef(null)

  // Trocar de conversa limpa o rascunho, o anexo e o erro da anterior.
  useEffect(() => {
    setTexto('')
    setArquivo(null)
    setErro('')
  }, [c.telefone])

  // Confere tipo e tamanho na hora de escolher, antes de enviar.
  function escolher(novo) {
    if (!novo) return
    const midia = tipoDaMidia(novo.type)
    if (!midia) {
      setErro('Esse tipo de arquivo não vai pelo WhatsApp. Use foto (JPG ou PNG), PDF, documento do Office, áudio ou vídeo MP4.')
      return
    }
    if (novo.size > midia.limite) {
      setErro('Arquivo grande demais: o limite para esse tipo é ' + Math.round(midia.limite / 1048576) + ' MB.')
      return
    }
    setErro('')
    setArquivo(novo)
    campo.current?.focus()
  }

  // Colar uma imagem (Ctrl+V) também anexa, como no WhatsApp Web.
  function colar(e) {
    const colado = e.clipboardData?.files?.[0]
    if (colado) {
      e.preventDefault()
      escolher(colado)
    }
  }

  // O campo cresce com o texto, até umas 6 linhas.
  useEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [texto])

  if (!configurado) {
    return (
      <p className="border-t border-line bg-white px-4 py-3.5 text-center text-[13.5px] text-ink-muted">
        Responder pelo site fica disponível quando o WhatsApp for configurado.
      </p>
    )
  }
  if (!c.janela_aberta) return <ChamarDeNovo c={c} onEnviado={onEnviado} />

  async function enviar(e) {
    if (e) e.preventDefault()
    const limpo = texto.trim()
    if ((!limpo && !arquivo) || enviando) return
    setErro('')
    setEnviando(true)
    try {
      const res = arquivo
        ? await fetch(
            '/api/gestao/whatsapp/anexo?' +
              new URLSearchParams({ telefone: c.telefone, nome: arquivo.name || 'arquivo', legenda: limpo }).toString(),
            { method: 'POST', headers: { 'Content-Type': arquivo.type }, body: arquivo }
          )
        : await fetch('/api/gestao/whatsapp/responder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: c.telefone, texto: limpo }),
          })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo para responder.')
      else if (res.status === 413) setErro('Arquivo grande demais para enviar.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui enviar agora. Tente de novo.')
      else {
        setTexto('')
        setArquivo(null)
        onEnviado()
      }
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
    campo.current?.focus()
  }

  // Enter envia; Shift+Enter quebra a linha (como no WhatsApp Web).
  function tecla(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <form onSubmit={enviar} className="border-t border-line bg-white px-3 py-2.5 sm:px-4">
      {erro && (
        <p role="alert" className="mb-2 rounded border border-signal px-3 py-2 text-[13.5px] font-medium text-signal-deep">
          {erro}
        </p>
      )}
      {arquivo && (
        <div className="mb-2 flex items-center gap-3 rounded border border-line bg-paper px-3 py-2">
          <IconeArquivo className="h-6 w-6 shrink-0 text-ink" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-ink">{arquivo.name || 'Imagem colada'}</p>
            <p className="figs text-[12px] text-ink-muted">
              {tamanhoLegivel(arquivo.size)}
              {tipoDaMidia(arquivo.type)?.tipo === 'audio' ? ' · áudio vai sem legenda' : ' · escreva uma legenda, se quiser'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setArquivo(null)}
            disabled={enviando}
            aria-label="Tirar o anexo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-white hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={seletor}
          type="file"
          accept={TIPOS_DE_ARQUIVO.join(',')}
          className="hidden"
          onChange={(e) => {
            escolher(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => seletor.current?.click()}
          disabled={enviando}
          aria-label="Anexar arquivo"
          title="Anexar foto, PDF, áudio ou vídeo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-paper hover:text-ink disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.4 11.1l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8" />
          </svg>
        </button>
        <label htmlFor={'resposta-' + c.telefone} className="sr-only">
          Mensagem para {nomeDe(c)}
        </label>
        <textarea
          ref={campo}
          id={'resposta-' + c.telefone}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={tecla}
          onPaste={colar}
          maxLength={LIMITE}
          rows={1}
          className="max-h-[150px] min-h-[44px] flex-1 resize-none rounded-[22px] border border-line bg-paper px-4 py-2.5 focus-visible:rounded-[22px] text-[15px] leading-snug text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          placeholder={arquivo ? 'Legenda (opcional)' : 'Mensagem'}
        />
        <button
          type="submit"
          disabled={enviando || (!texto.trim() && !arquivo)}
          aria-label={enviando ? 'Enviando' : 'Enviar no WhatsApp'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-opacity duration-150 disabled:opacity-40"
        >
          {enviando ? (
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z" />
            </svg>
          )}
        </button>
      </div>
      <p className="figs mt-1 flex justify-between px-1 text-[11.5px] text-ink-muted">
        <span className="hidden sm:inline">Enter envia · Shift+Enter quebra a linha</span>
        <span className={texto.length > LIMITE - 100 ? 'font-semibold text-signal-deep' : ''}>
          {texto.length > LIMITE - 200 ? texto.length + '/' + LIMITE : ''}
        </span>
      </p>
    </form>
  )
}

// Fora da janela de 24 h só vai um modelo aprovado pela Meta, pago. A última
// chamada nas últimas 24 h trava o botão (o servidor confere de novo).
function ChamarDeNovo({ c, onEnviado }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => setErro(''), [c.telefone])

  const chamada = [...c.mensagens].reverse().find((m) => m.direcao === 'saida' && m.modelo)
  const quando = data(chamada?.em)
  const recente = quando && Date.now() - quando.getTime() < 86400000

  async function chamar() {
    const previa = textoRetomar(c.nome || c.nome_perfil || '')
    if (!window.confirm('Enviar esta mensagem para ' + nomeDe(c) + '?' + String.fromCharCode(10, 10) + previa + String.fromCharCode(10, 10) + 'Custo: cerca de ' + PRECO + ' (cobrado pela Meta).')) return
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch('/api/gestao/whatsapp/retomar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: c.telefone }),
      })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui enviar agora. Tente de novo.')
      else onEnviado()
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  return (
    <div className="border-t border-line bg-white px-4 py-3 text-center">
      {recente ? (
        <p className="figs text-[13.5px] text-ink-muted">
          Convite enviado {diaChave(quando) === diaChave(new Date()) ? 'hoje' : 'ontem'} às {HORA.format(quando)}. Quando {nomeDe(c)} responder, a conversa abre de novo.
        </p>
      ) : (
        <>
          <p className="text-[13.5px] text-ink-muted">Passaram 24 h da última mensagem do cliente. Para falar de novo, mande um convite para ele responder.</p>
          <button
            type="button"
            onClick={chamar}
            disabled={enviando}
            className="btn-ink mt-2.5 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Chamar de novo · ' + PRECO}
          </button>
        </>
      )}
      {erro && (
        <p role="alert" className="mt-2 rounded border border-signal px-3 py-2 text-left text-[13.5px] font-medium text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}
