'use client'

import { useEffect, useRef, useState } from 'react'
import { moeda, moedaCurta, numero } from './formato'

// Faturamento por faixa (dia, semana ou mês), em SVG feito à mão: uma
// biblioteca de gráficos pesaria mais que a tela inteira.
//
// Uma série só, então sem legenda: o título diz o que é. Barras em preto; a
// que está sob o dedo ou o mouse fica vermelha e mostra o valor. O vermelho
// nunca pinta o gráfico todo, só a barra apontada.

const ALTURA = 200
const MARGEM_ESQ = 56
const MARGEM_BAIXO = 26
const MARGEM_TOPO = 10

// Arredonda o teto do eixo para um número "redondo" (1, 2 ou 5 vezes uma
// potência de 10), para as linhas de guia caírem em valores legíveis.
function tetoRedondo(v) {
  if (v <= 0) return 100
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 5, 10]) if (v <= m * p) return m * p
  return 10 * p
}

// Barra com os dois cantos de cima arredondados, presa na linha de base.
function barra(x, y, w, h) {
  const r = Math.min(4, w / 2, h)
  return (
    'M' + x + ' ' + (y + h) +
    'V' + (y + r) +
    'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
    'H' + (x + w - r) +
    'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
    'V' + (y + h) + 'Z'
  )
}

export default function Grafico({ serie, titulo }) {
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
  const maior = serie.reduce((m, s) => Math.max(m, s.centavos), 0)
  const teto = tetoRedondo(maior)
  const areaW = Math.max(0, largura - MARGEM_ESQ)
  const areaH = ALTURA - MARGEM_TOPO - MARGEM_BAIXO
  const faixa = n ? areaW / n : 0
  const vao = faixa > 8 ? 2 : 1
  const barraW = Math.max(1, Math.min(40, faixa - vao))
  const passoRotulo = Math.max(1, Math.ceil(n / (largura < 520 ? 4 : 8)))
  const guias = [0, teto / 2, teto]

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
    titulo + '. ' + n + ' faixas. Maior valor: ' + moeda(maior) + '. Use as setas para percorrer.'

  return (
    <figure className="mt-6 rounded border border-line bg-white px-4 pb-3 pt-4 sm:px-5">
      <figcaption className="text-[14.5px] font-semibold text-ink">{titulo}</figcaption>

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
              const y = MARGEM_TOPO + areaH - (g / teto) * areaH
              return (
                <g key={g}>
                  <line x1={MARGEM_ESQ} x2={largura} y1={y} y2={y} stroke="#E0E2E6" strokeWidth="1" />
                  <text x={MARGEM_ESQ - 8} y={y + 4} textAnchor="end" fontSize="11.5" fill="#5C5C5C" className="figs">
                    {moedaCurta(g)}
                  </text>
                </g>
              )
            })}

            {serie.map((s, i) => {
              const h = (s.centavos / teto) * areaH
              if (h <= 0) return null
              const x = MARGEM_ESQ + i * faixa + (faixa - barraW) / 2
              const y = MARGEM_TOPO + areaH - h
              return (
                <path
                  key={s.chave}
                  d={barra(x, y, barraW, h)}
                  fill={i === ativo ? '#E5152D' : '#0D0D0D'}
                  className="transition-[fill] duration-150"
                />
              )
            })}

            {ativo !== null && (
              <line
                x1={centroX}
                x2={centroX}
                y1={MARGEM_TOPO}
                y2={MARGEM_TOPO + areaH}
                stroke="#DADCE0"
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
                  fill="#5C5C5C"
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
            <p className="figs text-ink">{moeda(ponto.centavos)}</p>
            <p className="figs text-ink-muted">
              {numero(ponto.compras)} {ponto.compras === 1 ? 'compra' : 'compras'}
            </p>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {ponto ? ponto.rotulo + ': ' + moeda(ponto.centavos) + ', ' + ponto.compras + ' compras' : ''}
      </p>
    </figure>
  )
}
