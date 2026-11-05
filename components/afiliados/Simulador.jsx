'use client'

import { useEffect, useRef, useState } from 'react'
import { moeda, moedaCurta, plural } from '@/lib/afiliados-simulador'
import Medalha from './painel/Medalha'
import Moeda3D from './landing/Moeda3D'
import ValorAnimado from './landing/ValorAnimado'

// Simulador da página pública. É só vitrine: nenhum valor é calculado aqui.
// `tabela` (uma linha por nº de vendas: [grau, total, faltam]) e `saltos`
// chegam prontos do servidor, no build (lib/afiliados-simulador.js, que usa a
// mesma calcularNivel do fechamento). O navegador só escolhe a linha.
// Regra de 05/11: o afiliado vê só o valor do mês pela meta atingida.
const GRAU_VAZIO = 0
// Espaço que não quebra, para "R$ 30" não separar o valor do R$ no fim da linha.
const nb = (t) => t.replace(/ /g, ' ')

function Marca({ pct, rotulo, atingida, alinhar = 'meio' }) {
  const lado = alinhar === 'inicio' ? 'translate-x-0' : alinhar === 'fim' ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <span className="absolute top-0" style={{ left: `calc(11px + (100% - 22px) * ${pct / 100})` }}>
      <span aria-hidden="true" className={`absolute left-0 top-0 h-2.5 w-[2px] -translate-x-1/2 ${atingida ? 'bg-signal-lite' : 'bg-white/35'}`} />
      <span className={`figs absolute left-0 top-3.5 block whitespace-nowrap text-[13.5px] transition-colors duration-200 ${lado} ${atingida ? 'text-white' : 'text-white/65'}`}>{rotulo}</span>
    </span>
  )
}

function Passo({ rotulo, aoToque, desativado, children }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={aoToque}
      disabled={desativado}
      className="sim-toque figs grid h-12 w-12 shrink-0 place-items-center border border-white/30 text-[24px] font-bold leading-none text-white hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/30"
    >
      {children}
    </button>
  )
}

// O número "conta" até o valor novo quando a quantidade salta (botões 19/20,
// 49/50): percorre as linhas da tabela pronta, uma por quadro, sem somar nem
// multiplicar dinheiro. Passos de 1 a 2 vendas não contam: só o dígito rola.
const DURACAO_CONTAGEM = 520
const facil = (t) => 1 - (1 - t) ** 4

function useLinhaContando(alvo) {
  const [linha, setLinha] = useState(alvo)
  const atual = useRef(alvo)
  useEffect(() => {
    const parado = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const de = atual.current
    if (parado || Math.abs(alvo - de) <= 2) {
      atual.current = alvo
      setLinha(alvo)
      return undefined
    }
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_CONTAGEM)
      atual.current = t >= 1 ? alvo : de + Math.round((alvo - de) * facil(t))
      setLinha(atual.current)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo])
  return linha
}

export default function Simulador({ niveis, tabela, saltos, max = 100, inicial = 20 }) {
  const [v, setV] = useState(inicial)
  const linhaMostrada = useLinhaContando(v)
  const contando = linhaMostrada !== v
  const [grau, total, faltam] = tabela[v]
  const totalMostrado = tabela[linhaMostrada][1]
  const nivel = grau > GRAU_VAZIO ? niveis[grau - 1] : null
  const proximo = grau < niveis.length ? niveis[grau] : null
  const nomeNivel = nivel ? nivel.nome : 'sem nível'
  const frase = `${plural(v, 'venda', 'vendas')} = ${nomeNivel} = ${moeda(total)} no mês`

  // Muda a quantidade; ao cruzar uma meta, vibra de leve (onde o aparelho deixa).
  const mudar = (n) => {
    const novo = Math.max(0, Math.min(max, n))
    if (novo === v) return
    if (tabela[novo][0] !== grau && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(14)
    setV(novo)
  }

  return (
    <section className="panel p-5 sm:p-8" aria-labelledby="sim-titulo">
      <h3 id="sim-titulo" className="text-d3 text-white">Simule quanto você ganha no mês</h3>
      <p className="mt-2 max-w-text text-[15.5px] leading-[1.6] text-white/65">
        É só uma simulação na tela: não é dinheiro real nem promessa de ganho.
      </p>

      <div className="mt-8 flex items-center justify-between gap-3">
        <label htmlFor="sim-vendas" className="max-w-[9rem] text-[17px] font-bold leading-snug text-white">
          Quantas vendas por mês?
        </label>
        <div className="flex items-center gap-2.5">
          <Passo rotulo="Uma venda a menos" aoToque={() => mudar(v - 1)} desativado={v <= 0}>
            &minus;
          </Passo>
          <p aria-hidden="true" className="figs w-[3.4ch] text-center text-[46px] font-extrabold leading-none tracking-[-0.03em] text-white">{v}</p>
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
        className="range-vendas-2 mt-3"
        style={{ '--pct': `${(v / max) * 100}%` }}
      />
      <div className="relative mb-9 mt-0.5 h-5" aria-hidden="true">
        <Marca pct={0} rotulo="0" alinhar="inicio" atingida />
        {niveis.slice(1).map((n) => (
          <Marca key={n.nome} pct={(n.vendas_minimas / max) * 100} rotulo={`${n.nome} ${n.vendas_minimas}`} atingida={v >= n.vendas_minimas} />
        ))}
        <Marca pct={100} rotulo={String(max)} alinhar="fim" atingida={v >= max} />
      </div>

      <div className="border-t border-white/15 pt-6">
        <div role="status" aria-atomic="true">
          <div className="flex items-center gap-4">
            {nivel ? (
              <Moeda3D cor={nivel.cor} grau={grau} tamanho={68} />
            ) : (
              <Medalha grau={GRAU_VAZIO} tamanho={68} className="text-white" />
            )}
            <p className="figs min-w-0 text-[clamp(18px,5.4vw,23px)] font-bold leading-[1.15] text-white/80">
              {plural(v, 'venda', 'vendas')} = {nomeNivel} =
            </p>
          </div>
          <p className="figs mt-4 flex flex-wrap items-baseline gap-x-2.5 text-white">
            <span className="sr-only">{moeda(total)}</span>
            <ValorAnimado
              texto={moeda(totalMostrado)}
              rolar={!contando}
              className="text-[clamp(34px,10.5vw,50px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
            />
            <span className="text-[clamp(18px,5.4vw,23px)] font-bold text-white/80">no mês</span>
          </p>
        </div>

        <p className="mt-6 border-t border-white/15 pt-5 text-[15.5px] leading-[1.6] text-white/80">
          {proximo
            ? `Faltam ${plural(faltam, 'venda', 'vendas')} para o ${proximo.nome}. Bateu a meta, todas as vendas do mês passam a valer ${nb(moedaCurta(proximo.valor_por_venda_centavos))}.`
            : `Você está no nível máximo: cada venda vale ${nb(moedaCurta(nivel.valor_por_venda_centavos))}.`}
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
                      onClick={() => mudar(vendas)}
                      aria-pressed={ativo}
                      className={`sim-toque figs min-h-14 border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
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
