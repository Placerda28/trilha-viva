'use client'

import { useState } from 'react'
import { dataHora, moeda, numero } from './formato'
import { site } from '@/lib/site'
import { precoFinal } from './cuponsPreco'

// Lista dos cupons da gestão (tabela no computador, cartões no celular), com
// copiar link e desativar.

function descricaoDesconto(c) {
  return c.tipo === 'percentual' ? c.valor + '%' : moeda(c.valor)
}

// O cupom está num destes estados, nesta ordem de prioridade.
function situacao(c) {
  if (!c.ativo) return { rotulo: 'Desativado', cor: 'border-line text-ink-muted' }
  if (c.vencido) return { rotulo: 'Vencido', cor: 'border-line text-ink-muted' }
  if (c.esgotado) return { rotulo: 'Esgotado', cor: 'border-line text-ink-muted' }
  return { rotulo: 'Ativo', cor: 'border-ink text-ink' }
}

// Só o dia (DD/MM/AAAA) de uma data ISO, no horário de Brasília.
const soDia = (iso) => dataHora(iso).slice(0, 10)

// Desativar é definitivo, então pede confirmação ali mesmo, na linha, sem
// janela por cima da tela.
function Desativar({ cupom, onFeito }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function desativar() {
    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/gestao/cupons/desativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cupom.id }),
      })
      const dados = await res.json().catch(() => null)
      if (!res.ok || !dados?.ok) {
        setErro(res.status === 404 ? 'Sessão encerrada ou cupom inexistente.' : dados?.erro || 'Não consegui desativar.')
        return
      }
      onFeito()
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="link-quiet text-[13.5px] font-semibold">
        Desativar
      </button>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink-muted">Desativar de vez?</span>
      <button
        type="button"
        onClick={desativar}
        disabled={enviando}
        className="rounded border border-signal-deep px-2.5 py-1 text-[13px] font-semibold text-signal-deep transition-colors duration-150 hover:bg-signal-deep hover:text-white disabled:opacity-60"
      >
        {enviando ? 'Desativando...' : 'Sim, desativar'}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="text-[13px] text-ink-muted hover:text-ink">
        Cancelar
      </button>
      {erro && <span className="text-[13px] text-signal-deep">{erro}</span>}
    </span>
  )
}

// Link que já abre a compra com o cupom aplicado (o CheckoutForm lê ?cupom=).
function CopiarLink({ codigo }) {
  const [copiado, setCopiado] = useState(false)
  const link = site.url + '/assinar?cupom=' + encodeURIComponent(codigo)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        } catch {
          window.prompt('Copie o link:', link)
        }
      }}
      className="link-quiet text-[13.5px] font-semibold"
    >
      {copiado ? 'Link copiado' : 'Copiar link'}
    </button>
  )
}

function Etiqueta({ c }) {
  const s = situacao(c)
  return <span className={'rounded-sm border px-1.5 py-0.5 text-[11.5px] font-semibold ' + s.cor}>{s.rotulo}</span>
}

function Usos({ c }) {
  return (
    <>
      <span className="text-ink">
        {numero(c.usos)} de {numero(c.limite_usos)}
      </span>
      {c.reservas_ativas > 0 && (
        <span className="block text-[12.5px] text-ink-muted">{numero(c.reservas_ativas)} pagando agora</span>
      )}
    </>
  )
}

function Acoes({ c, onMudou }) {
  const valendo = c.ativo && !c.vencido && !c.esgotado
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
      {valendo && <CopiarLink codigo={c.codigo} />}
      {c.ativo ? <Desativar cupom={c} onFeito={onMudou} /> : null}
    </span>
  )
}

export default function Lista({ itens, onMudou }) {
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded border border-line bg-white md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Cupom</th>
              <th scope="col" className="px-4 py-3 font-semibold">Desconto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Usos</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Faturamento</th>
              <th scope="col" className="px-4 py-3 font-semibold">Vale até</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-4 py-3.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tracking-[0.02em] text-ink">{c.codigo}</span>
                    <Etiqueta c={c} />
                  </span>
                  <span className="block text-[12.5px] text-ink-muted">
                    criado por {c.criado_por} · {soDia(c.criado_em)}
                  </span>
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink">
                  {descricaoDesconto(c)}
                  <span className="block text-[12.5px] text-ink-muted">sai por {moeda(precoFinal(c.tipo, c.valor))}</span>
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5">
                  <Usos c={c} />
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-right text-ink">{moeda(c.faturamento_centavos)}</td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink-muted">{soDia(c.valido_ate)}</td>
                <td className="px-4 py-3.5">
                  <Acoes c={c} onMudou={onMudou} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white md:hidden">
        {itens.map((c) => (
          <li key={c.id} className="px-4 py-4">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tracking-[0.02em] text-ink">{c.codigo}</span>
              <Etiqueta c={c} />
            </span>
            <dl className="figs mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div>
                <dt className="text-ink-muted">Desconto</dt>
                <dd className="text-ink">
                  {descricaoDesconto(c)} · sai por {moeda(precoFinal(c.tipo, c.valor))}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Usos</dt>
                <dd>
                  <Usos c={c} />
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Faturamento</dt>
                <dd className="text-ink">{moeda(c.faturamento_centavos)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Vale até</dt>
                <dd className="text-ink">{soDia(c.valido_ate)}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <Acoes c={c} onMudou={onMudou} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
