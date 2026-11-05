import Link from 'next/link'
import { moeda, numero } from '../../formato'

// Os 10 afiliados que mais venderam no período: barras finas, a maior em
// vermelho (o único detalhe). O nome leva à ficha. `top`: [{ afiliado_id, nome, codigo, vendas, receita_liquida_centavos }]

export function tabelaDoTop(top) {
  return {
    colunas: ['Afiliado', 'Código', 'Vendas', 'Receita líquida'],
    linhas: top.map((t) => [t.nome, t.codigo, numero(t.vendas), moeda(t.receita_liquida_centavos)]),
  }
}

export default function TopAfiliados({ top }) {
  const maior = Math.max(1, ...top.map((t) => t.vendas))
  return (
    <ol className="flex flex-col" aria-label="Afiliados que mais venderam">
      {top.map((t, i) => (
        <li key={t.afiliado_id} className="border-t border-line first:border-t-0">
          <Link
            href={'/gestao/afiliados/lista?afiliado=' + t.afiliado_id}
            prefetch={false}
            className="-mx-2 block min-h-11 rounded px-2 py-2.5 transition-colors duration-150 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate">
                <span className="figs mr-2 inline-block w-5 text-right text-ink-muted">{i + 1}</span>
                <span className="font-semibold text-ink">{t.nome}</span>
                <span className="figs ml-2 text-[13px] text-ink-muted">{t.codigo}</span>
              </span>
              <span className="figs shrink-0 font-semibold text-ink">
                {numero(t.vendas)} {t.vendas === 1 ? 'venda' : 'vendas'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-sm bg-mist" aria-hidden="true">
                <div className={'h-full rounded-sm ' + (i === 0 ? 'bg-signal' : 'bg-ink')} style={{ width: Math.max(2, (t.vendas / maior) * 100) + '%' }} />
              </div>
              <span className="figs shrink-0 text-[13px] text-ink-muted">{moeda(t.receita_liquida_centavos)} líquidos</span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  )
}
