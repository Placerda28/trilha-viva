'use client'

import { useEffect, useRef, useState } from 'react'
import { useGestao } from './useGestao'
import SubAbasRecuperacao from './SubAbasRecuperacao'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { dataHora, moeda, numero } from './formato'
import SequenciaWhatsapp from './SequenciaWhatsapp'
import { CUSTO_MENSAGEM_CENTAVOS, TIPOS_DE_ARQUIVO, textoRetomar, tipoDaMidia } from '@/lib/whatsapp-meta'

// Sub-aba WhatsApp da Recuperação, em três partes: Conversas (lista e
// conversa aberta, como no WhatsApp), Sequências (em que ponto está cada
// pessoa, com "Parar sequência") e Resultado (ligar/pausar e os números).
// A Meta só deixa responder com texto livre até 24 h depois da última
// mensagem do cliente; o servidor confere isso de novo.

const LIMITE = 1000

const ESTADOS = {
  aguardando_modelo: {
    titulo: 'Aguardando aprovação da Meta',
    texto: 'Nenhum cliente recebe ainda. Quando a Meta aprovar o modelo, um teste vai para o seu celular e o e-mail do suporte recebe o botão LIGAR.',
  },
  teste_enviado: {
    titulo: 'Teste enviado — falta ligar',
    texto: 'Confira a mensagem de teste no seu celular. Se estiver tudo certo, ligue aqui ou pelo link do e-mail.',
  },
  ativo: {
    titulo: 'Ligado',
    texto: 'Quem abandona o carrinho recebe a 1ª mensagem 3 h depois e depois 1 por semana, até 9 (das 9h às 20h, nunca no dia de um e-mail). Um resumo chega por e-mail todo dia.',
  },
  pausado: {
    titulo: 'Pausado',
    texto: 'Nenhum cliente recebe lembrete pelo WhatsApp. As conversas continuam funcionando.',
  },
}

function EstadoWhatsapp({ estado, onMudou }) {
  const [enviando, setEnviando] = useState('')
  const [erro, setErro] = useState('')
  const info = ESTADOS[estado.estado] || ESTADOS.aguardando_modelo

  async function mudar(acao) {
    setErro('')
    setEnviando(acao)
    try {
      const res = await fetch('/api/gestao/whatsapp/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui mudar agora. Tente de novo.')
      else onMudou()
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando('')
  }

  const botao = (acao, rotulo, principal) => (
    <button
      type="button"
      onClick={() => mudar(acao)}
      disabled={Boolean(enviando)}
      className={(principal ? 'btn-ink' : 'btn-quiet') + ' !px-5 !py-2.5 !text-[14.5px] disabled:opacity-60'}
    >
      {enviando === acao ? 'Aguarde…' : rotulo}
    </button>
  )

  return (
    <div className="mb-5 rounded border border-line bg-white px-4 py-4 sm:px-5">
      <p className="text-[13px] text-ink-muted">WhatsApp</p>
      <p className="mt-0.5 text-[17px] font-bold text-ink">{info.titulo}</p>
      <p className="mt-1 text-[13.5px] text-ink-muted">{info.texto}</p>
      {estado.atualizado_por && estado.atualizado_em && (
        <p className="figs mt-1 text-[12.5px] text-ink-faint">
          Última mudança: {dataHora(estado.atualizado_em)} · {estado.atualizado_por}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {estado.estado === 'teste_enviado' && botao('ligar', 'Ligar', true)}
        {(estado.estado === 'ativo' || estado.estado === 'teste_enviado') && botao('pausar', 'Pausar', estado.estado === 'ativo')}
        {estado.estado === 'pausado' && botao('retomar', 'Retomar', true)}
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-[13.5px] text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}

function celular(digitos) {
  const d = String(digitos || '')
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return d
}

function Total({ rotulo, valor, detalhe, className = '' }) {
  return (
    <div className={'bg-white px-4 py-4 sm:px-5 ' + className}>
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

function porcentagem(parte, todo) {
  return todo ? Math.round((parte / todo) * 100) + '%' : '—'
}

// Uma pessoa da sequência: em que mensagem está, a próxima ou por que parou,
// e os botões Parar / Retomar.
function Sequencia({ s, onMudou }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const quem = s.nome || celular(s.telefone)

  async function mudar(acao) {
    if (acao === 'parar' && !window.confirm('Parar a sequência de ' + quem + '? Ela não recebe mais nenhuma mensagem de lembrete.')) return
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch('/api/gestao/whatsapp/sequencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: s.telefone, acao }),
      })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui mudar agora. Tente de novo.')
      else onMudou()
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{s.nome || 'Sem nome'}</p>
        <p className="figs break-all text-[13.5px] text-ink-muted">
          {celular(s.telefone)} · {s.email}
        </p>
        <p className="figs mt-1 text-[13px] font-semibold text-ink">
          Mensagem {s.enviadas} de {s.total}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <SequenciaWhatsapp w={s} />
        {(s.pode_parar || s.pode_retomar) && (
          <button
            type="button"
            onClick={() => mudar(s.pode_parar ? 'parar' : 'retomar')}
            disabled={enviando}
            className="btn-quiet !px-4 !py-2 !text-[13.5px] disabled:opacity-60 sm:self-end"
          >
            {enviando ? 'Aguarde…' : s.pode_parar ? 'Parar sequência' : 'Retomar sequência'}
          </button>
        )}
        {erro && (
          <p role="alert" className="text-[13px] text-signal-deep">
            {erro}
          </p>
        )}
      </div>
    </li>
  )
}

// ---------------------------------------------------- conversas ----
// Organizada como o WhatsApp: a lista de conversas à esquerda e a conversa
// aberta à direita. No celular, a lista ocupa a tela; tocar numa conversa
// abre ela, e a seta volta para a lista.

const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
const DIA_CHAVE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
const DIA_CURTO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
const DIA_LONGO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })
const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const ATUALIZAR_MS = 30000

function data(iso) {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? null : d
}

function diaChave(d) {
  return DIA_CHAVE.format(d)
}

function ontemChave() {
  return diaChave(new Date(Date.now() - 86400000))
}

// "14:32" hoje, "Ontem", ou "03/10".
function quandoCurto(d) {
  if (!d) return ''
  const dia = diaChave(d)
  if (dia === diaChave(new Date())) return HORA.format(d)
  if (dia === ontemChave()) return 'Ontem'
  return DIA_CURTO.format(d)
}

function separadorDoDia(d) {
  const dia = diaChave(d)
  if (dia === diaChave(new Date())) return 'Hoje'
  if (dia === ontemChave()) return 'Ontem'
  return DIA_LONGO.format(d)
}

function nomeDe(c) {
  return c.nome || c.nome_perfil || celular(c.telefone)
}

function iniciais(c) {
  const partes = String(c.nome || c.nome_perfil || '').trim().split(' ').filter(Boolean)
  if (!partes.length) return '#'
  const primeira = partes[0][0] || ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] || '' : ''
  return (primeira + ultima).toUpperCase()
}

// Quem respondeu pela equipe: só a parte antes do @.
function apelido(email) {
  return String(email || '').split('@')[0]
}

function ultimaMensagem(c) {
  return c.mensagens.length ? c.mensagens[c.mensagens.length - 1] : null
}

// A última mensagem é do cliente e ainda dá para responder (janela de 24 h).
function aguardandoVoce(c) {
  return c.janela_aberta && ultimaMensagem(c)?.direcao === 'entrada'
}

function fimDaJanela(c) {
  const d = data(c.ultima_entrada_em)
  return d ? new Date(d.getTime() + 86400000) : null
}

// Busca pelo começo de qualquer parte do nome (sem ligar para acento) ou por
// 3+ dígitos do número.
function combina(c, termo) {
  const nome = String(c.nome || c.nome_perfil || '')
  const pedaco = (texto) => COLLATOR.compare(texto.slice(0, termo.length), termo) === 0
  if (nome.split(' ').some(pedaco) || pedaco(nome)) return true
  const digitos = termo.split('').filter((x) => x >= '0' && x <= '9').join('')
  return digitos.length >= 3 && String(c.telefone).includes(digitos)
}

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

function tamanhoLegivel(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'
}

function IconeArquivo({ className = 'h-5 w-5' }) {
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
function Mensagens({ c }) {
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

function Compositor({ c, configurado, onEnviado }) {
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

const PRECO = 'R$ ' + (CUSTO_MENSAGEM_CENTAVOS / 100).toFixed(2).replace('.', ',')

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

function Conversas({ conversas, configurado, onEnviado }) {
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

// ---------------------------------------------------------- aba ----

const PARTES = [
  { id: 'conversas', rotulo: 'Conversas' },
  { id: 'sequencias', rotulo: 'Sequências' },
  { id: 'resultado', rotulo: 'Resultado' },
]

export default function WhatsappConversas() {
  const [tentativa, setTentativa] = useState(0)
  const [parte, setParte] = useState('conversas')
  const { dados, erro, carregando } = useGestao('/api/gestao/whatsapp', tentativa)
  const t = dados?.totais
  const recarregar = () => setTentativa((n) => n + 1)

  // Mensagens novas chegam sozinhas: recarrega a cada 30 s com a aba à vista.
  useEffect(() => {
    if (parte !== 'conversas') return undefined
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setTentativa((n) => n + 1)
    }, ATUALIZAR_MS)
    return () => clearInterval(id)
  }, [parte])

  const contagem = {
    conversas: dados ? (dados.conversas || []).filter(aguardandoVoce).length : 0,
    sequencias: dados ? (dados.sequencias || []).length : 0,
  }

  return (
    <section aria-labelledby="titulo-whatsapp" className="mt-8">
      <SubAbasRecuperacao />
      <h2 id="titulo-whatsapp" className="sr-only">
        WhatsApp
      </h2>

      {dados && !dados.configurado && (
        <p className="mb-5 rounded border border-line bg-white px-4 py-3 text-[14px] text-ink-muted">
          O WhatsApp ainda não está configurado. Os números e as conversas aparecem aqui quando ele for ligado.
        </p>
      )}

      <div role="tablist" aria-label="WhatsApp" className="flex gap-1 overflow-x-auto border-b border-line">
        {PARTES.map((p) => {
          const ativa = parte === p.id
          const n = contagem[p.id]
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={'aba-' + p.id}
              aria-selected={ativa}
              aria-controls={'painel-' + p.id}
              onClick={() => setParte(p.id)}
              className={
                '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors duration-150 ' +
                (ativa ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')
              }
            >
              {p.rotulo}
              {n > 0 && (
                <span
                  className={
                    'figs rounded-full px-1.5 text-[11.5px] leading-[18px] ' +
                    (p.id === 'conversas' ? 'bg-signal-deep text-white' : 'bg-mist text-ink')
                  }
                >
                  {numero(n)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {erro && !dados ? (
        <div className="mt-5">
          <Aviso erro={erro} onTentar={recarregar} />
        </div>
      ) : !dados ? (
        <div className="mt-5">
          <Esqueleto linhas={4} />
        </div>
      ) : (
        <div role="tabpanel" id={'painel-' + parte} aria-labelledby={'aba-' + parte}>
          {erro && (
            <div className="mt-5">
              <Aviso erro={erro} onTentar={recarregar} />
            </div>
          )}

          {parte === 'conversas' &&
            (dados.conversas.length === 0 ? (
              <Vazio
                titulo="Nenhuma conversa ainda"
                texto="Quando alguém responder ao lembrete do WhatsApp, a conversa aparece aqui para você responder."
              />
            ) : (
              <Conversas conversas={dados.conversas} configurado={dados.configurado} onEnviado={recarregar} />
            ))}

          {parte === 'sequencias' && (
            <>
              <p className="mt-5 text-[13.5px] text-ink-muted">
                Quem está recebendo os lembretes (até 9, um por semana) e quem já parou, com o motivo.
              </p>
              {(dados.sequencias || []).length === 0 ? (
                <Vazio titulo="Nenhuma sequência ainda" texto="Quando alguém receber a 1ª mensagem, aparece aqui." />
              ) : (
                <ul className={'mt-4 divide-y divide-line rounded border border-line bg-white transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
                  {dados.sequencias.map((s) => (
                    <Sequencia key={s.telefone + s.email} s={s} onMudou={recarregar} />
                  ))}
                </ul>
              )}
            </>
          )}

          {parte === 'resultado' && (
            <div className="mt-5">
              {dados.estado && <EstadoWhatsapp estado={dados.estado} onMudou={recarregar} />}
              {t && (
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-5">
                  <Total rotulo="Mensagens enviadas" valor={numero(t.enviados)} detalhe={numero(t.pessoas) + (t.pessoas === 1 ? ' pessoa' : ' pessoas') + (t.falharam ? ' · ' + numero(t.falharam) + ' não entregues' : '')} />
                  <Total rotulo="Entregues" valor={numero(t.entregues)} detalhe={porcentagem(t.entregues, t.enviados)} />
                  <Total rotulo="Lidas" valor={numero(t.lidos)} detalhe={porcentagem(t.lidos, t.enviados)} />
                  <Total rotulo="Compraram depois" valor={numero(t.recuperados)} detalhe={porcentagem(t.recuperados, t.pessoas) + ' das pessoas'} />
                  <Total className="col-span-2 lg:col-span-1" rotulo="Custo estimado" valor={moeda(t.custo_estimado_centavos)} detalhe={PRECO + ' por mensagem' + (t.retomadas ? ' · ' + numero(t.retomadas) + (t.retomadas === 1 ? ' chamada' : ' chamadas') : '')} />
                </dl>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
