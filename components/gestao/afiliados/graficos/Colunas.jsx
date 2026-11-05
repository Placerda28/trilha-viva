'use client'

import { useEffect, useState } from 'react'
import { useLargura } from './useLargura'

// Colunas em SVG feito à mão, o mesmo gráfico para quatro telas do Dashboard:
//  - empilhado: vendas por dia (diretas e por afiliado), distribuição por nível;
//  - agrupado: receita líquida e custo por mês, com a linha do lucro por cima;
//  - uma série só: novos afiliados por mês.
// Medidas da especificação de gráficos: coluna de no máximo 24 px com 4 px de
// canto redondo só na ponta (a base é reta), vão de 2 px do branco entre
// segmentos, linha de 2 px, marcador de 8 px com anel branco, guias de 1 px.
// Um eixo só: a linha do lucro está na mesma unidade (R$) das colunas.
//
// pontos: [{ chave, rotulo, titulo, valores: { [serie.id]: número } }]
// series: [{ id, nome, cor }]   linha: { id, nome, cor, valores: [número por ponto] } (opcional)

const ALTURA = 220
const TOPO = 12
const BAIXO = 28
const GAP = 2

// Teto "redondo" (1, 2 ou 5 vezes uma potência de 10) para as guias caírem em números legíveis.
function tetoRedondo(v) {
  if (v <= 0) return 4
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 5, 10]) if (v <= m * p) return m * p
  return 10 * p
}

// Coluna com o canto de cima redondo (arredonda=true) ou reta, presa na base.
function coluna(x, y, w, h, arredonda) {
  const r = arredonda ? Math.min(4, w / 2, h) : 0
  return `M${x} ${y + h}V${y + r}${r ? `Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}` : `H${x + w}`}V${y + h}Z`
}

export function montarTabela({ primeira, pontos, series, linha, formatar }) {
  const colunas = [primeira, ...series.map((s) => s.nome), ...(linha ? [linha.nome] : [])]
  const linhas = pontos.map((p, i) => [
    p.titulo || p.rotulo,
    ...series.map((s) => formatar(p.valores[s.id] || 0)),
    ...(linha ? [formatar(linha.valores[i] || 0)] : []),
  ])
  return { colunas, linhas }
}

export default function Colunas({ pontos, series, modo = 'empilhado', linha, formatar, curto, inteiro = false, margemEsq = 52, rotuloGeral }) {
  const [caixa, largura] = useLargura()
  const [ativo, setAtivo] = useState(null)
  useEffect(() => setAtivo(null), [pontos])

  const n = pontos.length
  const totais = pontos.map((p) =>
    modo === 'empilhado' ? series.reduce((t, s) => t + (p.valores[s.id] || 0), 0) : Math.max(0, ...series.map((s) => p.valores[s.id] || 0))
  )
  const maior = Math.max(0, ...totais, ...(linha ? linha.valores : []))
  const menor = Math.min(0, ...(linha ? linha.valores : []))
  const teto = inteiro ? Math.ceil(tetoRedondo(Math.max(maior, 4)) / 2) * 2 : tetoRedondo(maior)
  const piso = menor < 0 ? -tetoRedondo(-menor) : 0
  const guias = piso < 0 ? [piso, 0, teto / 2, teto] : [0, teto / 2, teto]

  const areaW = Math.max(0, largura - margemEsq - 4)
  const areaH = ALTURA - TOPO - BAIXO
  const faixa = n ? areaW / n : 0
  const y = (v) => TOPO + ((teto - v) / (teto - piso)) * areaH
  const k = modo === 'agrupado' ? series.length : 1
  const largCol = Math.max(1, Math.min(24, (faixa - (faixa > 8 ? 4 : 1) - GAP * (k - 1)) / k))
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(areaW / 56))))
  const xCentro = (i) => margemEsq + i * faixa + faixa / 2

  const indiceNoPonto = (clientX) => {
    const el = caixa.current
    if (!el || !n) return null
    const x = clientX - el.getBoundingClientRect().left - margemEsq
    return x < 0 ? null : Math.min(n - 1, Math.max(0, Math.floor(x / faixa)))
  }
  const teclas = (e) => {
    if (e.key === 'Escape') return setAtivo(null)
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const passo = e.key === 'ArrowRight' ? 1 : -1
    setAtivo((a) => (a === null ? (passo > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, a + passo))))
  }

  const ponto = ativo !== null ? pontos[ativo] : null
  const itensDoPonto = ponto
    ? [...series.map((s) => ({ ...s, v: ponto.valores[s.id] || 0 })), ...(linha ? [{ ...linha, v: linha.valores[ativo] || 0, traco: true }] : [])]
    : []

  return (
    <div
      ref={caixa}
      tabIndex={0}
      role="group"
      aria-label={rotuloGeral + ' Use as setas para percorrer. A tabela abaixo traz os mesmos números.'}
      onKeyDown={teclas}
      onPointerMove={(e) => setAtivo(indiceNoPonto(e.clientX))}
      onPointerDown={(e) => setAtivo(indiceNoPonto(e.clientX))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setAtivo(null)}
      onBlur={() => setAtivo(null)}
      className="relative touch-pan-y select-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      style={{ height: ALTURA }}
    >
      {largura > 0 && (
        <svg width={largura} height={ALTURA} aria-hidden="true" className="block">
          {ativo !== null && <rect x={margemEsq + ativo * faixa} y={TOPO} width={faixa} height={areaH} className="fill-paper" />}
          {guias.map((g) => (
            <g key={g}>
              <line x1={margemEsq} x2={largura} y1={y(g)} y2={y(g)} className={g === 0 && piso < 0 ? 'stroke-mist-deep' : 'stroke-line'} strokeWidth="1" />
              <text x={margemEsq - 8} y={y(g) + 4} textAnchor="end" fontSize="11.5" className="figs fill-ink-muted">
                {curto(g)}
              </text>
            </g>
          ))}

          {pontos.map((p, i) => {
            const x0 = xCentro(i) - (k * largCol + GAP * (k - 1)) / 2
            if (modo === 'agrupado') {
              return series.map((s, j) => {
                const h = ((p.valores[s.id] || 0) / (teto - piso)) * areaH
                return h > 0 ? <path key={s.id + p.chave} d={coluna(x0 + j * (largCol + GAP), y(0) - h, largCol, h, true)} fill={s.cor} /> : null
              })
            }
            // Empilhado: de baixo para cima; só o último segmento com valor leva o canto redondo.
            const comValor = series.filter((s) => (p.valores[s.id] || 0) > 0)
            let acima = 0
            return comValor.map((s, j) => {
              const v = p.valores[s.id]
              const topo = y(acima + v)
              const base = y(acima) - (j ? GAP : 0)
              acima += v
              const h = base - topo
              return h > 0 ? <path key={s.id + p.chave} d={coluna(x0, topo, largCol, Math.max(1, h), j === comValor.length - 1)} fill={s.cor} /> : null
            })
          })}

          {linha && n > 0 && (
            <>
              <polyline
                points={pontos.map((p, i) => xCentro(i) + ',' + y(linha.valores[i] || 0)).join(' ')}
                fill="none"
                stroke={linha.cor}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pontos.map((p, i) =>
                n <= 24 || i === ativo ? (
                  <circle key={p.chave} cx={xCentro(i)} cy={y(linha.valores[i] || 0)} r="5" fill={linha.cor} stroke="#fff" strokeWidth="2" />
                ) : null
              )}
            </>
          )}

          {pontos.map((p, i) =>
            i % passoRotulo === 0 ? (
              <text key={p.chave} x={xCentro(i)} y={ALTURA - 9} textAnchor="middle" fontSize="11.5" className="fill-ink-muted">
                {p.rotulo}
              </text>
            ) : null
          )}
        </svg>
      )}

      {ponto && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] rounded border border-line bg-white px-3 py-2 text-[13px]"
          style={{ left: Math.min(Math.max(xCentro(ativo), 112), Math.max(112, largura - 112)), transform: 'translateX(-50%)' }}
        >
          <p className="font-semibold text-ink">{ponto.titulo || ponto.rotulo}</p>
          {itensDoPonto.map((s) => (
            <p key={s.id} className="figs mt-0.5 flex items-center gap-2 text-ink">
              <span aria-hidden="true" className={s.traco ? 'h-[2px] w-3 shrink-0' : 'h-2.5 w-2.5 shrink-0 rounded-sm'} style={{ backgroundColor: s.cor }} />
              <span className="font-semibold">{formatar(s.v)}</span>
              <span className="text-ink-muted">{s.nome}</span>
            </p>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {ponto ? (ponto.titulo || ponto.rotulo) + ': ' + itensDoPonto.map((s) => s.nome + ' ' + formatar(s.v)).join(', ') : ''}
      </p>
    </div>
  )
}
