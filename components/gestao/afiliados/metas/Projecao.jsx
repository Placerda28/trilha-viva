import { moeda, numero } from '../../formato'
import { mesPorExtenso } from '../afiliadosUtil'

// Quanto o programa deve custar no mês em andamento se o ritmo de hoje continuar.
// A conta é do servidor; a tela só mostra os números e o texto da conta que ele manda.

function Parte({ rotulo, children }) {
  return (
    <div>
      <dt className="text-[13.5px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-0.5 text-[17px] font-bold text-ink">{children}</dd>
    </div>
  )
}

export default function Projecao({ p }) {
  return (
    <section aria-labelledby="projecao" className="card-cut px-4 py-5 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id="projecao" className="text-[17px] font-bold text-ink">
          Projeção de {mesPorExtenso(p.mes)}
        </h2>
        <p className="figs mt-3 text-[40px] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-[46px]">{moeda(p.custo_projetado_centavos)}</p>
        <p className="mt-2 text-[14.5px] text-ink-muted">
          custo previsto do programa no mês, com base no ritmo até o dia {p.dia} de {p.dias_no_mes}
        </p>
      </div>
      <div className="mt-5 lg:mt-0">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Parte rotulo="Vendas até hoje">{numero(p.vendas_ate_agora)}</Parte>
          <Parte rotulo="Custo até hoje">{moeda(p.custo_ate_agora_centavos)}</Parte>
          <Parte rotulo="Vendas projetadas">{numero(p.vendas_projetadas)}</Parte>
          <Parte rotulo="Afiliados com venda">{numero(p.afiliados_com_venda)}</Parte>
          <Parte rotulo="Comissão base projetada">{moeda(p.base_projetada_centavos)}</Parte>
          <Parte rotulo="Bônus projetado">{moeda(p.bonus_projetado_centavos)}</Parte>
        </dl>
        {p.explicacao && <p className="mt-5 max-w-[46rem] border-t border-line pt-4 text-[14.5px] leading-[1.6] text-ink-muted">{p.explicacao}</p>}
      </div>
    </section>
  )
}
