import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui'
import { posts } from '@/lib/posts'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Blog — multitrack, clique e guia para ministérios de louvor',
  description:
    'Guias práticos sobre multitrack gospel: o que é VS, como tocar com clique e guia, configuração no REAPER e como escolher entre playback e multitrack.',
  alternates: { canonical: '/blog' },
}

const fmt = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

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
      datePublished: p.date,
      description: p.description,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Blog' }]} />

        <header className="mt-8 max-w-2xl border-b border-line pb-12">
          <h1 className="font-bold text-[36px] leading-[1.1] text-ink sm:text-[48px]">
            Blog do ministério de louvor
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-ink-muted">
            Conteúdo direto ao ponto sobre multitrack, clique, guia e como tirar o melhor da sua
            equipe no domingo.
          </p>
        </header>

        <div className="divide-y divide-line">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group block py-9">
              <div className="flex items-center gap-4 text-[14px] font-semibold">
                <span className="text-ink">{p.tag}</span>
                <span className="text-ink-muted">{p.read} de leitura</span>
                <span className="text-ink-muted">{fmt(p.date)}</span>
              </div>
              <h2 className="mt-4 max-w-3xl font-bold text-[24px] leading-[1.22] text-ink group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4 sm:text-[30px]">
                {p.title}
              </h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-[1.7] text-ink-muted">
                {p.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
