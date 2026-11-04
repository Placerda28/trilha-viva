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
  const dia = String(config.diaFechamento)
  const FAQ = [
    { q: 'Quando eu recebo?', a: <p>Cada venda libera {config.carenciaDias} dias depois de acontecer. Depois disso o valor fica disponível e você pede o saque por Pix. O bônus de nível cai no dia {dia} do mês seguinte.</p> },
    { q: 'Quem compra pelo meu link ganha desconto?', a: <p>Não. Quem compra paga o preço normal. O seu código só registra que a venda veio de você.</p> },
    { q: 'O que acontece se a compra for devolvida?', a: <p>A venda deixa de contar para a sua meta e a comissão sai. Se o mês já tinha fechado, a devolução aparece no extrato como um ajuste.</p> },
    { q: 'Como o meu nível é decidido?', a: <p>Pelo número de vendas do mês. Chegou à meta, todas as vendas daquele mês passam a valer o valor do nível novo. No dia 1º a contagem recomeça.</p> },
    { q: 'Posso comprar com o meu próprio código?', a: <p>Não. Compras feitas pelo próprio afiliado não contam como venda.</p> },
    { q: 'Como peço o saque?', a: <p>Cadastre sua chave Pix na aba Dados Pix. Quando houver valor disponível, o botão Sacar aparece no Início. Só dá para ter um saque em análise por vez, e há um intervalo de {config.intervaloSaqueDias} dias entre um pedido e o próximo.</p> },
  ]
  const REGRAS = [
    'O pagamento é sempre por Pix, para uma chave em seu nome.',
    `O saque pode ser pedido a cada ${config.intervaloSaqueDias} dias.`,
    'É proibido comprar usando o seu próprio código.',
    'É proibido fazer anúncio pago usando a marca "Trilha Viva".',
    'É proibido divulgar por spam.',
  ]
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="card-line space-y-10 px-5 py-7 sm:px-8" aria-labelledby="dinheiro-titulo">
        <h2 id="dinheiro-titulo" className="text-d3 text-ink">Como o dinheiro chega até você</h2>
        <Linha
          id="linha-venda"
          titulo="Cada venda"
          passos={[
            ['Venda', 'Alguém compra pelo seu link.'],
            [`${config.carenciaDias} dias`, 'Prazo de segurança, caso a compra seja devolvida.'],
            ['Disponível', 'O valor já é seu para sacar.'],
            ['Saque', 'Você pede na aba Início.'],
            ['Pix na conta', 'A Trilha Viva paga na sua chave.'],
          ]}
        />
        <Linha
          id="linha-bonus"
          titulo="Bônus de nível"
          passos={[
            ['Fim do mês', 'O nível do mês é conferido.'],
            [`Dia ${dia}`, 'O mês é fechado e o bônus calculado.'],
            ['Bônus disponível', 'Entra no seu saldo para sacar.'],
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
