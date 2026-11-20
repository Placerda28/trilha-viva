'use client'

import { Botao } from '@/components/ds'
import CheckoutForm from '@/components/CheckoutForm'
import { useUsuario } from '@/components/usuario'

// Coluna do formulário de /assinar (MUDANÇAS §4). A página é estática: nasce com
// o formulário (visitante) e, se o navegador descobrir que a pessoa já tem o
// pacote, troca por "Você já tem o pacote 2.000 VS". Logada sem o pacote vê o
// formulário com o aviso da conta.
export default function ColunaCompra() {
  const usuario = useUsuario()

  if (usuario === 'com-pacote') {
    return (
      <div className="flex flex-col gap-3.5 border border-ink p-5 sm:p-7">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h2 className="font-semi-condensed text-[26px] font-[750] leading-[1.1]">Você já tem o pacote 2.000 VS</h2>
        <p className="text-[16px] leading-[1.55] text-text-2">O acesso é vitalício. Não precisa comprar de novo.</p>
        <Botao href="/minha-conta/acervo" tamanho="lg" bloco>
          Abrir Minhas VS
        </Botao>
      </div>
    )
  }
  return <CheckoutForm logado={usuario === 'sem-pacote'} />
}
