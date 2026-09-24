import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDB } from '@/lib/d1'
import { adminPeloToken } from '@/lib/gestao/sessao'

export async function adminAtual() {
  try {
    const token = (await cookies()).get('tv_sessao')?.value
    const admin = await adminPeloToken(getDB(), token, process.env.ADMIN_MASTER)
    if (!admin) return null

    // Fase 3: aqui entra a consulta à tabela equipe para reconhecer membros.
    // Ela ainda não existe, portanto a Fase 1 nunca tenta consultá-la.
    return admin
  } catch {
    // Banco indisponível ou sessão ilegível nunca abre a gestão por acidente.
    return null
  }
}

export async function papel() {
  return (await adminAtual())?.papel || null
}

// Delegamos ao 404 do próprio Next para não manter uma cópia frágil do HTML.
// Na validação com next start, devem ser comparados status, Content-Type e corpo
// com uma rota que não existe; se o Next mudar, a comparação precisa ser refeita.
export function naoEncontrado() {
  notFound()
}

export function soAdmin(handler) {
  return async function rotaProtegida(req) {
    if (!(await papel())) return naoEncontrado()
    return handler(req)
  }
}

export const cabecalhosPrivados = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex',
}
