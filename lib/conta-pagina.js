import { cache } from 'react'
import { redirect } from 'next/navigation'
import { clienteAtual } from '@/lib/sessao'

// Layout e página da conta pedem o cliente na mesma visita: o cache() do React
// faz a consulta da sessão uma vez só por requisição.
export const clienteDaConta = cache(clienteAtual)

// Páginas da conta exigem login, como o /acervo antigo.
export async function exigirCliente() {
  const cliente = await clienteDaConta()
  if (!cliente) redirect('/entrar?expirou=1')
  return cliente
}

export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || ''
