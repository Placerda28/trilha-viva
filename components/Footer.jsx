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
    <footer className="mt-24 bg-ink text-white">
      <div className="shell py-16">
        <div className="grid gap-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <LogoInverse />
            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-white/55">
              O acervo de multitracks gospel para igrejas que querem tocar com clique, guia e canais
              separados — sem mensalidade.
            </p>
            <Link href="/assinar" className="btn-flame mt-6 !py-3 !px-6 !text-[14.5px]">
              Ver o pacote completo
            </Link>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[14.5px] text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-[13px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Multitracks Gospel. Todos os direitos
            reservados.
          </p>
          <p>Pagamento seguro via Pix e cartão · Processado pela Stripe</p>
        </div>
      </div>
    </footer>
  )
}
