import { NextResponse } from 'next/server'
import { clienteAtual, temCompra } from '@/lib/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Quem está olhando o site: o cabeçalho (components/Header.jsx) pergunta isto
// UMA vez por carregamento, no navegador, porque as páginas são estáticas e não
// podem ler o cookie no servidor sem virar dinâmicas.
//
// Resposta: { usuario: 'visitante' | 'sem-pacote' | 'com-pacote', nome }.
// Só o primeiro nome sai daqui (para o menu da conta); e-mail, nunca.
//
// Custo: sem cookie, nenhuma consulta ao D1 (clienteAtual devolve null antes).
// Com cookie, 1 consulta da sessão e 1 de compra (temCompra), ambas por índice.
// Quem é da equipe com acervo liberado conta como "com pacote", igual ao /acervo.
const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET() {
  try {
    const cliente = await clienteAtual()
    if (!cliente || cliente.bloqueado) {
      return NextResponse.json({ usuario: 'visitante', nome: '' }, { headers })
    }
    const comprou = await temCompra(cliente.id)
    const nome = String(cliente.nome || '').trim().split(/\s+/)[0] || ''
    return NextResponse.json({ usuario: comprou ? 'com-pacote' : 'sem-pacote', nome }, { headers })
  } catch {
    // Banco fora do ar: o cabeçalho cai no visitante (mostra "Entrar" e o botão
    // de compra), que é o estado seguro para quem não sabemos quem é.
    return NextResponse.json({ usuario: 'visitante', nome: '' }, { headers })
  }
}
