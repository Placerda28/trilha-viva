import { reais } from '@/lib/afiliados-campos'
import { diaMes, nomeDoMes, vendasTxt } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'

// O mês em uma conta só: vendas que contam, nível e quanto fica a receber no
// fechamento. Só mostra números que o servidor mandou (`aReceber`, `seBaterProximo`).
export default function GanhosMes({ d }) {
  const { aReceber, niveis, nivel, vendasValidas, mes, proximo, seBaterProximo } = d
  const mesNome = nomeDoMes(mes)
  const dia = Number(String(aReceber.liberaEm || '').slice(8, 10))
  const ordenados = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  const base = ordenados[0]
  return (
    <section className="card-line px-5 py-6 sm:px-8 sm:py-7 lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10" aria-labelledby="ganhos-titulo">
      <div>
        <h2 id="ganhos-titulo" className="text-[17px] font-bold text-ink">
          {mesNome}{' '}
          <Ajuda titulo={`Seu mês de ${mesNome.toLowerCase()}`}>
            <p>O valor do mês é o número de vendas vezes o valor do nível que você atingiu. Todas as vendas do mês valem o valor do nível mais alto que você alcançar.</p>
            <p>No dia {dia} o mês fecha, e o total fica disponível de uma vez para você sacar.</p>
          </Ajuda>
        </h2>
        <p className="figs mt-3 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-[52px]">
          {reais(aReceber.valor)}
        </p>
        <p className="mt-2 text-[14.5px] text-ink-muted">a receber em {diaMes(aReceber.liberaEm)}, quando o mês fecha</p>
      </div>

      <dl className="mt-6 divide-y divide-line border-t border-line lg:mt-0 lg:self-center lg:border-t-0">
        <div className="py-4 lg:pt-0">
          <dt className="text-[16px] font-bold text-ink">{vendasTxt(vendasValidas)} no mês</dt>
          <dd className="mt-1 text-[14.5px] leading-[1.5] text-ink-muted">
            {nivel
              ? `Nível ${nivel.nome}: ${reais(nivel.valor_por_venda_centavos)} por venda, no mês inteiro.`
              : base
                ? `Com a primeira venda você entra no ${base.nome}, a ${reais(base.valor_por_venda_centavos)} por venda.`
                : ''}
          </dd>
        </div>
        <div className="py-4 lg:pb-0">
          {proximo && seBaterProximo ? (
            <>
              <dt className="flex flex-col gap-1 text-[16px] font-bold text-ink sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span>Se chegar ao {proximo.nome}, seu mês vale</span>
                <span className="figs whitespace-nowrap text-[22px] font-extrabold">{reais(seBaterProximo.total)}</span>
              </dt>
              <dd className="mt-1 text-[14.5px] leading-[1.5] text-ink-muted">
                São {proximo.vendas_minimas} vendas, todas a {reais(proximo.valor_por_venda_centavos)}.
              </dd>
            </>
          ) : (
            <>
              <dt className="text-[16px] font-bold text-ink">Você está no nível mais alto</dt>
              <dd className="mt-1 text-[14.5px] leading-[1.5] text-ink-muted">Cada venda a mais soma o valor do {nivel?.nome || 'seu nível'} ao mês.</dd>
            </>
          )}
        </div>
      </dl>
    </section>
  )
}
