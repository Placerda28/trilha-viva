'use client'

import { Botao, BotaoCompra, Icone } from '@/components/ds'
import { useUsuario } from '@/components/usuario'
import { priceBRL, site } from '@/lib/site'

// A ação principal da ficha, conforme quem está olhando (MUDANÇAS §13).
//   visitante / sem pacote: "Liberar as 2.000 VS" e a linha de preço.
//   com o pacote: "Baixar esta VS" (leva à Minha conta, com a música na busca;
//     o download em si é lá, nunca aqui) e o aviso do limite diário.
// A página é estática e nasce como visitante; o estado chega depois (components/usuario.js).
// `gratis`: a música da VS grátis ganha "Baixar grátis" antes do botão de compra.
const BOTAO = 'flex-[0_1_300px]'

export default function AcaoFicha({ slug, gratis = false }) {
  const usuario = useUsuario()

  if (usuario === 'com-pacote') {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <Botao href={`/minha-conta/acervo?musica=${encodeURIComponent(slug)}`} tamanho="lg" className={BOTAO}>
          <Icone nome="baixar" />
          Baixar esta VS
        </Botao>
        <span className="figs text-[15px] text-text-2">Você já tem esta VS · até 30 downloads por dia</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
      {gratis && (
        <Botao href="/vs-gratis" tamanho="lg" className={BOTAO}>
          Baixar grátis
        </Botao>
      )}
      <BotaoCompra className={BOTAO} />
      <span className="figs text-[15px] text-text-2">Vem no pacote · {priceBRL(site.price)} · pagamento único</span>
    </div>
  )
}
