import Icone from '../../Icone'
import Kpi from '../../Kpi'
import { moeda, numero } from '../../formato'
import Selo from '../Selo'
import { fracao, ordenarNiveis, pctTexto, separarAviso } from '../painelUtil'

// "Está compensando?": a frase pronta do servidor num painel preto, o lucro
// como número principal e os cartões da especificação 6.4. Cada cartão traz
// a variação contra o período anterior (▲▼ %). Custo e custo por venda são
// piores quando sobem, então o vermelho vai na subida (`invertida`).

function Lucro({ c }) {
  const lucro = c.lucro_afiliados_centavos
  const prejuizo = lucro < 0
  return (
    <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-white/10 pt-5">
      <div>
        <p className="text-[14px] text-white/70">{prejuizo ? 'Prejuízo via afiliados' : 'Lucro via afiliados'}</p>
        <p className={'figs mt-1 text-[44px] font-extrabold leading-none tracking-[-0.03em] sm:text-[56px] ' + (prejuizo ? 'text-signal-lite' : 'text-white')}>
          {moeda(lucro)}
        </p>
        <Variacao comparacao={c.comparacao.lucro} />
      </div>
      <p className="figs max-w-[22rem] text-[14px] leading-relaxed text-white/70">
        Receita líquida de {moeda(c.receita_liquida_afiliados_centavos)} menos {moeda(c.custo_programa.total_centavos)} de custo do programa.
      </p>
    </div>
  )
}

// A variação em cima do painel preto: ▲ branco, ▼ vermelho claro.
function Variacao({ comparacao }) {
  const f = fracao(comparacao)
  if (f === null || Math.abs(f) < 0.0005) return <p className="mt-2 text-[13px] text-white/60">Sem comparação com o período anterior</p>
  const desce = f < 0
  return (
    <p className={'figs mt-2 flex items-center gap-1.5 text-[13.5px] font-semibold ' + (desce ? 'text-signal-lite' : 'text-white')}>
      <Icone nome={desce ? 'desce' : 'sobe'} tamanho={10} />
      {pctTexto(Math.abs(comparacao.pct))}
      <span className="font-normal text-white/60">{desce ? 'abaixo do período anterior' : 'acima do período anterior'}</span>
    </p>
  )
}

function LucroPorVenda({ l }) {
  const por = l.por_nivel || []
  const nomes = ordenarNiveis(por.map((n) => n.nivel))
  const linhas = nomes.map((nome) => por.find((n) => n.nivel === nome))
  return (
    <div className="rounded-md border border-line bg-white p-4 sm:p-5 col-span-2 xl:col-span-1">
      <p className="text-[13.5px] text-ink-muted">Lucro por venda: afiliado ou direta</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="figs text-[24px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">{l.afiliado_centavos === null ? '—' : moeda(l.afiliado_centavos)}</p>
          <p className="mt-1.5 text-[13px] text-ink-muted">venda por afiliado</p>
        </div>
        <div>
          <p className="figs text-[24px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[28px]">{l.direta_centavos === null ? '—' : moeda(l.direta_centavos)}</p>
          <p className="mt-1.5 text-[13px] text-ink-muted">venda direta, sem o custo de anúncio</p>
        </div>
      </div>
      {linhas.length > 0 && (
        <table className="mt-4 w-full text-[13.5px]">
          <caption className="sr-only">Lucro por venda em cada nível</caption>
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col" className="py-1.5 pr-2 font-medium">Nível</th>
              <th scope="col" className="py-1.5 px-2 text-right font-medium">Vendas</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">Lucro por venda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((n, i) => (
              <tr key={n.nivel}>
                <th scope="row" className="py-2 pr-2 text-left font-semibold text-ink"><Selo nome={n.nivel} posicao={i} /></th>
                <td className="figs px-2 py-2 text-right text-ink">{numero(n.vendas)}</td>
                <td className={'figs py-2 pl-2 text-right font-semibold ' + (n.lucro_por_venda_centavos < 0 ? 'text-signal-deep' : 'text-ink')}>
                  {n.lucro_por_venda_centavos === null ? '—' : moeda(n.lucro_por_venda_centavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Compensa({ dados }) {
  const c = dados.compensa
  const { principal, aviso } = separarAviso(dados.frase)
  const cmp = c.comparacao
  const custo = c.custo_programa
  const partes = [
    ['comissões', custo.base_centavos],
    ['bônus', custo.bonus_centavos],
    ['ajustes', custo.ajustes_centavos],
    ['estornos', custo.estornos_centavos],
  ].filter(([, v]) => v)

  return (
    <section aria-labelledby="titulo-compensa">
      <div className="rounded-md bg-ink p-5 text-white sm:p-6">
        <h2 id="titulo-compensa" className="text-[20px] font-bold tracking-[-0.015em] sm:text-[22px]">Está compensando?</h2>
        <p className="mt-3 max-w-[46rem] text-[16.5px] leading-[1.55] text-white/90">{principal}</p>
        {aviso && (
          <p className="mt-3 flex max-w-[46rem] items-start gap-2 border-l-2 border-signal-lite pl-3 text-[14px] leading-relaxed text-white/80">
            <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0 text-signal-lite" />
            {aviso}
          </p>
        )}
        <Lucro c={c} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Kpi
          rotulo="Receita líquida via afiliados"
          valor={moeda(c.receita_liquida_afiliados_centavos)}
          variacao={fracao(cmp.receita_liquida)}
          detalhe={'Antes: ' + moeda(cmp.receita_liquida.anterior)}
        />
        <Kpi
          rotulo="Custo do programa"
          valor={moeda(custo.total_centavos)}
          variacao={fracao(cmp.custo)}
          invertida
          detalhe={
            (partes.length ? partes.map(([n, v]) => n + ' ' + moeda(v)).join(', ') : 'Nenhum custo no período') +
            (custo.como_contado ? '. ' + custo.como_contado : '')
          }
        />
        <Kpi
          rotulo="Custo por venda (CPA)"
          valor={c.cpa_centavos === null ? '—' : moeda(c.cpa_centavos)}
          variacao={fracao(cmp.cpa)}
          invertida
          detalhe={c.cpa_centavos === null ? 'Sem vendas por afiliado no período' : 'comissão por venda, para comparar com o Meta Ads'}
        />
        <Kpi
          rotulo="Vendas por afiliados"
          valor={numero(c.vendas_afiliados)}
          variacao={fracao(cmp.vendas_afiliados)}
          detalhe={'de ' + numero(c.vendas_total) + ' vendas no total (' + numero(c.vendas_diretas) + ' diretas)'}
        />
        <Kpi
          rotulo="Parte das vendas vinda de afiliados"
          valor={pctTexto(c.pct_vendas_afiliados)}
          variacao={fracao(cmp.pct_vendas_afiliados)}
          detalhe={c.pct_vendas_afiliados === null ? 'Sem vendas no período' : 'vendas por afiliado ÷ vendas totais'}
        />
        <LucroPorVenda l={c.lucro_por_venda} />
      </div>
    </section>
  )
}
