import { redirect } from 'next/navigation'

export default async function PeriodoPage({ searchParams }) {
  const parametros = await searchParams
  const consulta = new URLSearchParams()
  for (const chave of ['de', 'ate']) {
    if (typeof parametros?.[chave] === 'string') consulta.set(chave, parametros[chave])
  }
  redirect('/gestao/vendas' + (consulta.size ? '?' + consulta.toString() : ''))
}
