import { Paginacao } from '../../Estados'
import { dataHora, moeda, numero } from '../../formato'
import { ROTULO_STATUS, ROTULO_TIPO, TIPOS_FILTRO, mesCurto } from '../painelUtil'

// O extrato geral: um lançamento por linha, do mais novo ao mais velho. O
// nome do afiliado filtra o extrato por ele. No celular a linha empilha
// (nome e valor em cima, detalhes embaixo); no computador, os detalhes vão em
// uma fileira só. Estorno e ajuste negativo saem em vermelho de texto.
// Sem tabela larga: nada de rolagem lateral.

const CAMPO = 'h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-ink focus:border-ink focus:outline-none'

export function FiltrosExtrato({ tipo, aoTipo, afiliado, aoLimpar }) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="block w-full sm:w-60">
        <span className="text-[13px] text-ink-muted">Tipo de lançamento</span>
        <select value={tipo} onChange={(e) => aoTipo(e.target.value)} className={CAMPO + ' mt-1'}>
          {TIPOS_FILTRO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </label>
      {afiliado && (
        <p className="flex min-h-11 items-center gap-2 rounded border border-ink bg-white pl-3 text-[14px] text-ink">
          <span>
            Só <span className="font-semibold">{afiliado.nome}</span> <span className="figs text-ink-muted">({afiliado.codigo})</span>
          </span>
          <button
            type="button"
            onClick={aoLimpar}
            aria-label={'Tirar o filtro de ' + afiliado.nome}
            className="grid h-11 w-11 place-items-center rounded-r text-[18px] leading-none text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
          >
            ×
          </button>
        </p>
      )}
    </div>
  )
}

function Linha({ item: i, aoAfiliado }) {
  const negativo = i.valor_centavos < 0
  const detalhes = [
    ROTULO_TIPO[i.tipo] || i.tipo,
    i.mes_referencia ? 'ref. ' + mesCurto(i.mes_referencia) : '',
    ROTULO_STATUS[i.status] || i.status,
    i.compra_id ? 'compra ' + i.compra_id : '',
    i.saque_id ? 'saque ' + i.saque_id : '',
  ].filter(Boolean)
  return (
    <li className="px-4 py-3 sm:px-5 md:grid md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1.3fr)_8rem] md:items-center md:gap-4">
      <p className="figs hidden text-[13.5px] text-ink-muted md:block">{dataHora(i.quando)}</p>
      <div className="flex items-start justify-between gap-3 md:contents">
        <button
          type="button"
          onClick={() => aoAfiliado(i.afiliado)}
          title="Ver só os lançamentos deste afiliado"
          className="-mx-1 min-h-11 min-w-0 rounded px-1 text-left hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:order-2 md:justify-self-start"
        >
          <span className="block break-words text-[15px] font-semibold leading-snug text-ink">{i.afiliado.nome}</span>
          <span className="figs block text-[13px] text-ink-muted">{i.afiliado.codigo}</span>
        </button>
        <p className={'figs shrink-0 pt-2 text-[16px] font-bold md:order-4 md:pt-0 md:text-right ' + (negativo ? 'text-signal-deep' : 'text-ink')}>{moeda(i.valor_centavos)}</p>
      </div>
      <div className="md:order-3">
        <p className="figs text-[13.5px] text-ink-muted md:hidden">{dataHora(i.quando)}</p>
        <p className="text-[13.5px] text-ink">{detalhes.join(' · ')}</p>
        {i.descricao && <p className="mt-0.5 break-words text-[13px] text-ink-muted">{i.descricao}</p>}
      </div>
    </li>
  )
}

export default function Extrato({ extrato, aoAfiliado, aoPagina, carregando }) {
  const { itens, pagina, por_pagina: porPagina, total_itens: total, soma_centavos: soma } = extrato
  return (
    <div className={'transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
      {itens.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-mist-deep px-4 py-8 text-center text-[14.5px] text-ink-muted">
          <span className="block font-semibold text-ink">Nenhum lançamento</span>
          Não há lançamentos com esses filtros neste período. Mude o período ou o tipo.
        </p>
      ) : (
        <>
          <p className="figs mt-4 text-[14px] text-ink-muted">
            {numero(total)} {total === 1 ? 'lançamento' : 'lançamentos'}, soma de{' '}
            <span className={'font-bold ' + (soma < 0 ? 'text-signal-deep' : 'text-ink')}>{moeda(soma)}</span> em todas as páginas
          </p>
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white">
            {itens.map((i) => (
              <Linha key={i.id} item={i} aoAfiliado={aoAfiliado} />
            ))}
          </ul>
          <Paginacao pagina={pagina} porPagina={porPagina} total={total} onIr={aoPagina} />
        </>
      )}
    </div>
  )
}
