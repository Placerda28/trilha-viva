'use client'

import { Fragment, useState } from 'react'
import { celular } from './whatsappUtil'
import { dataHora } from './formato'
import { MenuLead, PainelLead } from './LeadAcoes'
import { acoesDoLead, canaisDoLead, situacao } from './leadsRobo'

// A lista de leads com a etapa do robô, a situação e as ações por lead.
// Tabela no computador (1280 px em diante), cartões no celular e no tablet.

const sim = (v) => (v ? 'Sim' : 'Não')
const origemTexto = (l) => [l.origem, l.meio, l.campanha].filter(Boolean).join(' / ') || 'Direto'

const SELO = {
  andamento: 'border border-ink/25 bg-white text-ink',
  encerrado: 'bg-mist text-ink-muted',
  convertido: 'bg-ink text-white',
}

function Selo({ s }) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[12.5px] font-semibold ' + SELO[s.id]}>
        {s.id === 'convertido' && <span aria-hidden="true" className="h-2 w-2 bg-signal" />}
        {s.id === 'andamento' && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink" />}
        {s.rotulo}
      </span>
      {s.detalhe && <span className="text-[13px] text-ink-muted">{s.detalhe}</span>}
    </span>
  )
}

function Passos({ etapa, total }) {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={'h-1.5 w-3 rounded-[1px] ' + (i < etapa ? 'bg-ink' : 'bg-mist-deep')} />
      ))}
    </span>
  )
}

function Canais({ canais }) {
  return (
    <div className="space-y-2.5">
      {canais.map((c) => (
        <div key={c.id}>
          <div className="flex items-center gap-3 text-[13.5px]">
            <span className="w-[88px] shrink-0 font-semibold text-ink">{c.rotulo} {c.etapa}/{c.total}</span>
            <Passos etapa={c.etapa} total={c.total} />
          </div>
          <p className={'figs mt-0.5 text-[13px] ' + (c.falha ? 'text-signal-deep' : 'text-ink-muted')}>
            {c.prox ? (c.prox.fila ? c.prox.texto : 'Próximo envio: ' + c.prox.texto) : c.nota}
          </p>
        </div>
      ))}
    </div>
  )
}

function Info({ aberto, onAlternar }) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={aberto}
      aria-label="Como funciona o Enviar agora"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.4" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export default function LeadsLista({ itens, onMudou }) {
  const [aberta, setAberta] = useState(null)
  const [enviados, setEnviados] = useState(() => new Set())
  const [aviso, setAviso] = useState('')
  const [info, setInfo] = useState(false)
  const agora = Date.now()

  function feito(lead, acao) {
    if (acao === 'parar') {
      setAviso('Processo de ' + lead.nome + ' parado.')
      onMudou()
    } else {
      setEnviados((s) => new Set(s).add(lead.id + ':' + acao))
      setAviso('Pedido feito para ' + lead.nome + '. Sai na próxima rodada do robô (até 10 min).')
    }
  }

  const linhas = itens.map((l) => ({
    l,
    s: situacao(l),
    canais: canaisDoLead(l, enviados, agora),
    acoes: acoesDoLead(l, enviados, agora),
  }))
  const painel = (l) =>
    aberta?.id === l.id && <PainelLead acao={aberta.acao} lead={l} aoFechar={() => setAberta(null)} aoFeito={feito} />
  const menu = (x, cheio) => (
    <MenuLead lead={x.l} acoes={x.acoes} cheio={cheio} onEscolher={(acao) => setAberta({ id: x.l.id, acao })} />
  )

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">Leads e etapa do robô</h2>
        <Info aberto={info} onAlternar={() => setInfo((v) => !v)} />
      </div>
      {info && (
        <p className="mt-1 rounded border border-line bg-white px-4 py-3 text-[14px] leading-relaxed text-ink-muted">
          O robô roda a cada 10 minutos. Enviar agora só adianta o próximo envio: ele sai na próxima rodada, não na hora. O WhatsApp só sai das 9h às 19h59 (Brasília) e só com o modelo aprovado na Meta; fora disso, espera.
        </p>
      )}
      <p role="status" className="mt-2 min-h-5 text-[14px] text-ink">{aviso}</p>

      <div className="mt-2 hidden rounded border border-line bg-white xl:block">
        <table className="w-full table-fixed break-words text-left text-[14px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="w-[27%] px-4 py-3 font-semibold">Lead</th>
              <th scope="col" className="w-[19%] px-4 py-3 font-semibold">Origem e data</th>
              <th scope="col" className="w-[28%] px-4 py-3 font-semibold">Etapa do robô</th>
              <th scope="col" className="w-[17%] px-4 py-3 font-semibold">Situação</th>
              <th scope="col" className="w-[9%] px-4 py-3 font-semibold"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((x) => (
              <Fragment key={x.l.id}>
                <tr className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{x.l.nome}</p>
                    <p className="break-all text-ink">{x.l.email}</p>
                    <p className="figs text-ink-muted">{celular(x.l.whatsapp)}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-muted">
                    <p>{origemTexto(x.l)}</p>
                    <p className="break-all">{x.l.pagina_entrada || '—'}</p>
                    <p className="figs">{dataHora(x.l.criado_em)}</p>
                  </td>
                  <td className="px-4 py-3"><Canais canais={x.canais} /></td>
                  <td className="space-y-1.5 px-4 py-3">
                    <Selo s={x.s} />
                    <p className="text-[13px] text-ink-muted">Baixou a VS: {sim(x.l.primeiro_download_em)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{menu(x)}</td>
                </tr>
                {aberta?.id === x.l.id && <tr><td colSpan={5} className="bg-paper/60 px-4 pb-3">{painel(x.l)}</td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-2 divide-y divide-line rounded border border-line bg-white xl:hidden">
        {linhas.map((x) => (
          <li key={x.l.id} className="space-y-3 break-words p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{x.l.nome}</p>
                <p className="break-all text-[14px] text-ink">{x.l.email}</p>
                <p className="figs text-[14px] text-ink-muted">{celular(x.l.whatsapp)}</p>
              </div>
              <Selo s={x.s} />
            </div>
            <Canais canais={x.canais} />
            <p className="text-[13px] text-ink-muted">
              {origemTexto(x.l)}, {dataHora(x.l.criado_em)}. Baixou a VS: {sim(x.l.primeiro_download_em)}.
            </p>
            {x.acoes.length > 0 && <div>{menu(x, true)}</div>}
            {painel(x.l)}
          </li>
        ))}
      </ul>
    </div>
  )
}
