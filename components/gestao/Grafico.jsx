'use client'

import { useEffect, useRef, useState } from 'react'
import { moeda, moedaCurta, numero } from './formato'

const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const valorDe = (s) => s.valor ?? s.centavos ?? 0

// Barras por faixa (dia, semana ou mês), em SVG feito à mão: uma biblioteca de
// gráficos pesaria mais que a tela inteira.
//
// Uma série só, então sem legenda: o título diz o que é. Prismas em preto; o
// que está sob o dedo, mouse ou teclado fica vermelho e mostra o valor. O vermelho
// nunca pinta o gráfico todo, só a barra apontada. As cores vêm dos tokens do
// Tailwind (fill-ink, stroke-line...), para uma troca de paleta chegar aqui.
//
// formato="moeda" (padrão): a série traz `centavos` (e `compras`), como no Painel.
// formato="numero": a série traz `valor`, e `unidade` diz o que conta ("downloads").

const MARGEM_ESQ = 56
const MARGEM_BAIXO = 26
// Espaço para o rótulo do pico, acima da barra mais alta.
const MARGEM_TOPO = 22

// Arredonda o teto do eixo para um número "redondo" (1, 2, 3, 4, 5, 6 ou 8
// vezes uma potência de 10), para as linhas de guia caírem em valores legíveis
// sem deixar metade do gráfico vazia.
function tetoRedondo(v) {
  if (v <= 0) return 100
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p
  return 10 * p
}

const pontos = (...pares) => pares.map(([x, y]) => x + ',' + y).join(' ')

export default function Grafico({ serie, titulo, subtitulo, acoes, className = 'mt-6', formato = 'moeda', unidade = '', altura: ALTURA = 200 }) {
  const inteiro = formato === 'numero'
  const cheio = (v) => (inteiro ? numero(v) : moeda(v))
  const curto = (v) => (inteiro ? COMPACTO.format(v) : moedaCurta(v))
  const caixa = useRef(null)
  const [largura, setLargura] = useState(0)
  const [ativo, setAtivo] = useState(null)

  useEffect(() => {
    const el = caixa.current
    if (!el) return undefined
    const medir = () => setLargura(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => setAtivo(null), [serie])

  const n = serie.length
  const maior = serie.reduce((m, s) => Math.max(m, valorDe(s)), 0)
  // Contagem: teto par, para a guia do meio cair num número inteiro.
  const teto = inteiro ? Math.ceil(tetoRedondo(Math.max(maior, 4)) / 2) * 2 : tetoRedondo(maior)
  const areaW = Math.max(0, largura - MARGEM_ESQ - 12)
  const faixa = n ? areaW / n : 0
  // Em série densa, a profundidade encolhe para preservar a frente seguinte.
  const profundidade = Math.max(2, Math.min(12, faixa / 3, (faixa - 1) / 2))
  const barraW = Math.max(1, Math.min(40, faixa - profundidade))
  const dx = profundidade
  const dy = -profundidade * 0.6
  const areaH = ALTURA - MARGEM_TOPO - MARGEM_BAIXO + dy
  const base = MARGEM_TOPO + areaH - dy
  const passoRotulo = Math.max(1, Math.ceil(n / (largura < 520 ? 4 : 8)))
  // Gráfico alto ganha guias a cada quarto; contagem só em números inteiros.
  const guias = (ALTURA >= 260 ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1])
    .map((f) => f * teto)
    .filter((g) => !inteiro || Number.isInteger(g))
  const pico = maior > 0 ? serie.findIndex((s) => valorDe(s) === maior) : -1

  const indiceNoPonto = (clientX) => {
    const el = caixa.current
    if (!el || !n) return null
    const x = clientX - el.getBoundingClientRect().left - MARGEM_ESQ
    if (x < 0) return null
    return Math.min(n - 1, Math.max(0, Math.floor(x / faixa)))
  }

  const teclas = (e) => {
    if (!n) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const passo = e.key === 'ArrowRight' ? 1 : -1
      setAtivo((a) => (a === null ? (passo > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, a + passo))))
    } else if (e.key === 'Escape') {
      setAtivo(null)
    }
  }

  const ponto = ativo !== null ? serie[ativo] : null
  const centroX = ativo !== null ? MARGEM_ESQ + ativo * faixa + faixa / 2 : 0
  const resumo =
    titulo + '. ' + n + ' faixas. Maior valor: ' + cheio(maior) + '. Use as setas para percorrer.'

  return (
    <figure className={className + ' rounded-md border border-line bg-white px-4 pb-3 pt-4 sm:px-5'}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span>
          <span className="block text-[16px] font-bold tracking-[-0.01em] text-ink">{titulo}</span>
          {subtitulo && <span className="figs block text-[13.5px] text-ink-muted">{subtitulo}</span>}
        </span>
        {acoes}
      </figcaption>

      <div
        ref={caixa}
        tabIndex={0}
        role="group"
        aria-label={resumo}
        onKeyDown={teclas}
        onPointerMove={(e) => setAtivo(indiceNoPonto(e.clientX))}
        onPointerDown={(e) => setAtivo(indiceNoPonto(e.clientX))}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setAtivo(null)}
        onBlur={() => setAtivo(null)}
        className="relative mt-3 touch-pan-y select-none"
        style={{ height: ALTURA }}
      >
        {largura > 0 && (
          <svg width={largura} height={ALTURA} aria-hidden="true" className="block">
            {guias.map((g) => {
              const y = base - (g / teto) * areaH
              return (
                <g key={g}>
                  <line x1={MARGEM_ESQ + dx} x2={largura} y1={y + dy} y2={y + dy} className="stroke-line" strokeWidth="1" />
                  <line x1={MARGEM_ESQ} x2={MARGEM_ESQ + dx} y1={y} y2={y + dy} className="stroke-line" strokeWidth="1" />
                  <text x={MARGEM_ESQ - 8} y={y + 4} textAnchor="end" fontSize="11.5" className="figs fill-ink-muted">
                    {curto(g)}
                  </text>
                </g>
              )
            })}

            <polygon points={pontos([MARGEM_ESQ, base], [largura - dx, base], [largura, base + dy], [MARGEM_ESQ + dx, base + dy])} className="fill-paper stroke-line" strokeWidth="0.5" />

            {serie.map((s, i) => {
              const h = (valorDe(s) / teto) * areaH
              if (h <= 0) return null
              const x = MARGEM_ESQ + i * faixa + (faixa - barraW) / 2
              const y = base - h
              const destaque = i === ativo
              return (
                <g key={s.chave}>
                  <polygon points={pontos([x + barraW, y], [x + barraW + dx, y + dy], [x + barraW + dx, base + dy], [x + barraW, base])} className={(destaque ? 'fill-signal-deep' : 'fill-ink-muted') + ' transition-[fill] duration-150'} />
                  <polygon points={pontos([x, y], [x + dx, y + dy], [x + barraW + dx, y + dy], [x + barraW, y])} className={(destaque ? 'fill-signal-lite' : 'fill-mist-deep') + ' stroke-line transition-[fill] duration-150'} strokeWidth="0.5" />
                  <rect x={x} y={y} width={barraW} height={h} className={(destaque ? 'fill-signal' : 'fill-ink') + ' transition-[fill] duration-150'} />
                </g>
              )
            })}

            {ativo === null && pico >= 0 && (
              <text
                x={MARGEM_ESQ + pico * faixa + faixa / 2}
                y={base - (maior / teto) * areaH + dy - 6}
                textAnchor="middle"
                fontSize="12"
                className="figs fill-ink font-semibold"
              >
                {curto(maior)}
              </text>
            )}

            {ativo !== null && (
              <line
                x1={centroX}
                x2={centroX}
                y1={MARGEM_TOPO}
                y2={base}
                className="stroke-mist-deep"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {serie.map((s, i) =>
              i % passoRotulo === 0 ? (
                <text
                  key={s.chave}
                  x={MARGEM_ESQ + i * faixa + faixa / 2}
                  y={ALTURA - 8}
                  textAnchor="middle"
                  fontSize="11.5"
                  className="fill-ink-muted"
                >
                  {s.rotulo}
                </text>
              ) : null
            )}
          </svg>
        )}

        {ponto && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max rounded border border-line bg-white px-3 py-2 text-[13px]"
            style={{
              left: Math.min(Math.max(centroX, 70), Math.max(70, largura - 70)),
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-semibold text-ink">{ponto.rotulo}</p>
            <p className="figs text-ink">{cheio(valorDe(ponto))}</p>
            {inteiro ? (
              unidade && <p className="figs text-ink-muted">{unidade}</p>
            ) : (
              <p className="figs text-ink-muted">
                {numero(ponto.compras)} {ponto.compras === 1 ? 'compra' : 'compras'}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {ponto
          ? ponto.rotulo + ': ' + cheio(valorDe(ponto)) + (inteiro ? (unidade ? ' ' + unidade : '') : ', ' + ponto.compras + ' compras')
          : ''}
      </p>
    </figure>
  )
}
