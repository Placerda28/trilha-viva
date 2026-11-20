import TopoPalco from '@/components/palco/TopoPalco'
import Planos from '@/components/palco/Planos'
import { Duvidas, ParaQuemE, Recursos, Requisitos } from '@/components/palco/SecoesPalco'
import { duvidas } from '@/components/palco/dados'
import { palcoEstado } from '@/lib/palco'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'

// Vitrine do Palco (MUDANÇAS §9). Página ESTÁTICA: o estado "em breve" ou
// "lançado" vem de lib/palco.js (lido no build) e quem está olhando só aparece
// em PacoteAcao, que é de cliente. Não lê cookie nem searchParams. O cabeçalho
// escuro é do layout (Header.jsx trata /palco*).
const title = 'Palco, o programa da Trilha Viva para tocar VS no culto'
const description =
  'Clique e guia no fone, a música dividida em partes, pad e setlist. O Palco funciona sem internet e mostra as 2.000 VS do pacote Trilha Viva.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/palco' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/palco` },
}

export default function PalcoPage() {
  const emBreve = palcoEstado() !== 'lancado'
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: duvidas(emBreve).map((d) => ({
      '@type': 'Question',
      name: d.titulo,
      acceptedAnswer: { '@type': 'Answer', text: d.conteudo },
    })),
  }
  return (
    <div data-rodape-colado className="bg-white [container-type:inline-size]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <TopoPalco emBreve={emBreve} />
      <Recursos />
      <ParaQuemE />
      <Planos emBreve={emBreve} />
      <Requisitos />
      <Duvidas emBreve={emBreve} />
    </div>
  )
}
