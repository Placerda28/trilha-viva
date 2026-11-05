import { dataBr, reaisSinal, rotuloMes, situacaoVenda } from '@/lib/afiliados-painel'
import { moeda } from '../../formato'
import { SITUACAO_SAQUE, TIPO_LANCAMENTO, situacaoLancamento } from '../afiliadosUtil'
import { urlComprovante } from '../apiSaques'
import { NivelSelo } from '../lista/Pecas'

// As quatro listas da ficha que só mostram números: meses, vendas, saques e
// extrato. Todas em linhas empilhadas (rótulo e valor), que valem no celular
// e no computador sem tabela larga.

function Linhas({ vazio, children }) {
  const lista = Array.isArray(children) ? children : [children]
  if (!lista.filter(Boolean).length) return <p className="py-8 text-center text-[14.5px] text-ink-muted">{vazio}</p>
  return <ul className="divide-y divide-line">{children}</ul>
}

function Linha({ titulo, sub, direita, destaque = false }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="break-words text-[15px] font-semibold text-ink">{titulo}</div>
        {sub && <div className="mt-0.5 break-words text-[13.5px] leading-[1.45] text-ink-muted">{sub}</div>}
      </div>
      <div className={'figs shrink-0 text-right text-[15.5px] font-bold ' + (destaque ? 'text-signal-deep' : 'text-ink')}>{direita}</div>
    </li>
  )
}

export function Meses({ itens, niveis }) {
  return (
    <Linhas vazio="Ainda não há vendas nem meses fechados.">
      {itens.map((m) => (
        <Linha
          key={m.mes}
          titulo={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {rotuloMes(m.mes)}
              <NivelSelo nivel={m.nivel} niveis={niveis} tamanho={20} />
            </span>
          }
          sub={`${m.vendasValidas} ${m.vendasValidas === 1 ? 'venda' : 'vendas'}. Garantido ${moeda(m.garantido)} e bônus ${moeda(m.bonus)}. ${m.situacao === 'fechado' ? `Fechado em ${dataBr(m.fechadoEm)}.` : 'Em andamento: o valor ainda pode mudar.'}`}
          direita={moeda(m.total)}
        />
      ))}
    </Linhas>
  )
}

export function Vendas({ itens }) {
  return (
    <Linhas vazio="Ainda não houve venda com o código desse afiliado.">
      {itens.map((v) => {
        const s = situacaoVenda(v)
        return (
          <Linha
            key={v.compraId}
            titulo={v.comprador}
            sub={`${dataBr(v.data)}. Comprador pagou ${moeda(v.valorPagoCentavos)}. ${s.texto}.`}
            direita={moeda(v.comissaoCentavos)}
            destaque={s.chave === 'cancelada'}
          />
        )
      })}
    </Linhas>
  )
}

export function Saques({ itens }) {
  return (
    <Linhas vazio="Esse afiliado ainda não pediu saque.">
      {itens.map((s) => (
        <Linha
          key={s.id}
          titulo={SITUACAO_SAQUE[s.status] || s.status}
          sub={
            <>
              Pedido em {dataBr(s.pedido_em)}
              {s.pago_em ? `. ${s.status === 'pago' ? 'Pago' : 'Recusado'} em ${dataBr(s.pago_em)}${s.pago_por ? ` por ${s.pago_por}` : ''}` : ''}.
              {s.pix ? ` Chave ${s.pix.chave}.` : ''}
              {s.nota && <span className="block">Motivo: {s.nota}</span>}
              {s.comprovante && (
                <a href={urlComprovante(s.id)} target="_blank" rel="noopener noreferrer" className="link-signal mt-0.5 min-h-11 !text-[14px]">
                  Ver comprovante<span className="sr-only"> do saque de {dataBr(s.pedido_em)} (abre em outra aba)</span>
                </a>
              )}
            </>
          }
          direita={moeda(s.valor_centavos)}
          destaque={s.status === 'recusado'}
        />
      ))}
    </Linhas>
  )
}

export function Extrato({ itens }) {
  const agora = new Date()
  return (
    <Linhas vazio="O extrato ainda está vazio.">
      {itens.map((l) => (
        <Linha
          key={l.id}
          titulo={TIPO_LANCAMENTO[l.tipo] || l.tipo}
          sub={`${rotuloMes(l.mes)}. ${situacaoLancamento(l, agora)}.${l.descricao ? ` ${l.descricao}.` : ''}`}
          direita={reaisSinal(l.valor_centavos)}
          destaque={l.valor_centavos < 0}
        />
      ))}
    </Linhas>
  )
}
