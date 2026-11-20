import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import { ListaSanfona } from '@/components/ds'
import { faq } from '@/lib/faq'
import { PALCO_LANCADO } from '@/lib/palco'
import { OG_IMAGEM, site, EMAIL_SUPORTE } from '@/lib/site'

const title = 'Dúvidas frequentes sobre multitracks gospel'
const description =
  'O que é multitrack (VS), como recebo o acesso, quais programas usar, funciona no tablet, dá para mudar o tom e como funciona a garantia de 7 dias.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/faq' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/faq` },
}

// Perguntas do Palco (MUDANÇAS §14): o grupo só entra depois do lançamento
// (PALCO_LANCADO, lib/palco.js), e o FAQPage do Google acompanha o que está na tela.
const PERGUNTAS_DO_PALCO = [
  {
    q: 'Preciso ter o pacote para usar o Palco?',
    a: 'Não. Sem o pacote você testa 3 dias grátis e importa as suas próprias VS. Com o pacote, o teste é de 7 dias e as 2.000 VS já aparecem dentro do Palco.',
  },
  {
    q: 'O pacote e o Palco são a mesma compra?',
    a: 'Não. O pacote é um pagamento único pelas 2.000 VS. O Palco é uma assinatura de R$ 19,90 por mês pelo programa.',
  },
  {
    q: 'Funciona sem internet?',
    a: 'Funciona. A internet só serve para vincular o Palco à nuvem: a VS que você põe no setlist baixa e fica no computador. No culto, ele toca sem internet.',
  },
]

const grupos = [
  { id: 'pacote', titulo: 'Pacote e pagamento', itens: faq.filter((f) => f.grupo === 'pacote') },
  { id: 'arquivos', titulo: 'Arquivos e uso', itens: faq.filter((f) => f.grupo === 'arquivos') },
  ...(PALCO_LANCADO ? [{ id: 'palco', titulo: 'Palco', itens: PERGUNTAS_DO_PALCO }] : []),
]

const ld = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: grupos
    .flatMap((g) => g.itens)
    .map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
}

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'Dúvidas' }]}
          titulo="Perguntas frequentes"
          intro="Sobre o pacote, os arquivos e o uso no culto."
          grande
        />
        {grupos.map((g) => (
          <section key={g.id} className="flex flex-wrap gap-x-16 gap-y-4 border-t border-ink pt-5">
            <h2 id={g.id} className="font-semi-condensed flex-[1_1_220px] scroll-mt-24 text-[24px] font-[750] leading-[1.1]">
              {g.titulo}
            </h2>
            {/* O id de cada pergunta (programas, tablet, garantia) é âncora: /faq#garantia abre a sanfona. */}
            <ListaSanfona
              className="flex-[3_1_480px]"
              itens={g.itens.map((f) => ({ id: f.id, titulo: f.q, conteudo: f.a }))}
            />
          </section>
        ))}
        <p className="text-[16px] text-text-2">
          Não achou a resposta? Escreva para{' '}
          <a href={`mailto:${EMAIL_SUPORTE}`} className="font-semibold text-ink underline underline-offset-[3px]">
            {EMAIL_SUPORTE}
          </a>
          .
        </p>
      </Pagina>
    </>
  )
}
