'use client'

import { useState } from 'react'
import { Botao } from '@/components/ds'
import CadastroAfiliado from '@/components/afiliados/CadastroAfiliado'
import { reais } from '@/lib/afiliados-campos'
import TituloConta from '../TituloConta'

// Afiliado, para quem está logado e ainda não é afiliado (MUDANÇAS §7). "Quero
// ser afiliado" abre o formulário de cadastro que já existia (CadastroAfiliado,
// mesma rota POST /api/afiliados/cadastro), aqui mesmo na página. O formulário
// traz o próprio título (h1) e a escada de níveis, então ele ocupa o lugar do
// convite em vez de ficar embaixo dele.
export default function AfiliadoNovo({ nome = '', niveis = [], aberto = true }) {
  const [formulario, setFormulario] = useState(false)
  const maior = niveis.length ? Math.max(...niveis.map((n) => n.valor_por_venda_centavos)) : 0

  if (aberto && formulario) {
    return (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => setFormulario(false)}
          className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold underline underline-offset-[3px]"
        >
          Voltar
        </button>
        <CadastroAfiliado nomeInicial={nome} niveis={niveis} aberto />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo="Afiliado" subtitulo="Seu link, suas vendas do mês e seus pagamentos." />
      <div className="flex max-w-[640px] flex-col gap-3 border border-ink p-6">
        <strong className="font-semi-condensed text-[24px] font-bold leading-[1.1]">
          {maior ? `Indique a Trilha Viva e ganhe até ${reais(maior)} por venda` : 'Indique a Trilha Viva e ganhe por cada venda'}
        </strong>
        <span className="text-[15px] leading-[1.55] text-text-2">
          Você divulga seu link. Quem compra paga o preço normal e a venda fica registrada no seu nome. O pagamento é por Pix.
        </span>
        {aberto ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <Botao onClick={() => setFormulario(true)} className="px-5">
              Quero ser afiliado
            </Botao>
            <a href="/afiliados#regras" className="inline-flex min-h-11 items-center text-[15px] font-semibold underline underline-offset-[3px]">
              Ver as regras
            </a>
          </div>
        ) : (
          <p role="status" className="text-[15px] font-semibold">
            Cadastros encerrados no momento. O programa não está aceitando novos afiliados agora.
          </p>
        )}
      </div>
    </div>
  )
}
