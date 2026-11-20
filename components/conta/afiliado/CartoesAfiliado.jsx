'use client'

import { reais } from '@/lib/afiliados-campos'
import { diaMes, nomeDoMes, posicoesDaBarra, vendasTxt } from '@/lib/afiliados-painel'
import { valorEmReais } from '@/lib/conta-pedidos'
import PedirSaque from './PedirSaque'

// Os dois cartões do painel do afiliado (MUDANÇAS §7). Todo número vem pronto
// de dadosDoPainel() (lib/afiliados/painel.js): aqui só se escolhe texto.

const ROTULO = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3'
const VALOR = 'font-semi-condensed text-[40px] font-extrabold leading-none tabular-nums'

function textoDaMeta(d) {
  const { proximo, nivel, faltam } = d
  if (proximo) {
    return `Faltam ${faltam} ${faltam === 1 ? 'venda' : 'vendas'} para o ${proximo.nome}. Bateu a meta, todas as vendas do mês passam a valer ${reais(proximo.valor_por_venda_centavos)}.`
  }
  return nivel ? `Você está no nível mais alto: cada venda do mês vale ${reais(nivel.valor_por_venda_centavos)}.` : ''
}

// "Novembro até agora": o que o mês rende pela meta atingida até hoje.
export function CartaoMes({ d }) {
  const barra = posicoesDaBarra(d.niveis, d.vendasValidas)
  const marco = barra.marcos.find((m) => m.nome === d.nivel?.nome)
  return (
    <section aria-labelledby="h-mes" className="flex flex-col gap-2.5 border border-ink p-[22px]">
      <h2 id="h-mes" className={ROTULO}>
        {nomeDoMes(d.mes)} até agora
      </h2>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className={VALOR}>{valorEmReais(d.aReceber.valor)}</span>
        <span className="text-[15px] text-text-2">
          {vendasTxt(d.vendasValidas)}
          {d.nivel && ` · ${d.nivel.nome}`}
        </span>
      </p>
      {barra.marcos.length > 0 && (
        <div aria-hidden="true" className="relative h-1 bg-surface-pressed">
          <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${barra.atual}%` }} />
          {marco && <span className="absolute -top-[3px] h-2.5 w-0.5 bg-text-3" style={{ left: `${marco.pct}%` }} />}
        </div>
      )}
      <span className="text-[15px] leading-[1.5] text-text-2">{textoDaMeta(d)}</span>
    </section>
  )
}

// "Para receber": o saldo dos meses já fechados (ou o do mês passado, enquanto
// ele não fecha) e o pedido de pagamento por Pix.
export function CartaoReceber({ d, onPix, onPedido }) {
  const anterior = d.aReceberMesAnterior
  const passado = anterior && d.mesPassado?.mes === anterior.mes ? d.mesPassado : null
  let titulo = 'Para receber'
  let valor = 0
  let texto = 'Quando um mês fecha, o valor dele aparece aqui para você pedir por Pix.'
  if (d.disponivel > 0) {
    valor = d.disponivel
    texto = 'Meses já fechados, sem os reembolsos. O Pix vai para a chave que você cadastrou.'
  } else if (anterior) {
    titulo = `Para receber · ${nomeDoMes(anterior.mes).toLowerCase()}`
    valor = anterior.valor
    texto = `O mês fecha em ${diaMes(anterior.liberaEm)}. Depois disso o valor fica disponível para você pedir por Pix. Compra devolvida antes do fechamento sai da conta.`
  }
  return (
    <section aria-labelledby="h-receber" className="flex flex-col gap-2.5 border border-line-2 p-[22px]">
      <h2 id="h-receber" className={ROTULO}>
        {titulo}
      </h2>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className={VALOR}>{valorEmReais(valor)}</span>
        {passado && (
          <span className="text-[15px] text-text-2">
            {vendasTxt(passado.vendas)}
            {passado.nivel && ` · ${passado.nivel.nome}`}
          </span>
        )}
      </p>
      <span className="text-[15px] leading-[1.5] text-text-2">{texto}</span>
      {d.emSaque > 0 && (
        <span className="text-[15px] leading-[1.5] text-text-2">
          {valorEmReais(d.emSaque)} já estão em pedido, esperando o pagamento.
        </span>
      )}
      <PedirSaque saque={d.saque} onPix={onPix} onPedido={onPedido} />
    </section>
  )
}
