import { reais } from '@/lib/afiliados-campos'
import { diaMes, nomeDoMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'

// Quanto o mês rende, separado em Garantido e Bônus. Só mostra números que o
// servidor mandou; "R$ 15 por venda" é o valor do menor nível, sem conta.
export default function GanhosMes({ d, config }) {
  const { ganhos, niveis, vendasValidas, mes, proximo } = d
  const base = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)[0]
  const mesNome = nomeDoMes(mes).toLowerCase()
  return (
    <section className="card-line px-5 py-6 sm:px-8 sm:py-7 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10" aria-labelledby="ganhos-titulo">
      <div>
        <h2 id="ganhos-titulo" className="text-[17px] font-bold text-ink">
          Ganhos de {mesNome}{' '}
          <Ajuda titulo="Ganhos do mês">
            <p>É o que você vai receber pelas vendas deste mês, somando o valor garantido de cada venda e o bônus de nível.</p>
            <p>Se você fizer mais vendas até o fim do mês, o número cresce.</p>
          </Ajuda>
        </h2>
        <p className="figs mt-3 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-[52px]">
          {reais(ganhos.totalPrevisto)}
        </p>
        <p className="mt-2 text-[14.5px] text-ink-muted">previsto até o fechamento do mês</p>
      </div>

      <dl className="mt-6 divide-y divide-line border-t border-line lg:mt-0 lg:border-t-0 lg:self-center">
        <div className="py-4 lg:pt-0">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[16px] font-bold text-ink">
              Garantido{' '}
              <Ajuda titulo="Valor garantido">
                <p>
                  É o que cada venda rende, seja qual for o seu nível. Ele libera {config.carenciaDias} dias depois da venda, para dar tempo de um possível
                  reembolso.
                </p>
              </Ajuda>
            </dt>
            <dd className="figs text-[22px] font-extrabold text-ink">{reais(ganhos.garantido)}</dd>
          </div>
          <p className="mt-1 text-[14.5px] leading-[1.5] text-ink-muted">
            {vendasValidas === 1 ? '1 venda' : `${vendasValidas} vendas`}
            {base ? ` de ${reais(base.valor_por_venda_centavos)} cada` : ''}. Cada uma libera {config.carenciaDias} dias depois de acontecer.
          </p>
        </div>
        <div className="py-4 lg:pb-0">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[16px] font-bold text-ink">
              Bônus de nível{' '}
              <Ajuda titulo="Bônus de nível">
                <p>
                  Quando você chega a um nível mais alto, todas as vendas do mês passam a valer mais. A diferença é o bônus, e ela cai de uma vez, no dia{' '}
                  {String(config.diaFechamento).padStart(2, '0')} do mês seguinte.
                </p>
              </Ajuda>
            </dt>
            <dd className="figs text-[22px] font-extrabold text-ink">{reais(ganhos.bonusPrevisto)}</dd>
          </div>
          <p className="mt-1 text-[14.5px] leading-[1.5] text-ink-muted">
            {ganhos.bonusPrevisto > 0
              ? `Cai em ${diaMes(ganhos.bonusCaiEm)}.`
              : proximo
                ? `O bônus aparece quando você chega ao ${proximo.nome}.`
                : 'Sem bônus neste mês.'}
          </p>
        </div>
      </dl>
    </section>
  )
}
