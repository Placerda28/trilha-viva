'use client'

import { useEffect, useState } from 'react'
import { useGestao } from './useGestao'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { moeda, numero } from './formato'
import SequenciaWhatsapp from './SequenciaWhatsapp'
import AcaoGestao from './AcaoGestao'
import { EstadoWhatsapp, Total, porcentagem } from './WhatsappEstado'
import Conversas from './WhatsappConversasPainel'
import { PRECO, aguardandoVoce, celular } from './whatsappUtil'

// Sub-aba WhatsApp da Recuperação, em três partes: Conversas (lista e
// conversa aberta, como no WhatsApp), Sequências (em que ponto está cada
// pessoa, com "Parar sequência") e Resultado (ligar/pausar e os números).
// A Meta só deixa responder com texto livre até 24 h depois da última
// mensagem do cliente; o servidor confere isso de novo.

// Uma pessoa da sequência: em que mensagem está, a próxima ou por que parou,
// e os botões Parar / Retomar.
function Sequencia({ s, onMudou }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const quem = s.nome || celular(s.telefone)

  async function mudar(acao) {
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
      <div className="flex min-w-0 flex-col gap-2 sm:max-w-[55%] sm:items-end">
        <SequenciaWhatsapp w={s} />
        {s.pode_parar ? (
          <AcaoGestao
            rotulo="Parar lembretes"
            explicacao={'Parar os lembretes de WhatsApp de ' + quem + '? Essa pessoa não receberá mais mensagens desta sequência.'}
            confirmar="Parar lembretes"
            url="/api/gestao/whatsapp/sequencia"
            corpo={{ telefone: s.telefone, acao: 'parar' }}
            onFeito={onMudou}
          />
        ) : s.pode_retomar && (
          <button
            type="button"
            onClick={() => mudar('retomar')}
            disabled={enviando}
            className="btn-quiet min-h-11 !px-4 !py-2 !text-[13.5px] disabled:opacity-60 sm:self-end"
          >
            {enviando ? 'Aguarde…' : 'Retomar sequência'}
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

const ATUALIZAR_MS = 30000

// ---------------------------------------------------------- aba ----

const PARTES = [
  { id: 'conversas', rotulo: 'Conversas' },
  { id: 'sequencias', rotulo: 'Sequências' },
  { id: 'robo', rotulo: 'Robô' },
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
  }

  return (
    <section aria-labelledby="titulo-whatsapp" className="mt-8">
      <h2 id="titulo-whatsapp" className="sr-only">
        WhatsApp
      </h2>

      {dados && !dados.configurado && (
        <p className="mb-5 rounded border border-line bg-white px-4 py-3 text-[14px] text-ink-muted">
          O WhatsApp ainda não está configurado. Os números e as conversas aparecem aqui quando ele for ligado.
        </p>
      )}

      <div role="tablist" aria-label="WhatsApp" className="flex flex-wrap gap-1 border-b border-line">
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
                '-mb-px flex min-h-11 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[14.5px] font-semibold transition-colors duration-150 sm:px-3.5 ' +
                (ativa ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')
              }
            >
              {p.rotulo}
              {p.id === 'conversas' && (
                <span className="figs text-[12px] text-ink-muted">
                  [{numero(n)}]
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

          {parte === 'robo' && (
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
