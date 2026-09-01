import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { site } from '@/lib/site'

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Trilha Viva — Multitracks Gospel | 4.000 VS com clique e guia',
    template: '%s | Trilha Viva — Multitracks Gospel',
  },
  description: site.description,
  keywords: [
    'multitrack gospel',
    'multitracks gospel',
    'vs gospel',
    'playback gospel',
    'multitrack com clique e guia',
    'vs multitrack',
    'playback para igreja',
    'trilha para louvor',
    'multitrack para banda de igreja',
    'baixar multitrack gospel',
    'pacote de multitracks',
    'multitrack reaper',
    'multitrack ableton live',
    'clique e guia',
    'stems gospel',
  ],
  applicationName: 'Trilha Viva',
  authors: [{ name: 'Trilha Viva' }],
  creator: 'Trilha Viva',
  publisher: 'Trilha Viva',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: site.url,
    siteName: 'Trilha Viva — Multitracks Gospel',
    title: 'Trilha Viva — Multitracks Gospel | 4.000 VS com clique e guia',
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trilha Viva — Multitracks Gospel',
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
  category: 'music',
}

export const viewport = {
  themeColor: '#FBFAF8',
  width: 'device-width',
  initialScale: 1,
}

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${site.url}/#organization`,
  name: 'Trilha Viva — Multitracks Gospel',
  alternateName: ['Trilha Viva', 'Trilha Viva Multitracks'],
  url: site.url,
  logo: `${site.url}/icon.svg`,
  description: site.description,
  areaServed: 'BR',
  knowsLanguage: 'pt-BR',
}

const siteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.url}/#website`,
  url: site.url,
  name: 'Trilha Viva — Multitracks Gospel',
  inLanguage: 'pt-BR',
  publisher: { '@id': `${site.url}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/musicas?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-paper antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([orgLd, siteLd]) }}
        />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
