import { notFound } from 'next/navigation'
import Proto from './Proto'
import Proto8A from './Proto8A'
import { ESTADOS_8A } from './fixtures8a'

// PROTÓTIPO TEMPORÁRIO (Fase 7 de afiliados, frontend): em produção responde
// 404. Apagar esta pasta quando a tela for aprovada.
export const metadata = { title: 'Protótipo gestão afiliados', robots: { index: false, follow: false } }
export const dynamicParams = false

const ESTADOS = ['normal', 'vazio', 'sem-armazenamento', 'email-falha']

export function generateStaticParams() {
  return [...ESTADOS, ...ESTADOS_8A].map((estado) => ({ estado }))
}

export default async function Prototipo({ params }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { estado } = await params
  if (ESTADOS_8A.includes(estado)) return <Proto8A estado={estado} />
  return <Proto variante={estado} />
}
