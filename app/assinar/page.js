import ColunaCompra from '@/components/checkout/ColunaCompra'
import Explicacao from '@/components/checkout/Explicacao'
import { EventoAoAbrir } from '@/components/MetaPixel'
import Secao from '@/components/venda/Secao'
import { OG_IMAGEM, site } from '@/lib/site'
import { productLd } from '@/lib/produto-ld'
import { ldJson } from '@/lib/safe'

export const metadata = {
  title: 'Liberar acesso ao pacote de 2.000 Multitracks Gospel',
  description:
    'Pagamento único de R$ 89,90 (de R$ 899,00) no Pix ou no cartão. Acesso vitalício a mais de 2.000 multitracks gospel com clique, guia e canais separados. Liberação imediata.',
  alternates: { canonical: '/assinar' },
  openGraph: { images: OG_IMAGEM,
    title: 'Pacote único — 2.000 Multitracks Gospel | Trilha Viva',
    description: 'R$ 89,90 no Pix ou no cartão. Acesso vitalício e liberação imediata.',
    url: `${site.url}/assinar`,
  },
}

// Checkout (MUDANÇAS §4). Um formulário só: no computador fica fixo na coluna da
// direita, no celular vem logo depois do título. Cabeçalho e rodapé entram em
// "modo compra" sozinhos nesta rota (components/Header.jsx e Footer.jsx).
// Página estática: o estado de quem olha (visitante, logada sem o pacote, com o
// pacote) é resolvido no navegador, dentro de ColunaCompra.
export default function AssinarPage() {
  return (
    <div data-rodape-colado="" className="bg-white text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(productLd) }} />
      <EventoAoAbrir
        evento="ViewContent"
        dados={{ content_name: 'Pacote Trilha Viva', content_type: 'product', value: site.price, currency: site.currency }}
      />

      <Secao
        interno="flex flex-col gap-[clamp(24px,3cqi,40px)] pb-[clamp(56px,7cqi,104px)] pt-[clamp(28px,5cqi,64px)]"
      >
        <header className="flex max-w-[720px] flex-col gap-2.5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">Pacote 2.000 VS</p>
          <h1 className="font-semi-condensed text-[clamp(36px,5cqi,60px)] font-[800] leading-none tracking-[-0.025em] [text-wrap:balance]">
            Um pagamento. O acervo inteiro.
          </h1>
          <p className="text-[18px] leading-[1.5] text-text-2">
            {site.totalTracks.toLocaleString('pt-BR')} multitracks gospel, liberados na hora, sem mensalidade.
          </p>
        </header>

        <div className="grid items-start gap-x-[72px] gap-y-10 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div id="comprar" className="min-w-0 scroll-mt-24 lg:col-start-2 lg:row-start-1 lg:[@media(min-height:1000px)]:sticky lg:[@media(min-height:1000px)]:top-24">
            <ColunaCompra />
          </div>
          <Explicacao className="min-w-0 lg:col-start-1 lg:row-start-1" />
        </div>
      </Secao>
    </div>
  )
}
