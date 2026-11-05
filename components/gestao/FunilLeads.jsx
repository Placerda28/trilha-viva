'use client'

import { useGestao } from './useGestao'
import { Esqueleto } from './Estados'
import { moeda, numero } from './formato'
import { MOTIVO_ENCERRADO, passosDoFunil } from './leadsRobo'

// Funil de conversão dos leads da VS grátis: da inscrição até a compra, com o
// que o robô de WhatsApp e de e-mail entregou em cada etapa. Barras à mão (sem
// biblioteca); a tabela de baixo traz os mesmos números para leitor de tela.
// Os dados vêm de /api/gestao/leads/funil (só leads cadastrados no período).

function Barra({ pct, tom = 'bg-ink' }) {
  return (
    <div className="h-1.5 rounded-sm bg-mist" aria-hidden="true">
      <div className={'h-full rounded-sm ' + tom} style={{ width: pct > 0 ? Math.max(2, Math.min(100, pct)) + '%' : '0%' }} />
    </div>
  )
}

function Linha({ p, tom }) {
  const sem = p.valor == null
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="min-w-0 font-medium text-ink">{p.rotulo}</span>
        <span className="figs shrink-0 text-ink-muted">
          {sem ? 'sem dado' : <><strong className="font-bold text-ink">{numero(p.valor)}</strong>{' (' + p.pct + '%)'}</>}
        </span>
      </div>
      {sem ? (
        <p className="mt-1 text-[13px] text-ink-muted">O clique no link do e-mail ainda não é medido.</p>
      ) : (
        <div className="mt-1.5 space-y-1">
          <Barra pct={p.pct} tom={tom} />
          {p.lidas != null && <Barra pct={p.pctLidas} tom="bg-ink-muted" />}
        </div>
      )}
      {p.lidas != null && (
        <p className="figs mt-1 text-[13px] text-ink-muted">
          {numero(p.lidas)} {p.lidas === 1 ? 'leu' : 'leram'}
          {p.falhas > 0 && <span className="text-signal-deep">{', ' + numero(p.falhas) + (p.falhas === 1 ? ' falhou' : ' falharam')}</span>}
        </p>
      )}
    </li>
  )
}

function Grupo({ titulo, nota, itens, tom }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-ink">{titulo}</h3>
      {nota && <p className="mt-0.5 text-[13px] text-ink-muted">{nota}</p>}
      <ul aria-label={titulo} className="mt-3 flex flex-col gap-3.5">
        {itens.map((p) => <Linha key={p.id} p={p} tom={tom} />)}
      </ul>
    </div>
  )
}

function Lateral({ f, base }) {
  const linhas = [
    { id: 'andamento', rotulo: 'Em andamento', n: f.em_andamento, tom: 'bg-ink' },
    ...['concluido', 'comprou', 'descadastrou', 'parado'].map((k) => ({
      id: k, rotulo: 'Encerrado: ' + MOTIVO_ENCERRADO[k], n: f.encerrados[k], tom: k === 'comprou' ? 'bg-signal' : 'bg-ink-muted',
    })),
  ]
  const porCento = (n) => (base ? (n / base) * 100 : 0)
  const bloco = 'border-t border-line pt-5'
  return (
    <aside aria-label="Situação dos leads, custo e compras pelo WhatsApp" className="space-y-5">
      <section>
        <h3 className="text-[15px] font-bold text-ink">Em andamento e encerrados</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {linhas.map((l) => (
            <li key={l.id}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="text-ink">{l.rotulo}</span>
                <span className="figs font-bold text-ink">{numero(l.n)}</span>
              </div>
              <div className="mt-1.5"><Barra pct={porCento(l.n)} tom={l.tom} /></div>
            </li>
          ))}
        </ul>
      </section>
      <section className={bloco}>
        <h3 className="text-[15px] font-bold text-ink">Custo estimado do WhatsApp</h3>
        <p className="figs mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">{moeda(f.custo_whatsapp_centavos)}</p>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          {numero(f.mensagens_whatsapp)} {f.mensagens_whatsapp === 1 ? 'mensagem enviada' : 'mensagens enviadas'} a {moeda(f.custo_mensagem_centavos)} cada. É uma estimativa: a Meta cobra o valor exato na fatura.
        </p>
      </section>
      <section className={bloco}>
        <h3 className="text-[15px] font-bold text-ink">Compraram pelo WhatsApp</h3>
        <p className="figs mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">{numero(f.compraram_pelo_whatsapp)}</p>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          {numero(f.abriram_checkout_pelo_whatsapp)} {f.abriram_checkout_pelo_whatsapp === 1 ? 'abriu' : 'abriram'} o pagamento pelo link do WhatsApp.
        </p>
      </section>
    </aside>
  )
}

function TabelaFunil({ g }) {
  const linhas = [...g.entrada, ...g.whatsapp, ...g.emails, ...g.resultado]
  const celula = 'px-3 py-2.5'
  return (
    <details className="mt-5 border-t border-line pt-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-ink-muted hover:text-ink">Ver o funil em tabela</summary>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <caption className="sr-only">Funil de conversão dos leads, etapa por etapa</caption>
          <thead>
            <tr className="border-b border-line text-[12.5px] text-ink-muted">
              <th scope="col" className={celula + ' font-semibold'}>Etapa</th>
              <th scope="col" className={celula + ' text-right font-semibold'}>Pessoas</th>
              <th scope="col" className={celula + ' text-right font-semibold'}>Dos cadastros</th>
              <th scope="col" className={celula + ' font-semibold'}>Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((p) => (
              <tr key={p.id}>
                <th scope="row" className={celula + ' font-medium text-ink'}>{p.rotulo}</th>
                <td className={celula + ' figs text-right text-ink'}>{p.valor == null ? 'sem dado' : numero(p.valor)}</td>
                <td className={celula + ' figs text-right text-ink-muted'}>{p.valor == null ? '—' : p.pct + '%'}</td>
                <td className={celula + ' figs text-ink-muted'}>
                  {p.lidas != null ? numero(p.enviadas) + ' enviadas, ' + numero(p.lidas) + ' lidas, ' + numero(p.falhas) + ' falhas' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export default function FunilLeads({ de, ate, tentativa }) {
  const { dados: f, erro } = useGestao('/api/gestao/leads/funil?de=' + de + '&ate=' + ate, tentativa)
  if (erro) {
    return <p role="alert" className="mt-6 rounded border border-signal/40 bg-white px-5 py-4 text-[14.5px] text-ink">{erro === 'sessao' ? 'Sua sessão acabou. Entre de novo para ver o funil.' : 'Não consegui carregar o funil agora. ' + erro}</p>
  }
  if (!f) return <Esqueleto linhas={4} />
  const g = passosDoFunil(f)
  return (
    <section aria-label="Funil de conversão" className="mt-6 rounded-md border border-line bg-white p-4 sm:p-5">
      <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">Funil de conversão</h2>
      <p className="mt-1 text-[14px] text-ink-muted">
        Dos leads cadastrados no período, quantos chegaram a cada etapa. {numero(f.em_andamento)} {f.em_andamento === 1 ? 'segue' : 'seguem'} em andamento com o robô.
      </p>
      <div className="mt-5 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7">
          <Grupo titulo="Entrada" itens={g.entrada} />
          <div className="grid gap-7 md:grid-cols-2 md:gap-x-10">
            <Grupo titulo="Receberam WhatsApp" nota="Barra preta: entregues. Barra cinza: lidas." itens={g.whatsapp} />
            <Grupo titulo="Receberam e-mail" itens={g.emails} />
          </div>
          <Grupo titulo="Resultado" itens={g.resultado} tom="bg-signal" />
        </div>
        <div className="xl:border-l xl:border-line xl:pl-8"><Lateral f={f} base={f.cadastros} /></div>
      </div>
      <TabelaFunil g={g} />
    </section>
  )
}
