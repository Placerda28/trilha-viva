import { reais } from '@/lib/afiliados-campos'
import { nomeDoMes, vendasTxt } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { VendaLinhas, VendaTabela } from './ListaVendas'

export function UltimasVendas({ itens, irPara }) {
  if (!itens.length) return null
  return (
    <section className="card-line px-5 pb-2 pt-6 sm:px-8" aria-labelledby="ultimas-titulo">
      <h2 id="ultimas-titulo" className="text-[17px] font-bold text-ink">
        Últimas vendas{' '}
        <Ajuda titulo="Situação da venda">
          <p>O ponto colorido mostra em que pé está cada venda: liberando (esperando o prazo), disponível, em saque, paga ou cancelada.</p>
          <p>A aba Minhas vendas explica cada cor.</p>
        </Ajuda>
      </h2>
      <div className="md:hidden"><VendaLinhas itens={itens} resumida /></div>
      <div className="hidden md:block"><VendaTabela itens={itens} /></div>
      <div className="border-t border-line py-1">
        <button type="button" onClick={() => irPara('vendas')} className="link-signal min-h-11">
          Ver todas as vendas
        </button>
      </div>
    </section>
  )
}

// Este mês contra o mês passado. O percentual vem pronto do servidor.
export function ComparaMes({ d }) {
  const { mesPassado, variacaoPct, vendasValidas, mes } = d
  if (!mesPassado) return null
  const v = variacaoPct
  const frase =
    v === null || v === undefined
      ? ''
      : v > 0
        ? `${v}% a mais que no mês passado`
        : v < 0
          ? `${Math.abs(v)}% a menos que no mês passado`
          : 'Igual ao mês passado'
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="compara-titulo">
      <h2 id="compara-titulo" className="text-[17px] font-bold text-ink">
        Comparando com o mês passado
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:gap-8">
        <div>
          <dt className="text-[14px] text-ink-muted">{nomeDoMes(mesPassado.mes)}</dt>
          <dd className="figs mt-1 text-[26px] font-extrabold leading-none text-ink">{vendasTxt(mesPassado.vendas)}</dd>
          <dd className="mt-1.5 text-[14px] text-ink-muted">
            {mesPassado.nivel ? `${mesPassado.nivel.nome}, ` : ''}
            {reais(mesPassado.total)}
          </dd>
        </div>
        <div>
          <dt className="text-[14px] text-ink-muted">{nomeDoMes(mes)} até agora</dt>
          <dd className="figs mt-1 text-[26px] font-extrabold leading-none text-ink">{vendasTxt(vendasValidas)}</dd>
          {frase && <dd className="mt-1.5 text-[14px] font-semibold text-ink">{frase}</dd>}
        </div>
      </dl>
    </section>
  )
}
