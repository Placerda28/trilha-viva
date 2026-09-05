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
      <div className="shell py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <LogoInverse />
            <p className="mt-5 max-w-xs text-[15px] leading-[1.7] text-white/55">
              Multitracks gospel com clique, guia e cada instrumento em um canal separado. Um
              pagamento, sem mensalidade.
            </p>
            <Link href="/assinar" className="btn-signal mt-7 !py-3.5 !px-6 !text-[14.5px]">
              Ver o pacote completo
            </Link>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[15px] font-bold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[14.5px] text-white/55 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-7 text-[13px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name} — Multitracks Gospel
          </p>
          <p>Pagamento por Pix ou cartão, processado pela Stripe</p>
        </div>
      </div>
    </footer>
  )
}
