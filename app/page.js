import HomeTopo from '@/components/home/HomeTopo'
import OQueE from '@/components/home/OQueE'
import MaisTocadas from '@/components/home/MaisTocadas'
import PrecoHome from '@/components/home/PrecoHome'
import Passos from '@/components/home/Passos'
import Programas from '@/components/home/Programas'
import Duvidas, { duvidasDaHome } from '@/components/home/Duvidas'
import ChamadaFinal from '@/components/home/ChamadaFinal'
import Secao from '@/components/venda/Secao'
import { H2, TEXTO } from '@/components/venda/estilos'
import ConvitePalco from '@/components/ConvitePalco'
import BarraCompra from '@/components/BarraCompra'
import FaixaSazonal from '@/components/FaixaSazonal'
import colecoes from '@/data/colecoes.json'
import { productLd } from '@/lib/produto-ld'
import { ldJson } from '@/lib/safe'
import { PALCO_DATA_LANCAMENTO, palcoEstado } from '@/lib/palco'

export const metadata = {
  title: 'Multitracks Gospel: 2.000 VS por R$ 89,90 vitalício | Trilha Viva',
  description:
    'Pacote com 2.000 multitracks gospel (VS) com clique, guia e canais separados. Pagamento único de R$ 89,90, sem mensalidade.',
  alternates: { canonical: '/' },
}

// FAQPage: as mesmas perguntas que a página mostra na sanfona (o Google confere
// se o que está nos dados é o que a pessoa vê).
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: duvidasDaHome.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// Home do redesenho (MUDANÇAS §3): 9 seções. Página estática: o servidor não
// sabe quem olha, então os pedaços que mudam para quem já tem o pacote (topo,
// bloco de preço, chamada final, barra do celular) são componentes de cliente
// que leem useUsuario().
export default function Home() {
  const palco = palcoEstado()
  return (
    <div data-rodape-colado="" className="bg-white text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([productLd, faqLd]) }} />

      <HomeTopo />
      <OQueE />

      {/* Faixa do Natal (01/11 a 25/12): some sozinha em 26/12. */}
      <FaixaSazonal href="/colecoes/natal" faixa={colecoes.natal.faixaHome} />

      <MaisTocadas />

      <Secao id="pacote" aria-labelledby="h-pacote" interno="flex flex-col gap-8">
        <div className="flex max-w-[720px] flex-col gap-3">
          <h2 id="h-pacote" className={H2}>
            Um pagamento. O acervo inteiro.
          </h2>
          <p className={TEXTO}>
            Sem plano mensal, sem crédito por música, sem escolher faixa a faixa. Você paga uma vez e leva os 2.000
            multitracks.
          </p>
        </div>
        <PrecoHome palco={palco} lancamento={PALCO_DATA_LANCAMENTO} />
      </Secao>

      <Passos />
      <Programas palco={palco} lancamento={PALCO_DATA_LANCAMENTO} />
      <ConvitePalco variante="home" palco={palco} lancamento={PALCO_DATA_LANCAMENTO} />
      <Duvidas />
      <ChamadaFinal />

      <BarraCompra inicio="topo" fim="pacote" />
    </div>
  )
}
