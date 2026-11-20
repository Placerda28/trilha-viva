'use client'

import { Icone } from '@/components/ds'
import ComoFunciona from '@/components/afiliados/painel/ComoFunciona'
import DadosPix from '@/components/afiliados/painel/DadosPix'
import Ganhos from '@/components/afiliados/painel/Ganhos'
import Vendas from '@/components/afiliados/painel/Vendas'
import { SecaoTitulo } from '../TituloConta'

// O desenho novo mostra só o resumo. O painel antigo tinha mais quatro telas
// (vendas, ganhos, chave Pix, como funciona) e a pessoa precisa delas (sem a
// chave Pix não há pagamento). Elas continuam aqui, com o mesmo conteúdo e as
// mesmas rotas, fechadas até alguém abrir (só aí buscam os dados). Por dentro
// ainda têm o visual antigo: refazer fica para a fase de limpeza.
export const DETALHES = [
  { id: 'vendas', titulo: 'Minhas vendas' },
  { id: 'ganhos', titulo: 'Meus ganhos por nível' },
  { id: 'pix', titulo: 'Dados Pix' },
  { id: 'como', titulo: 'Como funciona' },
]

function Conteudo({ id, dados, config }) {
  if (id === 'vendas') return <Vendas mesAtual={dados.mes} />
  if (id === 'ganhos') return <Ganhos niveis={dados.niveis} />
  if (id === 'pix') return <DadosPix />
  return <ComoFunciona niveis={dados.niveis} config={config} />
}

export default function DetalhesAfiliado({ dados, config, abertos, onMudar }) {
  return (
    <section aria-labelledby="h-detalhes" className="flex flex-col gap-2">
      <SecaoTitulo id="h-detalhes">Mais detalhes</SecaoTitulo>
      <div className="border-t border-line">
        {DETALHES.map((d) => (
          <details
            key={d.id}
            id={`detalhe-${d.id}`}
            open={Boolean(abertos[d.id])}
            onToggle={(e) => onMudar(d.id, e.currentTarget.open)}
            className="group border-b border-line"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-[650] leading-snug marker:hidden hover:bg-surface [&::-webkit-details-marker]:hidden">
              <span>{d.titulo}</span>
              <Icone nome="seta-baixo" tamanho={20} traco={1.5} className="transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            {abertos[d.id] && (
              <div className="pb-6">
                <Conteudo id={d.id} dados={dados} config={config} />
              </div>
            )}
          </details>
        ))}
      </div>
    </section>
  )
}
