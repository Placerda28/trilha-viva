import Link from 'next/link'
import { ListaSanfona } from '@/components/ds'
import Secao from '@/components/venda/Secao'
import { H2, LINK } from '@/components/venda/estilos'
import { faq } from '@/lib/faq'

// Seção 8 da home (MUDANÇAS §3): 5 perguntas em sanfona e o link para todas.
// As perguntas vêm de lib/faq.js (as mesmas do /faq) e são as mesmas do
// FAQPage dos dados estruturados da página: o que o Google lê é o que a pessoa vê.
const ORDEM = [0, 2, 3, 5, 6]
export const duvidasDaHome = ORDEM.map((i) => faq[i]).filter(Boolean)

export default function Duvidas() {
  const itens = duvidasDaHome.map((d) => ({ titulo: d.q, conteudo: d.a }))
  return (
    <Secao aria-labelledby="h-duvidas" interno="flex flex-wrap gap-x-20 gap-y-8">
      <div className="flex flex-[1_1_300px] flex-col gap-3">
        <h2 id="h-duvidas" className={H2}>
          Perguntas que sempre chegam
        </h2>
        <Link href="/faq" className={`${LINK} self-start`}>
          Ver todas as dúvidas
        </Link>
      </div>
      <div className="min-w-0 flex-[2_1_480px]">
        <ListaSanfona itens={itens} />
      </div>
    </Secao>
  )
}
