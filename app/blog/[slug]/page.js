import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui'
import { posts, getPost } from '@/lib/posts'
import { site, priceBRL } from '@/lib/site'

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
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'pt-BR',
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'Trilha Viva' },
    publisher: {
      '@type': 'Organization',
      name: 'Trilha Viva',
      logo: { '@type': 'ImageObject', url: `${site.url}/icon.svg` },
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <article className="shell max-w-3xl pt-12">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Início' },
            { href: '/blog', label: 'Blog' },
            { label: post.tag },
          ]}
        />

        <header className="mt-8 border-b border-line pb-10">
          <div className="flex items-center gap-4 text-[11.5px] font-semibold uppercase tracking-[0.12em]">
            <span className="text-accent">{post.tag}</span>
            <span className="text-ink-faint">{post.read} de leitura</span>
          </div>
          <h1 className="mt-6 font-display text-[34px] font-normal leading-[1.12] text-ink sm:text-[46px]">
            {post.title}
          </h1>
          <p className="mt-5 text-[17.5px] leading-[1.65] text-ink-muted">{post.description}</p>
          <p className="mt-6 text-[13.5px] text-ink-faint">Publicado em {fmt(post.date)}</p>
        </header>

        <div className="prose-tv pb-6">
          {post.body.map((block, i) => {
            if (block.h2) return <h2 key={i}>{block.h2}</h2>
            if (block.ul)
              return (
                <ul key={i}>
                  {block.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )
            return <p key={i}>{block.p}</p>
          })}
        </div>

        <aside className="mt-16 bg-ink p-9 text-paper sm:p-12">
          <h2 className="font-display text-[26px] leading-[1.18] sm:text-[32px]">
            Mais de 4.000 multitracks gospel, em um pacote só
          </h2>
          <p className="mt-4 max-w-lg text-[15.5px] leading-[1.7] text-paper/60">
            Clique, guia e canais separados, em todos os tons. Pagamento único, acesso vitalício.
          </p>
          <Link href="/assinar" className="btn-accent mt-8">
            Liberar acesso vitalício por {priceBRL(site.price)}
          </Link>
        </aside>

        <section className="mt-16 border-t border-line pt-10">
          <p className="label">Continue lendo</p>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex items-baseline justify-between gap-6 py-4"
              >
                <span className="font-display text-[18px] text-ink group-hover:text-accent">
                  {p.title}
                </span>
                <span className="shrink-0 text-[13px] text-ink-faint">{p.read}</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </>
  )
}
