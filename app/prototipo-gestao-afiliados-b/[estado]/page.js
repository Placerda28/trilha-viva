import { notFound } from 'next/navigation'
import Proto from './Proto'

// PROTÓTIPO TEMPORÁRIO (Fase 8B de afiliados, frontend): em produção responde
// 404. Apagar esta pasta quando as telas forem aprovadas.
export const metadata = { title: 'Protótipo gestão afiliados B', robots: { index: false, follow: false } }
export const dynamicParams = false

const ESTADOS = ['b-lista', 'b-ficha', 'b-ficha-membro', 'b-ficha-pendente', 'b-metas', 'b-metas-membro', 'b-config', 'b-config-membro']

export function generateStaticParams() {
  return ESTADOS.map((estado) => ({ estado }))
}

export default async function Prototipo({ params }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { estado } = await params
  return <Proto estado={estado} />
}
