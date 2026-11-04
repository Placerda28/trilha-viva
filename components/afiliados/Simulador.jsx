'use client'

import { useState } from 'react'
import { moeda, moedaCurta, plural } from '@/lib/afiliados-simulador'
import Medalha from './painel/Medalha'

// Simulador da página pública. É só vitrine: nenhum valor é calculado aqui.
// `tabela` (uma linha por nº de vendas: [grau, base, bonus, total, faltam]) e
// `saltos` chegam prontos do servidor, no build (lib/afiliados-simulador.js,
// que usa a mesma calcularNivel do fechamento). O navegador só escolhe a linha.
const GRAU_VAZIO = 0

function Marca({ pct, rotulo, alinhar = 'meio' }) {
  const lado = alinhar === 'inicio' ? 'translate-x-0' : alinhar === 'fim' ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <span className="absolute top-0" style={{ left: `calc(8px + (100% - 16px) * ${pct / 100})` }}>
      <span aria-hidden="true" className="absolute left-0 top-0 h-2.5 w-[2px] -translate-x-1/2 bg-signal" />
      <span className={`figs absolute left-0 top-3.5 block whitespace-nowrap text-[13.5px] text-white/65 ${lado}`}>{rotulo}</span>
    </span>
  )
}

export default function Simulador({ niveis, tabela, saltos, max = 100, inicial = 20 }) {
  const [v, setV] = useState(inicial)
  const [grau, base, bonus, total, faltam] = tabela[v]
  const nivel = grau > GRAU_VAZIO ? niveis[grau - 1] : null
  const proximo = grau < niveis.length ? niveis[grau] : null
  const valorBase = niveis[0].valor_por_venda_centavos
  const nomeNivel = nivel ? nivel.nome : 'sem nível'
  const frase = `${plural(v, 'venda', 'vendas')} = ${nomeNivel} = ${moeda(total)}`

  return (
    <section className="panel p-5 sm:p-8" aria-labelledby="sim-titulo">
      <h3 id="sim-titulo" className="text-d3 text-white">Simule quanto você ganha no mês</h3>
      <p className="mt-2 max-w-text text-[15.5px] leading-[1.6] text-white/65">
        É só uma simulação na tela: não é dinheiro real nem promessa de ganho.
      </p>

      <div className="mt-8 flex items-end justify-between gap-4">
        <label htmlFor="sim-vendas" className="text-[17px] font-bold leading-snug text-white">
          Quantas vendas por mês?
        </label>
        <p aria-hidden="true" className="figs text-[46px] font-extrabold leading-[0.9] tracking-[-0.03em] text-white">{v}</p>
      </div>

      <input
        id="sim-vendas"
        type="range"
        min={0}
        max={max}
        step={1}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        aria-valuetext={frase}
        className="range-vendas mt-3"
        style={{ '--pct': `${(v / max) * 100}%` }}
      />
      <div className="relative mb-9 mt-1 h-5" aria-hidden="true">
        <Marca pct={0} rotulo="0" alinhar="inicio" />
        {niveis.slice(1).map((n) => (
          <Marca key={n.nome} pct={(n.vendas_minimas / max) * 100} rotulo={`${n.nome} ${n.vendas_minimas}`} />
        ))}
        <Marca pct={100} rotulo={String(max)} alinhar="fim" />
      </div>

      <div className="border-t border-white/15 pt-6">
        <div className="flex items-center gap-4">
          <Medalha cor={nivel?.cor} grau={grau} tamanho={64} className="text-white" />
          <p className="figs text-[clamp(22px,6.2vw,30px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-white">{frase}</p>
        </div>

        <dl className="mt-6 divide-y divide-white/15 border-y border-white/15 text-[15.5px]">
          <div className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="text-white/75">
              Garantido ({moedaCurta(valorBase)} × {v})
            </dt>
            <dd className="figs shrink-0 font-bold text-white">{moeda(base)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="text-white/75">
              {nivel && bonus > 0 ? `Bônus ${nivel.nome}, cai no dia 8 do mês seguinte` : 'Bônus de nível'}
            </dt>
            <dd className="figs shrink-0 font-bold text-white">{moeda(bonus)}</dd>
          </div>
        </dl>

        <p className="mt-5 text-[15.5px] leading-[1.6] text-white/75">
          {proximo
            ? `Faltam ${plural(faltam, 'venda', 'vendas')} para o ${proximo.nome}. Bateu a meta, todas as vendas do mês passam a valer ${moedaCurta(proximo.valor_por_venda_centavos)}.`
            : `Você está no nível máximo: cada venda vale ${moedaCurta(nivel.valor_por_venda_centavos)}.`}
        </p>
      </div>

      <div className="mt-8">
        <h4 className="text-[17px] font-bold text-white">Uma venda a mais muda o mês</h4>
        <ul className="mt-4 space-y-5">
          {saltos.map((s) => (
            <li key={s.nivel}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  [s.de, s.deTotal],
                  [s.para, s.paraTotal],
                ].map(([vendas, valor]) => {
                  const ativo = v === vendas
                  return (
                    <button
                      key={vendas}
                      type="button"
                      onClick={() => setV(vendas)}
                      aria-pressed={ativo}
                      className={`figs min-h-14 border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                        ativo ? 'border-white bg-white text-ink' : 'border-white/25 text-white hover:border-signal-lite'
                      }`}
                    >
                      <span className={`block text-[13.5px] ${ativo ? 'text-ink-muted' : 'text-white/65'}`}>{plural(vendas, 'venda', 'vendas')}</span>
                      <span className="block text-[18px] font-extrabold leading-tight">{moeda(valor)}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[14px] text-white/65">
                Com a {s.para}ª venda, o mês rende {moeda(s.diferenca)} a mais.
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
