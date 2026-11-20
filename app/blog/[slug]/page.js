import Link from 'next/link'
import { notFound } from 'next/navigation'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import SemPacote from '@/components/catalogo/SemPacote'
import { H2 } from '@/components/catalogo/Titulos'
import { BotaoCompra, ListaSanfona, MolduraAccent } from '@/components/ds'
import Texto, { textoPuro } from '@/components/Texto'
import { posts, getPost, dataIsoPost } from '@/lib/posts'
import { site, priceBRL } from '@/lib/site'
import { ldJson } from '@/lib/safe'

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      images: [`/blog/${post.slug}/opengraph-image`],
      title: post.title,
      description: post.description,
      url: `${site.url}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

const fmt = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

// Estilos do texto do artigo (MUDANÇAS §14): título de seção de 30 px, parágrafo
// de 18 px com entrelinha 1,7, listas simples. O texto em si não muda.
const H2_ARTIGO = 'font-semi-condensed mt-5 text-[30px] font-[750] leading-[1.1]'
const H3_ARTIGO = 'font-semi-condensed mt-3 text-[22px] font-bold leading-[1.15]'
const P_ARTIGO = 'text-[18px] leading-[1.7] text-[#262626] [&_a]:underline [&_a]:underline-offset-4'
const LISTA = 'm-0 flex flex-col gap-2 pl-[22px] text-[18px] leading-[1.6] text-[#262626] [&_a]:underline [&_a]:underline-offset-4'

export default async function PostPage({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()
  const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: dataIsoPost(post.date),
    dateModified: dataIsoPost(post.updated || post.date),
    inLanguage: 'pt-BR',
    image: [`${site.url}/blog/${post.slug}/opengraph-image`],
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'Trilha Viva', url: site.url },
    publisher: {
      '@type': 'Organization',
      name: 'Trilha Viva',
      logo: { '@type': 'ImageObject', url: `${site.url}/icon.svg` },
    },
  }

  const faqLd = post.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: textoPuro(f.a) },
        })),
      }
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqLd ? [ld, faqLd] : ld) }} />
      <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { href: '/blog', label: 'Blog' }, { label: post.title }]}
          sobre={post.tag}
          titulo={post.title}
          intro={post.description}
          grande
        />
        <p className="-mt-3 text-[14px] text-text-3">
          Publicado em {fmt(post.date)} · {post.read} de leitura
        </p>

        <article className="flex max-w-[720px] flex-col gap-5">
          {post.body.map((block, i) => {
            if (block.h2) return <h2 key={i} className={H2_ARTIGO}>{block.h2}</h2>
            if (block.h3) return <h3 key={i} className={H3_ARTIGO}>{block.h3}</h3>
            if (block.ul || block.ol) {
              const Lista = block.ol ? 'ol' : 'ul'
              return (
                <Lista key={i} className={`${LISTA} ${block.ol ? 'list-decimal' : 'list-disc'}`}>
                  {(block.ul || block.ol).map((li) => (
                    <li key={li}>
                      <Texto>{li}</Texto>
                    </li>
                  ))}
                </Lista>
              )
            }
            return (
              <p key={i} className={P_ARTIGO}>
                <Texto>{block.p}</Texto>
              </p>
            )
          })}
        </article>

        {post.faq?.length > 0 && (
          <section aria-labelledby="faq-post" className="flex max-w-[720px] flex-col gap-3.5">
            <H2 id="faq-post" pequeno>
              Perguntas frequentes
            </H2>
            <ListaSanfona itens={post.faq.map((f) => ({ titulo: f.q, conteudo: <Texto>{f.a}</Texto> }))} />
          </section>
        )}

        <SemPacote>
          <MolduraAccent as="aside" traco={48} className="flex max-w-[720px] flex-wrap items-center gap-x-6 gap-y-3.5 p-[22px]">
            <div className="flex flex-[1_1_260px] flex-col gap-1">
              <strong className="font-semi-condensed text-[20px] font-[750]">2.000 multitracks com clique e guia</strong>
              <span className="text-[15px] text-text-2">Pagamento único de {priceBRL(site.price)}, acesso vitalício.</span>
            </div>
            <BotaoCompra className="flex-[0_1_240px]" />
          </MolduraAccent>
        </SemPacote>

        <section aria-labelledby="leia-tambem" className="flex max-w-[720px] flex-col">
          <H2 id="leia-tambem" pequeno className="mb-1.5">
            Leia também
          </H2>
          {others.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="flex min-h-[52px] items-center border-t border-line py-2 text-[17px] font-semibold underline-offset-4 hover:underline"
            >
              {p.title}
            </Link>
          ))}
        </section>
      </Pagina>
    </>
  )
}
