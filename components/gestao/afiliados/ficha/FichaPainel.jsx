import CartoesDinheiro from '@/components/afiliados/painel/CartoesDinheiro'
import GanhosMes from '@/components/afiliados/painel/GanhosMes'
import NivelCard from '@/components/afiliados/painel/NivelCard'
import { nomeDoMes } from '@/lib/afiliados-painel'

// O mini painel: são os mesmos componentes que o afiliado vê em /minha-conta/afiliado,
// com os dados de `ficha.painel`. Aqui só olham: o cartão de dinheiro não tem o
// botão de sacar, e as janelinhas de ajuda (ⓘ) continuam funcionando.
// `config` traz a carência e o dia do fechamento; sem ela os cartões que os citam ficam de fora.

export default function FichaPainel({ painel: d, config, nome }) {
  const cfg = config && { carenciaDias: config.carencia_dias, diaFechamento: config.dia_fechamento }
  return (
    <section aria-labelledby="ficha-painel" className="space-y-4">
      <div>
        <h2 id="ficha-painel" className="text-[17px] font-bold text-ink">
          O que {nome.split(' ')[0]} vê no painel dele
        </h2>
        <p className="mt-0.5 text-[14px] text-ink-muted">Números de {nomeDoMes(d.mes).toLowerCase()}, iguais aos da tela do afiliado.</p>
      </div>
      <NivelCard d={d} />
      {cfg ? (
        <>
          <GanhosMes d={d} config={cfg} />
          <CartoesDinheiro d={d} config={cfg} somenteLeitura />
          <p className="text-[14px] text-ink-muted">
            {d.saque.pode ? 'Ele pode pedir saque agora.' : `Saque bloqueado: ${d.saque.motivo}`}
          </p>
        </>
      ) : (
        <p role="status" className="border-l-2 border-signal pl-3 text-[14.5px] text-ink">
          Não consegui carregar os prazos do programa, então os cartões de ganhos e de dinheiro ficaram de fora. Recarregue a página para tentar de novo.
        </p>
      )}
    </section>
  )
}
