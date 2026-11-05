import { reais } from '@/lib/afiliados-campos'
import { diaMes } from '@/lib/afiliados-painel'
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

// Os quatro cartões de dinheiro. O primeiro é o que a pessoa mais quer saber
// ("quanto posso sacar") e leva o botão; o corte vermelho no topo o destaca.
// `somenteLeitura`: a Gestão usa este cartão na ficha do afiliado e não mostra o botão de saque.
export default function CartoesDinheiro({ d, config, irPara, onPedido, somenteLeitura = false }) {
  const { cartoes, saque } = d
  const prox = cartoes.proximaLiberacao
  return (
    <section aria-label="Seu dinheiro" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Cartao
        className="card-cut sm:col-span-2 lg:col-span-1"
        titulo="Disponível para sacar"
        valor={reais(cartoes.disponivel)}
        ajuda={
          <Ajuda titulo="Disponível para sacar">
            <p>É o que já passou do prazo de {config.carenciaDias} dias e está livre para você pedir por Pix.</p>
          </Ajuda>
        }
      >
        {!somenteLeitura && <SaqueBotao saque={saque} irPara={irPara} onPedido={onPedido} />}
      </Cartao>

      <Cartao
        titulo="Liberando"
        valor={reais(cartoes.liberando)}
        ajuda={
          <Ajuda titulo={`Liberando (${config.carenciaDias} dias)`}>
            <p>
              Cada venda espera {config.carenciaDias} dias antes de ficar disponível. É um prazo de segurança, para o caso de a compra ser devolvida.
            </p>
          </Ajuda>
        }
        nota={prox ? `Próxima: ${reais(prox.valor)}, libera em ${diaMes(prox.em)}.` : 'Nada esperando liberação.'}
      />

      <Cartao
        titulo="Bônus a receber"
        valor={reais(cartoes.bonusAReceber.total)}
        ajuda={
          <Ajuda titulo="Bônus a receber">
            <p>É o bônus de nível que ainda não caiu. Ele fica disponível no dia {String(config.diaFechamento).padStart(2, '0')}, quando o mês fecha.</p>
          </Ajuda>
        }
        nota={
          cartoes.bonusAReceber.partes.length > 0
            ? cartoes.bonusAReceber.partes.map((p) => `${reais(p.valor)} em ${diaMes(p.em)}`).join(' · ')
            : 'Sem bônus à espera.'
        }
      />

      <Cartao
        titulo="Já recebi"
        valor={reais(cartoes.jaRecebido)}
        ajuda={
          <Ajuda titulo="Já recebi">
            <p>Soma de tudo o que já foi pago a você por Pix desde que entrou no programa.</p>
          </Ajuda>
        }
        nota="Total já pago por Pix."
      />
    </section>
  )
}
