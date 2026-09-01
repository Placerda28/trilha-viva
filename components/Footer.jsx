import Link from 'next/link'
import { LogoInverse } from './Logo'
import { site } from '@/lib/site'

const columns = [
  {
    title: 'Acervo',
    links: [
      { href: '/musicas', label: 'Todas as músicas' },
      { href: '/artistas', label: 'Artistas e ministérios' },
      { href: '/musicas?cat=Adora%C3%A7%C3%A3o', label: 'Multitracks de adoração' },
      { href: '/musicas?cat=Celebra%C3%A7%C3%A3o', label: 'Multitracks de celebração' },
      { href: '/musicas?cat=Congregacional', label: 'Congregacionais' },
    ],
  },
  {
    title: 'Aprender',
    links: [
      { href: '/como-usar', label: 'Como usar multitrack' },
      { href: '/como-usar#reaper', label: 'Multitrack no Reaper' },
      { href: '/como-usar#tablet', label: 'Multitrack no tablet' },
      { href: '/blog', label: 'Blog' },
      { href: '/faq', label: 'Dúvidas frequentes' },
    ],
  },
  {
    title: 'Trilha Viva',
    links: [
      { href: '/assinar', label: 'Pacote único' },
      { href: '/faq#garantia', label: 'Garantia de 7 dias' },
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-28 bg-ink text-paper">
      <div className="shell py-20">
        <div className="grid gap-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <LogoInverse />
            <p className="mt-6 max-w-xs text-[14.5px] leading-[1.7] text-paper/50">
              O acervo de multitracks gospel para igrejas que querem tocar com clique, guia e canais
              separados — sem mensalidade.
            </p>
            <Link href="/assinar" className="btn-accent mt-8 !py-3 !px-6 !text-[14.5px]">
              Ver o pacote completo
            </Link>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/35">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[14.5px] text-paper/65 transition-colors hover:text-paper"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 text-[13px] text-paper/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Multitracks Gospel.
          </p>
          <p>Pagamento seguro via Pix e cartão · processado pela Stripe</p>
        </div>
      </div>
    </footer>
  )
}
