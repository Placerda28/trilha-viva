import { reais } from '@/lib/afiliados-campos'
import { Faq } from '@/components/ui'
import EscadaNiveis from '../EscadaNiveis'

// Sequência de verdade (um passo leva ao seguinte), então leva número e fio.
function Linha({ titulo, passos, id }) {
  return (
    <div>
      <h3 id={id} className="text-[17px] font-bold text-ink">{titulo}</h3>
      <ol aria-labelledby={id} className="mt-5 grid gap-0 lg:grid-flow-col lg:auto-cols-fr lg:gap-5">
        {passos.map(([nome, texto], i) => (
          <li key={nome} className="relative grid grid-cols-[2rem_1fr] gap-x-4 pb-6 last:pb-0 lg:grid-cols-1 lg:content-start lg:gap-y-3 lg:pb-0">
            {i < passos.length - 1 && (
              <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-8 w-[2px] bg-line lg:bottom-auto lg:left-8 lg:right-[-1.25rem] lg:top-[15px] lg:h-[2px] lg:w-auto" />
            )}
            <span className="figs relative z-10 grid h-8 w-8 place-items-center bg-ink text-[14px] font-extrabold text-white">{i + 1}</span>
            <div>
              <p className="text-[16px] font-bold leading-snug text-ink">{nome}</p>
              <p className="mt-1 text-[14.5px] leading-[1.55] text-ink-muted">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function degraus(niveis) {
  const l = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  return l.slice(1).map((n, i) => (
    `${n.vendas_minimas - 1} vendas no mês: todas valem ${reais(l[i].valor_por_venda_centavos)}. Com ${n.vendas_minimas}, todas passam a valer ${reais(n.valor_por_venda_centavos)}.`
  ))
}

export default function ComoFunciona({ niveis, config }) {
  const dia = String(Number(config.diaFechamento))
  const fimDoCiclo = Number(dia) > 1 ? `o dia ${String(Number(dia) - 1)} do mês seguinte` : 'o último dia do mês'
  const FAQ = [
    { q: 'Quando eu recebo?', a: <p>O mês fecha no dia {dia} do mês seguinte, já sem as compras devolvidas. Nesse dia o total do mês inteiro fica disponível de uma vez. A partir do dia {dia} você pede o pagamento do mês anterior, uma vez por mês, por Pix. As vendas de novembro, por exemplo, ficam disponíveis em {dia.padStart(2, '0')}/12.</p> },
    { q: 'Quanto eu ganho no mês?', a: <p>Depende da meta. O número de vendas do mês define o seu nível, e todas as vendas daquele mês valem o valor desse nível. O cartão A receber, no Início, mostra quanto o mês vale até agora.</p> },
    { q: 'Quem compra pelo meu link ganha desconto?', a: <p>Não. Quem compra paga o preço normal. O seu código só registra que a venda veio de você.</p> },
    { q: 'O que acontece se a compra for devolvida?', a: <p>A venda deixa de contar para a sua meta. Se a devolução vier antes do fechamento, o valor do mês é refeito sem ela, e o nível pode mudar. Se o mês já tinha fechado, o valor devolvido aparece como ajuste na aba Meus ganhos e sai do seu saldo.</p> },
    { q: 'Posso comprar com o meu próprio código?', a: <p>Não. Compras feitas pelo próprio afiliado não contam como venda.</p> },
    { q: 'Como peço o saque?', a: <p>Cadastre sua chave Pix na aba Dados Pix. A partir do dia {dia}, havendo valor disponível, o botão Sacar aparece no Início. O pedido leva o valor inteiro e vale uma vez por mês. Só dá para ter um saque em análise por vez.</p> },
    { q: `E se eu esquecer de pedir no dia ${Number(dia)}?`, a: <p>Sem problema. O pedido vale do dia {dia} até {fimDoCiclo}, então você ainda pode pedir depois, dentro desse período. O valor continua guardado e sai tudo junto.</p> },
  ]
  const REGRAS = [
    'O pagamento é sempre por Pix, para uma chave em seu nome.',
    `O pagamento do mês anterior pode ser pedido a partir do dia ${dia}, uma vez por mês.`,
    'É proibido comprar usando o seu próprio código.',
    'É proibido fazer anúncio pago usando a marca "Trilha Viva".',
    'É proibido divulgar por spam.',
  ]
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="card-line space-y-10 px-5 py-7 sm:px-8" aria-labelledby="dinheiro-titulo">
        <h2 id="dinheiro-titulo" className="text-d3 text-ink">Como o dinheiro chega até você</h2>
        <Linha
          id="linha-mes"
          titulo="A cada mês"
          passos={[
            ['Vendas no mês', 'Cada compra pelo seu link conta para a meta. O nível que você atingir vale para todas.'],
            [`Dia ${dia}`, 'O mês fecha, já sem as compras devolvidas.'],
            ['Total disponível', 'O valor do mês inteiro entra no seu saldo de uma vez.'],
            ['Saque uma vez por mês', 'A partir do dia '+dia+' você pede na aba Início e a Trilha Viva paga por Pix na sua chave.'],
          ]}
        />
      </section>

      <section className="card-line px-5 py-7 sm:px-8" aria-labelledby="escada-como">
        <h2 id="escada-como" className="text-d3 text-ink">Quanto você ganha por venda</h2>
        <EscadaNiveis niveis={niveis} comSelo className="mt-7 max-w-md" />
        <ul className="mt-6 space-y-2 border-t border-line pt-5 text-[15px] leading-[1.55] text-ink-muted">
          {degraus(niveis).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>

      <section className="card-line px-5 py-7 sm:px-8" aria-labelledby="regras-titulo">
        <h2 id="regras-titulo" className="text-d3 text-ink">Regras</h2>
        <ul className="mt-5 space-y-3">
          {REGRAS.map((r) => (
            <li key={r} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-[16px] leading-[1.55] text-ink">
              <span aria-hidden="true" className="mt-[9px] h-[8px] w-[8px] bg-signal" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-line px-5 py-7 sm:px-8" aria-labelledby="faq-titulo">
        <h2 id="faq-titulo" className="text-d3 text-ink">Perguntas frequentes</h2>
        <Faq items={FAQ} className="mt-4" />
      </section>
    </div>
  )
}
