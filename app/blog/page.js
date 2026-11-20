import Link from 'next/link'
import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import { Icone } from '@/components/ds'
import { posts, dataIsoPost } from '@/lib/posts'
import { OG_IMAGEM, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'

const title = 'Blog — multitrack, clique e guia para ministérios de louvor'
const description =
  'Guias práticos sobre multitrack gospel: o que é VS, como tocar com clique e guia, configuração no REAPER e como escolher entre playback e multitrack.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/blog' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/blog` },
}

export default function BlogPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog Trilha Viva',
    url: `${site.url}/blog`,
    inLanguage: 'pt-BR',
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${site.url}/blog/${p.slug}`,
      datePublished: dataIsoPost(p.date),
      description: p.description,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'Blog' }]}
          titulo="Blog do ministério de louvor"
          intro="Guias para quem roda multitrack na igreja."
          grande
        />
        <ul className="m-0 flex list-none flex-col border-b border-line p-0">
          {posts.map((p) => (
            <li key={p.slug} className="border-t border-line first:border-t-ink">
              <Link
                href={`/blog/${p.slug}`}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 py-[22px] hover:bg-surface"
              >
                <span className="rotulo flex-[0_0_120px] text-text-3">{p.tag}</span>
                <span className="font-semi-condensed flex-[1_1_420px] text-[clamp(20px,2.4cqi,26px)] font-bold leading-[1.2]">
                  {p.title}
                </span>
                <Icone nome="seta-direita" tamanho={20} traco={1.5} className="self-center" />
              </Link>
            </li>
          ))}
        </ul>
      </Pagina>
    </>
  )
}
