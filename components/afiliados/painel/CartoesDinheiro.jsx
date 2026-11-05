import { reais } from '@/lib/afiliados-campos'
import { diaMes, nomeDoMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import SaqueBotao from './SaqueBotao'

function Cartao({ titulo, ajuda, valor, nota, className = '', children }) {
  return (
    <div className={`card-line px-5 py-5 ${className}`}>
      <h3 className="text-[15px] font-bold text-ink">
        {titulo.split(' ').slice(0, -1).join(' ')}{' '}
        <span className="whitespace-nowrap">
          {titulo.split(' ').slice(-1)[0]} {ajuda}
        </span>
      </h3>
      <p className="figs mt-2.5 text-[32px] font-extrabold leading-none tracking-[-0.025em] text-ink">{valor}</p>
      {nota && <p className="mt-2.5 text-[14px] leading-[1.5] text-ink-muted">{nota}</p>}
      {children}
    </div>
  )
}

// Os cartões de dinheiro, na regra do saque mensal: o afiliado só vê "a receber"
// (o mês pela meta atingida), "disponível" (meses já fechados) e "já recebido".
// O primeiro é o que a pessoa mais quer saber ("quanto posso sacar") e leva o
// botão; o corte vermelho no topo o destaca. O cartão do mês anterior só existe
// entre o dia 1 e o fechamento.
// `somenteLeitura`: a Gestão usa este bloco na ficha do afiliado e não mostra o botão de saque.
export default function CartoesDinheiro({ d, irPara, onPedido, somenteLeitura = false }) {
  const { aReceber, aReceberMesAnterior: anterior, disponivel, emSaque, jaRecebido, saque } = d
  const dia = Number(String(aReceber.liberaEm || '').slice(8, 10)) || 8
  const mesAtual = nomeDoMes(aReceber.mes).toLowerCase()
  const outros = anterior ? 3 : 2
  const colunas = anterior ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
  // Com número ímpar de cartões fora o primeiro, o último ocupa a linha toda no tablet.
  const ultimo = outros % 2 === 1 ? 'sm:col-span-2 lg:col-span-1' : ''
  return (
    <section aria-label="Seu dinheiro" className={`grid gap-3 sm:grid-cols-2 ${colunas}`}>
      <Cartao
        className="card-cut sm:col-span-2 lg:col-span-1"
        titulo="Disponível para sacar"
        valor={reais(disponivel)}
        nota={emSaque > 0 ? `${reais(emSaque)} já estão em saque, esperando o pagamento.` : null}
        ajuda={
          <Ajuda titulo="Disponível para sacar">
            <p>É o total dos meses que já fecharam e que você ainda não sacou.</p>
            <p>A partir do dia {dia} você pede o pagamento do mês anterior, uma vez por mês. O pedido leva o valor inteiro.</p>
          </Ajuda>
        }
      >
        {!somenteLeitura && <SaqueBotao saque={saque} irPara={irPara} onPedido={onPedido} />}
      </Cartao>

      {anterior && (
        <Cartao
          titulo={`A receber de ${nomeDoMes(anterior.mes).toLowerCase()}`}
          valor={reais(anterior.valor)}
          nota={`Libera em ${diaMes(anterior.liberaEm)}, quando o mês fecha.`}
          ajuda={
            <Ajuda titulo={`A receber de ${nomeDoMes(anterior.mes).toLowerCase()}`}>
              <p>É o valor que o mês passado rendeu pela meta que você atingiu. Ele ainda não fechou.</p>
              <p>Se alguma compra do mês for devolvida antes do fechamento, o valor cai. No dia {Number(String(anterior.liberaEm).slice(8, 10))} o mês fecha e o total fica disponível de uma vez.</p>
            </Ajuda>
          }
        />
      )}

      <Cartao
        titulo={`A receber em ${mesAtual}`}
        valor={reais(aReceber.valor)}
        nota={`Libera em ${diaMes(aReceber.liberaEm)}, quando o mês fecha.`}
        ajuda={
          <Ajuda titulo={`A receber em ${mesAtual}`}>
            <p>É o que este mês rende pela meta que você atingiu até agora: o número de vendas vezes o valor do seu nível.</p>
            <p>Se você chegar a um nível mais alto, todas as vendas do mês passam a valer mais, e este valor sobe. Compra devolvida antes do fechamento sai da conta.</p>
          </Ajuda>
        }
      />

      <Cartao
        className={ultimo}
        titulo="Já recebido"
        valor={reais(jaRecebido)}
        ajuda={
          <Ajuda titulo="Já recebido">
            <p>Soma de tudo o que já foi pago a você por Pix desde que entrou no programa.</p>
          </Ajuda>
        }
        nota="Total já pago por Pix."
      />
    </section>
  )
}
