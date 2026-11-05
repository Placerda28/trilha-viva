import CartoesDinheiro from '@/components/afiliados/painel/CartoesDinheiro'
import GanhosMes from '@/components/afiliados/painel/GanhosMes'
import NivelCard from '@/components/afiliados/painel/NivelCard'
import { nomeDoMes } from '@/lib/afiliados-painel'

// O mini painel: são os mesmos componentes que o afiliado vê em /minha-conta/afiliado,
// com os dados de `ficha.painel` (contrato do saque mensal). Aqui só olham: o bloco
// de dinheiro não tem o botão de sacar, e as janelinhas de ajuda (ⓘ) continuam
// funcionando. Base e bônus ficam na ficha contábil logo abaixo (Meses, Vendas, Extrato).

export default function FichaPainel({ painel: d, nome }) {
  return (
    <section aria-labelledby="ficha-painel" className="space-y-4">
      <div>
        <h2 id="ficha-painel" className="text-[17px] font-bold text-ink">
          O que {nome.split(' ')[0]} vê no painel dele
        </h2>
        <p className="mt-0.5 text-[14px] text-ink-muted">Números de {nomeDoMes(d.mes).toLowerCase()}, iguais aos da tela do afiliado. Base e bônus aparecem só nas abas abaixo.</p>
      </div>
      <NivelCard d={d} />
      <GanhosMes d={d} />
      <CartoesDinheiro d={d} somenteLeitura />
      <p className="text-[14px] text-ink-muted">
        {d.saque.pode ? 'Ele pode pedir saque agora.' : `Saque bloqueado: ${d.saque.motivo}`}
      </p>
    </section>
  )
}
