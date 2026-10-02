'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import SubAbasRecuperacao from './SubAbasRecuperacao'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { dataHora, moeda, numero } from './formato'

// Sub-aba WhatsApp da Recuperação: o resultado do lembrete (enviados,
// entregues, lidos, recuperados, custo estimado) e as conversas com quem
// respondeu. A Meta só deixa responder com texto livre até 24 h depois da
// última mensagem do cliente; o servidor confere isso de novo.

const LIMITE = 1000

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

function Mensagem({ m }) {
  const minha = m.direcao === 'saida'
  return (
    <li className={'flex ' + (minha ? 'justify-end' : 'justify-start')}>
      <div
        className={
          'max-w-[85%] rounded px-3.5 py-2.5 text-[14.5px] leading-relaxed ' +
          (minha ? 'bg-ink text-white' : 'border border-line bg-white text-ink')
        }
      >
        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
        <p className={'figs mt-1 text-[11.5px] ' + (minha ? 'text-white/70' : 'text-ink-muted')}>
          {dataHora(m.em)}
          {minha && m.enviado_por ? ' · ' + m.enviado_por : ''}
        </p>
      </div>
    </li>
  )
}

function Responder({ conversa, configurado, onEnviado }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!configurado) {
    return <p className="text-[13.5px] text-ink-muted">Responder pelo site fica disponível quando o WhatsApp for configurado.</p>
  }
  if (!conversa.janela_aberta) {
    return (
      <p className="rounded border border-dashed border-mist-deep px-3.5 py-3 text-[13.5px] text-ink-muted">
        Janela de 24 h fechada — o cliente precisa escrever de novo.
      </p>
    )
  }

  async function enviar(e) {
    e.preventDefault()
    const limpo = texto.trim()
    if (!limpo) return
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch('/api/gestao/whatsapp/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: conversa.telefone, texto: limpo }),
      })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo para responder.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui enviar agora. Tente de novo.')
      else {
        setTexto('')
        onEnviado()
      }
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  const fecha = conversa.ultima_entrada_em ? new Date(new Date(conversa.ultima_entrada_em).getTime() + 86400000).toISOString() : null
  return (
    <form onSubmit={enviar} className="space-y-2">
      <label htmlFor={'resposta-' + conversa.telefone} className="block text-[13px] font-semibold text-ink">
        Responder
        {fecha && <span className="figs font-normal text-ink-muted"> · janela aberta até {dataHora(fecha)}</span>}
      </label>
      <textarea
        id={'resposta-' + conversa.telefone}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={LIMITE}
        rows={3}
        className="w-full rounded border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        placeholder="Escreva a resposta"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="figs text-[12.5px] text-ink-muted">
          {texto.length}/{LIMITE}
        </span>
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="btn-ink !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar no WhatsApp'}
        </button>
      </div>
      {erro && (
        <p role="alert" className="text-[13.5px] font-medium text-signal-deep">
          {erro}
        </p>
      )}
    </form>
  )
}

function Conversa({ c, configurado, onEnviado }) {
  return (
    <li className="rounded border border-line bg-paper/40">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{c.nome || c.nome_perfil || 'Sem nome'}</p>
          <p className="figs break-all text-[13.5px] text-ink-muted">
            {celular(c.telefone)}
            {c.email ? ' · ' + c.email : ''}
          </p>
        </div>
        <p className="figs text-[12.5px] text-ink-muted">Última {dataHora(c.ultima_em)}</p>
      </div>
      <ol className="space-y-2.5 px-4 py-4" aria-label={'Mensagens com ' + (c.nome || celular(c.telefone))}>
        {c.mensagens.map((m, i) => (
          <Mensagem key={i} m={m} />
        ))}
      </ol>
      <div className="border-t border-line bg-white px-4 py-4">
        <Responder conversa={c} configurado={configurado} onEnviado={onEnviado} />
      </div>
    </li>
  )
}

export default function WhatsappConversas() {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro, carregando } = useGestao('/api/gestao/whatsapp', tentativa)
  const t = dados?.totais

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

      {t && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-5">
          <Total rotulo="Enviados" valor={numero(t.enviados)} detalhe={t.falharam ? numero(t.falharam) + ' não entregues' : null} />
          <Total rotulo="Entregues" valor={numero(t.entregues)} detalhe={porcentagem(t.entregues, t.enviados)} />
          <Total rotulo="Lidos" valor={numero(t.lidos)} detalhe={porcentagem(t.lidos, t.enviados)} />
          <Total rotulo="Compraram depois" valor={numero(t.recuperados)} detalhe={porcentagem(t.recuperados, t.enviados)} />
          <Total className="col-span-2 lg:col-span-1" rotulo="Custo estimado" valor={moeda(t.custo_estimado_centavos)} detalhe="R$ 0,32 por mensagem" />
        </dl>
      )}

      <h3 className="mt-10 text-[17px] font-bold text-ink">Conversas</h3>
      <p className="mt-1 text-[13.5px] text-ink-muted">
        Respostas ao lembrete, a mais recente em cima. Também chegam por e-mail no suporte.
      </p>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto linhas={3} />
      ) : dados.conversas.length === 0 ? (
        <Vazio
          titulo="Nenhuma conversa ainda"
          texto="Quando alguém responder ao lembrete do WhatsApp, a conversa aparece aqui para você responder."
        />
      ) : (
        <ul className={'mt-5 space-y-5 ' + (carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150')}>
          {dados.conversas.map((c) => (
            <Conversa key={c.telefone} c={c} configurado={dados.configurado} onEnviado={() => setTentativa((n) => n + 1)} />
          ))}
        </ul>
      )}
    </section>
  )
}
