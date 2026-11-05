import Link from 'next/link'
import { dataBr } from '@/lib/afiliados-painel'
import { moeda, numero } from '../../formato'
import { dirPadrao, percentual, textoFaltam } from '../afiliadosUtil'
import { NivelSelo, Status } from './Pecas'

// A lista em dois desenhos: tabela de 13 colunas de 1024 px em diante (rola
// dentro do próprio bloco, com a coluna do nome parada) e cartões abaixo disso.

const COLUNAS = [
  { id: 'codigo', rotulo: 'Código', cel: (i) => <span className="figs font-semibold">{i.codigo}</span> },
  { id: 'status', rotulo: 'Status', cel: (i) => <Status status={i.status} /> },
  { id: 'nivel', rotulo: 'Nível do mês', cel: (i, n) => <NivelSelo nivel={i.nivel} niveis={n} travado={i.nivel_travado} /> },
  { id: 'vendas', rotulo: 'Vendas no mês', num: true, cel: (i) => numero(i.vendas_mes) },
  { id: 'faltam', rotulo: 'Faltam para subir', cel: (i) => textoFaltam(i) },
  { id: 'cliques', rotulo: 'Cliques (30 dias)', num: true, cel: (i) => numero(i.cliques_30d) },
  { id: 'conversao', rotulo: 'Conversão', num: true, cel: (i) => percentual(i.conversao_pct) },
  { id: 'receita', rotulo: 'Receita gerada', num: true, cel: (i) => moeda(i.receita_centavos) },
  { id: 'comissao', rotulo: 'Comissão prevista', num: true, cel: (i) => moeda(i.comissao_prevista_centavos) },
  { id: 'estornos', rotulo: 'Estornos', num: true, cel: (i) => numero(i.estornos) },
  { id: 'disponivel', rotulo: 'Disponível', num: true, cel: (i) => moeda(i.disponivel_centavos) },
  { id: 'pago', rotulo: 'Total pago', num: true, cel: (i) => moeda(i.total_pago_centavos) },
  { id: 'ultima_venda', rotulo: 'Última venda', cel: (i) => (i.ultima_venda ? dataBr(i.ultima_venda) : '—') },
]

const hrefDe = (base, id) => `${base}?afiliado=${id}`

function Cabecalho({ coluna, ordem, dir, aoOrdenar }) {
  const ativa = ordem === coluna.id
  const sentido = ativa ? (dir || dirPadrao(coluna.id)) : null
  return (
    <th scope="col" aria-sort={sentido ? (sentido === 'asc' ? 'ascending' : 'descending') : undefined} className={'whitespace-nowrap border-b border-line bg-white p-0 font-semibold ' + (coluna.num ? 'text-right' : 'text-left')}>
      <button
        type="button"
        onClick={() => aoOrdenar(coluna.id)}
        className={'inline-flex min-h-11 items-center gap-1.5 px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ' + (ativa ? 'text-ink' : 'text-ink-muted hover:text-ink')}
      >
        {coluna.rotulo}
        <span aria-hidden="true" className={'inline-block h-2 w-2 ' + (ativa ? 'bg-signal' : 'bg-transparent')} style={sentido === 'asc' ? { clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' } : { clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        <span className="sr-only">{ativa ? (sentido === 'asc' ? ', do menor para o maior' : ', do maior para o menor') : ', ordenar'}</span>
      </button>
    </th>
  )
}

function Tabela({ itens, niveis, ordem, dir, base, aoOrdenar }) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-line bg-white lg:block">
      <table className="w-full min-w-[1500px] border-collapse text-[14.5px]">
        <caption className="sr-only">Afiliados, com os números do mês escolhido</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ordem === 'nome' ? (dir || dirPadrao('nome')) === 'asc' ? 'ascending' : 'descending' : undefined} className="sticky left-0 z-10 w-[15rem] min-w-[15rem] border-b border-r border-line bg-white p-0 text-left">
              <button type="button" onClick={() => aoOrdenar('nome')} className={'inline-flex min-h-11 items-center px-3 text-[13.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ' + (ordem === 'nome' ? 'text-ink' : 'text-ink-muted hover:text-ink')}>
                Nome
                {ordem === 'nome' && <span className="sr-only">{(dir || dirPadrao('nome')) === 'asc' ? ', de A a Z' : ', de Z a A'}</span>}
              </button>
            </th>
            {COLUNAS.map((c) => (
              <Cabecalho key={c.id} coluna={c} ordem={ordem} dir={dir} aoOrdenar={aoOrdenar} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {itens.map((i) => (
            <tr key={i.id} className="group hover:bg-paper/70">
              <th scope="row" className="sticky left-0 z-10 border-r border-line bg-white p-0 text-left font-normal group-hover:bg-[#f7f8f9]">
                <Link href={hrefDe(base, i.id)} prefetch={false} className="block min-h-11 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink">
                  <span className="block truncate text-[15px] font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 group-hover:decoration-signal">{i.nome}</span>
                  <span className="block truncate text-[13px] text-ink-muted">{i.email}</span>
                  {i.saque_pendente && <span className="mt-0.5 block text-[13px] font-bold text-signal-deep">Saque pendente</span>}
                </Link>
              </th>
              {COLUNAS.map((c) => (
                <td key={c.id} className={'figs whitespace-nowrap px-3 py-2.5 text-ink ' + (c.num ? 'text-right' : 'text-left')}>
                  {c.cel(i, niveis)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Numero({ rotulo, children }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-0.5 text-[15.5px] font-bold text-ink">{children}</dd>
    </div>
  )
}

function Cartoes({ itens, niveis, base }) {
  return (
    <ul className="space-y-3 lg:hidden">
      {itens.map((i) => (
        <li key={i.id}>
          <Link href={hrefDe(base, i.id)} prefetch={false} className={'card-line relative block px-4 py-4 transition-colors hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:px-5 ' + (i.saque_pendente ? 'border-l-[3px] border-l-signal' : '')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-[16.5px] font-bold leading-snug text-ink">{i.nome}</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  Código <span className="figs font-semibold text-ink">{i.codigo}</span>
                </p>
              </div>
              <Status status={i.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <NivelSelo nivel={i.nivel} niveis={niveis} travado={i.nivel_travado} />
              <p className="text-[13.5px] text-ink-muted">{textoFaltam(i)}</p>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3.5 sm:grid-cols-4">
              <Numero rotulo="Vendas no mês">{numero(i.vendas_mes)}</Numero>
              <Numero rotulo="Comissão prevista">{moeda(i.comissao_prevista_centavos)}</Numero>
              <Numero rotulo="Disponível">{moeda(i.disponivel_centavos)}</Numero>
              <Numero rotulo="Total pago">{moeda(i.total_pago_centavos)}</Numero>
            </dl>
            <p className="mt-3 text-[13.5px] leading-[1.5] text-ink-muted">
              {numero(i.cliques_30d)} {i.cliques_30d === 1 ? 'clique' : 'cliques'} em 30 dias, conversão {percentual(i.conversao_pct)}, {numero(i.estornos)} {i.estornos === 1 ? 'estorno' : 'estornos'}
              {i.ultima_venda ? `, última venda em ${dataBr(i.ultima_venda)}` : ', sem vendas ainda'}.
            </p>
            {i.saque_pendente && <p className="mt-3 text-[14px] font-bold text-signal-deep">Saque pendente</p>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function ListaTabela(props) {
  return (
    <>
      <Tabela {...props} />
      <Cartoes itens={props.itens} niveis={props.niveis} base={props.base} />
    </>
  )
}
