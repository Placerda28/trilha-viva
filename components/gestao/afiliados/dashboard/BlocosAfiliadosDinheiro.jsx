import Link from 'next/link'
import { diaPorExtenso, moeda, numero } from '../../formato'
import Selo from '../Selo'
import { mesLongo, ordenarNiveis } from '../painelUtil'

// Os dois blocos de texto do Dashboard: "Afiliados" (quantos são, quem vendeu,
// em que nível está) e "Dinheiro a pagar" (o que já dá para sacar, o que ainda
// ainda vai fechar e a previsão do próximo fechamento). Tudo vem calculado do servidor.

function Linha({ rotulo, valor, detalhe, href }) {
  const corpo = (
    <>
      <div className="min-w-0">
        <dt className="text-[14.5px] text-ink">{rotulo}</dt>
        {detalhe && <dd className="mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
      </div>
      <dd className="figs shrink-0 text-[17px] font-bold text-ink">{valor}</dd>
    </>
  )
  const cls = 'flex min-h-11 items-center justify-between gap-4 py-2.5 '
  return href ? (
    <Link href={href} prefetch={false} className={cls + 'rounded-sm transition-colors duration-150 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink'}>
      {corpo}
    </Link>
  ) : (
    <div className={cls}>{corpo}</div>
  )
}

const Caixa = ({ titulo, id, children }) => (
  <section aria-labelledby={id} className="min-w-0 rounded-md border border-line bg-white p-4 sm:p-5">
    <h2 id={id} className="text-[17px] font-bold tracking-[-0.01em] text-ink">{titulo}</h2>
    {children}
  </section>
)

export function BlocoAfiliados({ a }) {
  const niveis = a.por_nivel_mes_atual
  const nomes = ordenarNiveis(Object.keys(niveis.niveis))
  return (
    <Caixa titulo="Afiliados" id="titulo-afiliados">
      <dl className="mt-2 divide-y divide-line">
        <Linha rotulo="Cadastrados" valor={numero(a.cadastrados)} detalhe={numero(a.ativos) + ' ativos, ' + numero(a.pendentes) + ' esperando aprovação'} />
        <Linha rotulo="Venderam no período" valor={numero(a.venderam)} />
        <Linha rotulo="Novos no período" valor={numero(a.novos)} />
        <Linha rotulo="Sem vender há 30 dias ou mais" valor={numero(a.inativos_30d)} detalhe="só contam os ativos" />
        <Linha rotulo="Suspensos" valor={numero(a.suspensos)} />
      </dl>

      <div className="mt-4 border-t border-line pt-4">
        <h3 className="text-[14.5px] font-semibold text-ink">Em cada nível em {mesLongo(niveis.mes)}</h3>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {nomes.map((nome, i) => (
            <li key={nome} className="rounded border border-line px-3 py-2.5">
              <p className="figs text-[22px] font-bold leading-none text-ink">{numero(niveis.niveis[nome])}</p>
              <Selo nome={nome} posicao={i} className="mt-2 text-[13px] text-ink-muted" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-ink-muted">{numero(niveis.ativos_sem_vendas)} ativos ainda sem venda neste mês.</p>
      </div>

      <div className="mt-3 rounded bg-paper px-3 py-2.5">
        <p className="text-[14.5px] text-ink">
          <span className="figs font-bold">{numero(a.perto_de_subir)}</span>{' '}
          {a.perto_de_subir === 1 ? 'afiliado está perto de subir de nível' : 'afiliados estão perto de subir de nível'}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-muted">Faltam 3 vendas ou menos para o próximo nível.</p>
      </div>
    </Caixa>
  )
}

export function BlocoDinheiro({ d }) {
  const prev = d.previsao_15_dias
  const bonus = d.bonus_previsto
  return (
    <Caixa titulo="Dinheiro a pagar" id="titulo-dinheiro">
      <dl className="mt-2 divide-y divide-line">
        <Linha rotulo="Disponível para saque" valor={moeda(d.disponivel_centavos)} detalhe="de meses já fechados" />
        <Linha rotulo="A liberar no fechamento" valor={moeda(d.liberando_centavos)} detalhe="vendas dos meses ainda abertos, só a base" />
        <Linha
          rotulo="Saques esperando pagamento"
          valor={moeda(d.saques_pendentes.valor_centavos)}
          detalhe={d.saques_pendentes.quantidade === 1 ? '1 pedido' : numero(d.saques_pendentes.quantidade) + ' pedidos'}
          href="/gestao/afiliados/saques"
        />
        <Linha rotulo="Pago no período" valor={moeda(d.pago_no_periodo.valor_centavos)} detalhe={numero(d.pago_no_periodo.quantidade) + ' saques'} />
        <Linha rotulo="Pago desde o início" valor={moeda(d.pago_desde_o_inicio.valor_centavos)} detalhe={numero(d.pago_desde_o_inicio.quantidade) + ' saques'} />
      </dl>

      <div className="mt-4 border-t border-line pt-4">
        <h3 className="text-[14.5px] font-semibold text-ink">Bônus de nível previsto</h3>
        <p className="figs mt-1 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink">{moeda(bonus.total_centavos)}</p>
        {bonus.partes.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-muted">Nenhum mês aberto com bônus para pagar.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-[13.5px]">
            {bonus.partes.map((p) => (
              <li key={p.mes} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-ink-muted">
                  {mesLongo(p.mes)}, fecha em <span className="figs">{diaPorExtenso(p.fecha_em)}</span>
                </span>
                <span className="figs font-semibold text-ink">{moeda(p.valor_centavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 rounded bg-paper px-3 py-3">
        <h3 className="text-[14.5px] font-semibold text-ink">Próximo fechamento</h3>
        <p className="figs mt-1 text-[20px] font-bold leading-none text-ink">{moeda(prev.total_centavos)}</p>
        <p className="figs mt-1.5 text-[13px] text-ink-muted">
          {moeda(prev.libera_centavos)} de base e {moeda(prev.bonus_centavos)} de bônus entram no saldo
        </p>
      </div>
    </Caixa>
  )
}
