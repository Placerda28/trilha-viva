import { numero } from './formato'

const TAXA = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
// Profundidade do prisma, em px (a mesma conta das faces com clip-path abaixo).
const P = 7

// Funil em lajes centradas: cada etapa é um prisma com a largura proporcional
// à primeira. Rótulo e número ficam na linha de cima de cada laje, então o
// desenho é o mesmo no computador e no celular. A última etapa leva o vermelho
// (detalhe, uma só). A lista já é texto: leitor de tela lê rótulo, valor e taxa.
//
// etapas: [{ id, rotulo, valor, texto? }], em ordem decrescente.
export default function Funil3D({ etapas = [], rotulo = 'Funil' }) {
  if (!etapas.length || !etapas[0].valor) return <p className="text-[14px] text-ink-muted">Sem carrinhos neste período.</p>
  const topo = etapas[0].valor
  return (
    <ol aria-label={rotulo} className="flex flex-col gap-4">
      {etapas.map((e, i) => {
        const ultimo = i > 0 && i === etapas.length - 1
        const pct = Math.max(12, Math.min(100, (e.valor / topo) * 100))
        const anterior = i ? etapas[i - 1].valor : 0
        return (
          <li key={e.id}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 font-medium text-ink">{e.rotulo}</span>
              <span className="figs shrink-0 text-[16px] font-bold text-ink">{numero(e.valor)}</span>
            </div>
            <div className="mt-1.5 flex justify-center" aria-hidden="true">
              <div className="relative h-[28px]" style={{ width: pct + '%' }}>
                <div className={'absolute bottom-0 left-0 ' + (ultimo ? 'bg-signal' : 'bg-ink')} style={{ right: P, top: P }} />
                <div
                  className={'absolute bottom-0 right-0 top-0 ' + (ultimo ? 'bg-signal-deep' : 'bg-ink-muted')}
                  style={{ width: P, clipPath: `polygon(0 ${P}px, 100% 0, 100% calc(100% - ${P}px), 0 100%)` }}
                />
                <div
                  className={'absolute inset-x-0 top-0 ' + (ultimo ? 'bg-signal-lite' : 'bg-mist-deep')}
                  style={{ height: P, clipPath: `polygon(${P}px 0, 100% 0, calc(100% - ${P}px) 100%, 0 100%)` }}
                />
              </div>
            </div>
            {i > 0 && (
              <p className="figs mt-1 text-center text-[12.5px] text-ink-muted">
                {TAXA.format(anterior ? (e.valor / anterior) * 100 : 0)}% da etapa anterior
              </p>
            )}
            {e.texto && <p className="mt-0.5 text-center text-[12.5px] text-ink-muted">{e.texto}</p>}
          </li>
        )
      })}
    </ol>
  )
}
