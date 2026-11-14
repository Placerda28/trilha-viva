import { notFound } from 'next/navigation'
import { songs } from '@/lib/catalog'
import AcervoPainel from '@/components/AcervoPainel'

export const metadata = { title: 'Prévia do acervo', robots: { index: false, follow: false } }

export default async function DevAcervo({ searchParams }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const params = (await searchParams) || {}
  const varias = songs.find((s) => s.variantes.length > 1)
  const musicas = [varias, ...songs.filter((s) => s.slug !== varias?.slug)].slice(0, 12)
  const baixados = params.vazio === '1' ? [] : musicas.map((s, i) => ({ slug: s.slug, vezes: i % 3 + 1, ultimo: new Date(Date.now() - i * 86400000).toISOString().slice(0, 19).replace('T', ' ') }))
  return <main className="shell max-w-4xl pb-24 pt-14"><h1 className="text-[32px] font-bold text-ink">Olá, Paulo</h1><p className="mt-2 text-[14px] text-ink-muted">previa@exemplo.com</p><AcervoPainel nome="Paulo" email="previa@exemplo.com" restam={params.esgotado === '1' ? 0 : 18} limite={30} volta="em 6 horas" baixadosIniciais={baixados} /></main>
}
