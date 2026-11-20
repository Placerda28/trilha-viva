'use client'

import { useState } from 'react'
import { moeda, moedaCurta, plural } from '@/lib/afiliados-simulador'
import MedalhaPB from './landing/MedalhaPB'

// Simulador da página pública (MUDANÇAS §8). É só vitrine: nenhum valor é
// calculado aqui. `tabela` (uma linha por nº de vendas: [grau, total, faltam]) e
// `saltos` chegam prontos do servidor, no build (lib/afiliados-simulador.js, que
// usa a mesma calcularNivel do fechamento). O navegador só escolhe a linha.
// Regra de 05/11: o afiliado vê só o valor do mês pela meta atingida.
const GRAU_VAZIO = 0
// Espaço que não quebra, para "R$ 30" não separar o valor do R$ no fim da linha.
const nb = (t) => t.replace(/ /g, ' ')
const TITULO = 'font-semi-condensed font-extrabold tabular-nums'

function Passo({ rotulo, aoToque, desativado, children }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={aoToque}
      disabled={desativado}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-control border border-dark-border text-[24px] font-bold leading-none text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-dark-border motion-reduce:transition-none"
    >
      {children}
    </button>
  )
}

// Marco da régua. O puxador nativo tem ~16 px: a conta de posição o compensa.
function Marca({ pct, rotulo, atingida, alinhar }) {
  const lado = alinhar === 'inicio' ? '' : alinhar === 'fim' ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <span
      className={`absolute top-0 whitespace-nowrap ${lado} ${atingida ? 'text-white' : 'text-dark-text-3'}`}
      style={{ left: alinhar === 'meio' ? `calc(8px + (100% - 16px) * ${pct / 100})` : alinhar === 'fim' ? '100%' : 0 }}
    >
      {rotulo}
    </span>
  )
}

export default function Simulador({ niveis, tabela, saltos, max = 100, inicial = 20 }) {
  const [v, setV] = useState(inicial)
  const [grau, total, faltam] = tabela[v]
  const nivel = grau > GRAU_VAZIO ? niveis[grau - 1] : null
  const proximo = grau < niveis.length ? niveis[grau] : null
  const nomeNivel = nivel ? nivel.nome : 'sem nível'
  const frase = `${plural(v, 'venda', 'vendas')} = ${nomeNivel} = ${moeda(total)} no mês`
  const mudar = (n) => setV(Math.max(0, Math.min(max, n)))

  return (
    <section aria-labelledby="sim-titulo" className="flex flex-[7_1_440px] flex-col gap-6 bg-ink p-[clamp(20px,3cqi,32px)] text-white">
      <div className="flex flex-col gap-2">
        <h3 id="sim-titulo" className="font-semi-condensed text-[clamp(26px,3cqi,34px)] font-[750] leading-[1.05]">
          Simule quanto você ganha no mês
        </h3>
        <p className="text-[15px] leading-[1.55] text-dark-text-3">É só uma simulação na tela: não é dinheiro real nem promessa de ganho.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="sim-vendas" className="max-w-[150px] text-[17px] font-bold leading-[1.3]">
            Quantas vendas por mês?
          </label>
          <div className="flex items-center gap-2.5">
            <Passo rotulo="Uma venda a menos" aoToque={() => mudar(v - 1)} desativado={v <= 0}>
              &minus;
            </Passo>
            <span aria-hidden="true" className={`${TITULO} w-[3.4ch] text-center text-[46px] leading-none`}>{v}</span>
            <Passo rotulo="Uma venda a mais" aoToque={() => mudar(v + 1)} desativado={v >= max}>
              +
            </Passo>
          </div>
        </div>
        <input
          id="sim-vendas"
          type="range"
          min={0}
          max={max}
          step={1}
          value={v}
          onChange={(e) => mudar(Number(e.target.value))}
          aria-valuetext={frase}
          className="m-0 h-11 w-full cursor-pointer accent-red"
        />
        <div aria-hidden="true" className="relative h-5 text-[13px] tabular-nums">
          <Marca pct={0} rotulo="0" alinhar="inicio" atingida={false} />
          {niveis.slice(1).map((n) => (
            <Marca key={n.nome} pct={(n.vendas_minimas / max) * 100} rotulo={`${n.nome} ${n.vendas_minimas}`} atingida={v >= n.vendas_minimas} alinhar="meio" />
          ))}
          <Marca pct={100} rotulo={String(max)} alinhar="fim" atingida={false} />
        </div>
      </div>

      <div role="status" aria-atomic="true" className="flex flex-col gap-3 border-t border-dark-line pt-5">
        <div className="flex items-center gap-4">
          <MedalhaPB grau={grau} tamanho={60} variante="sobrePreto" />
          <span className="text-[clamp(18px,2cqi,23px)] font-bold leading-[1.2] tabular-nums text-dark-text-2">
            {plural(v, 'venda', 'vendas')} = {nomeNivel} =
          </span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={`${TITULO} whitespace-nowrap text-[clamp(36px,4.6cqi,52px)] leading-none`}>{moeda(total)}</span>
          <span className="text-[clamp(18px,2cqi,23px)] font-bold text-dark-text-2">no mês</span>
        </p>
        <p className="border-t border-dark-line pt-4 text-[15px] leading-[1.55] text-dark-text-2">
          {proximo
            ? `Faltam ${plural(faltam, 'venda', 'vendas')} para o ${proximo.nome}. Bateu a meta, todas as vendas do mês passam a valer ${nb(moedaCurta(proximo.valor_por_venda_centavos))}.`
            : `Você está no nível máximo: cada venda vale ${nb(moedaCurta(nivel.valor_por_venda_centavos))}.`}
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <h4 className="text-[17px] font-bold">Uma venda a mais muda o mês</h4>
        {saltos.map((s) => (
          <div key={s.nivel} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                [s.de, s.deTotal],
                [s.para, s.paraTotal],
              ].map(([vendas, valor]) => {
                const ativo = v === vendas
                return (
                  <button
                    key={vendas}
                    type="button"
                    onClick={() => mudar(vendas)}
                    aria-pressed={ativo}
                    className={`flex min-h-14 flex-col gap-0.5 rounded-control border px-3 py-2 text-left transition-colors hover:border-white motion-reduce:transition-none ${
                      ativo ? 'border-white bg-white text-ink' : 'border-dark-frame text-white'
                    }`}
                  >
                    <span className="text-[13px] opacity-75">{plural(vendas, 'venda', 'vendas')}</span>
                    <span className="text-[18px] font-extrabold tabular-nums">{moeda(valor)}</span>
                  </button>
                )
              })}
            </div>
            <span className="text-[14px] text-dark-text-3">Com a {s.para}ª venda, o mês rende {moeda(s.diferenca)} a mais.</span>
          </div>
        ))}
      </div>
    </section>
  )
}
