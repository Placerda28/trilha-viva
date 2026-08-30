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
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

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
      <div className="shell pt-10">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Blog' }]} />

        <header className="mt-7 max-w-2xl border-b border-line pb-10">
          <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[46px]">
            Blog do ministério de louvor
          </h1>
          <p className="mt-4 text-[17px] leading-[1.62] text-ink-muted">
            Conteúdo direto ao ponto sobre multitrack, clique, guia e como tirar o melhor da sua
            equipe no domingo.
          </p>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group card flex flex-col p-7 transition-shadow hover:shadow-lift">
              <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-600">{p.tag}</span>
                <span>{p.read} de leitura</span>
              </div>
              <h2 className="mt-5 text-[22px] font-bold leading-[1.2] tracking-[-0.03em] text-ink group-hover:text-brand-700">
                {p.title}
              </h2>
              <p className="mt-3 flex-1 text-[15px] leading-[1.65] text-ink-muted">{p.description}</p>
              <p className="mt-6 text-[13px] text-ink-faint">{fmt(p.date)}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
