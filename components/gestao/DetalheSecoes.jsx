'use client'

import { rotuloOrigem } from '@/lib/rastreio'
import { SeloTeste } from './AcaoGestao'
import { ACOES } from './Registro'
import { FORMAS, dataHora, moeda, numero } from './formato'

// As partes da ficha do Detalhe do cliente (plano 2.6): compras, downloads,
// carrinho, lead e histórico. Só mostram o que o JSON de
// /api/gestao/clientes/detalhe traz; nada aqui busca dado.

export const dia = (iso) => (iso ? dataHora(iso).slice(0, 10) : '—')
const SITUACAO_CARRINHO = { aberto: 'Aberto', lembrado: 'Lembrado', pago: 'Pagou', ignorado: 'Ignorado' }
const CANAL = { email: 'e-mail', whatsapp: 'WhatsApp' }

// A tela monta o título a partir do slug: o catálogo inteiro não vai para o navegador da gestão.
function tituloDoSlug(slug) {
  const t = String(slug || '').replace(/-/g, ' ').trim()
  return t ? t[0].toUpperCase() + t.slice(1) : 'Música sem nome'
}

export function Secao({ titulo, children }) {
  return (
    <section className="border-t border-line px-4 py-5 sm:px-5">
      <h3 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

// Pares "rótulo, valor" que cabem em 390 px: o rótulo à esquerda, o valor quebra à direita.
function Dados({ linhas }) {
  return (
    <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
      {linhas
        .filter((l) => l)
        .map(([rotulo, valor, alerta]) => (
          <div key={rotulo} className="contents">
            <dt className="text-ink-muted">{rotulo}</dt>
            <dd className={'figs break-words ' + (alerta ? 'text-signal-deep' : 'text-ink')}>{valor}</dd>
          </div>
        ))}
    </dl>
  )
}

export function Selo({ children, alerta = false }) {
  return (
    <span
      className={
        'rounded-sm border px-1.5 py-0.5 text-[11.5px] font-semibold ' +
        (alerta ? 'border-signal-deep text-signal-deep' : 'border-line text-ink-muted')
      }
    >
      {children}
    </span>
  )
}

function metaDaCompra(c) {
  if (c.meta === 'ok') return ['Meta', 'Enviada' + (c.meta_enviado_em ? ' em ' + dataHora(c.meta_enviado_em) : '')]
  if (c.meta === 'teste') return ['Meta', 'Não enviada (compra de teste)']
  if (c.meta) return ['Meta', 'Não chegou (código ' + c.meta + ')', true]
  return ['Meta', 'Sem registro']
}

export function Compras({ compras }) {
  if (!compras.length) return <p className="text-[14px] text-ink-muted">Este cliente não tem compras.</p>
  return (
    <ul className="space-y-3">
      {compras.map((c) => (
        <li key={c.id} className="rounded border border-line p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="figs text-[14px] font-semibold text-ink">{dataHora(c.em)}</span>
            <span className="figs text-[14.5px] font-bold text-ink">{moeda(c.valor_centavos)}</span>
          </div>
          {(c.teste || c.status !== 'pago') && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.teste && <SeloTeste />}
              {c.status !== 'pago' && <Selo>{c.status}</Selo>}
            </div>
          )}
          <div className="mt-2.5">
            <Dados
              linhas={[
                ['Forma', FORMAS[c.forma] || c.forma || 'Sem informação'],
                c.cupom && ['Cupom', c.cupom],
                ['Origem', c.utm_source || c.meta ? rotuloOrigem(c) : 'Sem registro'],
                metaDaCompra(c),
                ['Acesso enviado', c.acesso_enviado_em ? dataHora(c.acesso_enviado_em) : '—'],
              ]}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Downloads({ d }) {
  return (
    <>
      <p className="figs text-[14px] text-ink">
        {numero(d.total)} {d.total === 1 ? 'download' : 'downloads'} no total. Hoje: {numero(d.hoje)} de {numero(d.limite_dia)}.
      </p>
      {d.ultimos.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-muted">Ainda não baixou nenhuma música.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {d.ultimos.map((m, i) => (
            <li key={m.slug + '-' + i} className="flex min-h-[44px] items-center justify-between gap-3">
              {m.slug ? (
                <a
                  href={'/musicas/' + m.slug}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-[14px] font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                >
                  {tituloDoSlug(m.slug)}
                </a>
              ) : (
                <span className="text-[14px] text-ink-muted">Música sem nome</span>
              )}
              <time dateTime={m.em} className="figs shrink-0 text-[13px] text-ink-muted">
                {dataHora(m.em)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function Carrinho({ k }) {
  return (
    <Dados
      linhas={[
        ['Situação', k.recuperado ? 'Recuperado' : SITUACAO_CARRINHO[k.status] || k.status],
        ['Abriu em', dataHora(k.criado_em)],
        k.pago_em && ['Pagou em', dataHora(k.pago_em)],
        ['E-mails enviados', numero(k.emails_enviados)],
        ['WhatsApp enviados', numero(k.whatsapp_enviados)],
        k.recuperado && [
          'Recuperado por',
          (k.recuperado_pela_etapa ? 'lembrete ' + k.recuperado_pela_etapa : 'lembrete') +
            (k.recuperado_pelo_canal ? ' por ' + (CANAL[k.recuperado_pelo_canal] || k.recuperado_pelo_canal) : ''),
        ],
      ]}
    />
  )
}

export function Lead({ l }) {
  return (
    <Dados
      linhas={[
        ['Cadastrou em', dataHora(l.criado_em)],
        ['Origem', [l.origem, l.meio, l.campanha].filter(Boolean).join(' / ') || 'Direto'],
        ['Baixou a VS', l.baixou ? 'Sim, em ' + dataHora(l.primeiro_download_em) : 'Não'],
        ['Comprou', l.comprou ? 'Sim' + (l.comprou_em ? ', em ' + dataHora(l.comprou_em) : '') : 'Não'],
        ['E-mails enviados', numero(l.envios)],
        l.descadastrado && ['Descadastrado', 'Sim'],
      ]}
    />
  )
}

export function Historico({ itens }) {
  if (!itens.length) return <p className="text-[14px] text-ink-muted">Nenhuma ação da equipe registrada.</p>
  return (
    <ul className="divide-y divide-line">
      {itens.map((h) => (
        <li key={h.id} className="py-2.5 text-[14px] text-ink">
          <span className="figs block text-[13px] text-ink-muted">{dataHora(h.em)}</span>
          <span className="break-words">
            <span className="font-semibold">{h.quem.split('@')[0]}</span> {ACOES[h.acao] || h.acao}
            {h.alvo && h.acao === 'cliente_email_corrigido' ? (
              <>
                {' '}
                <span className="break-all font-semibold">{h.alvo}</span>
              </>
            ) : null}
          </span>
          {h.acao === 'cliente_email_corrigido' && h.detalhe?.de && (
            <span className="block break-all text-[13px] text-ink-muted">antes: {h.detalhe.de}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

