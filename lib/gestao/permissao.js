import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDB } from '@/lib/d1'
import { adminPeloToken } from '@/lib/gestao/sessao'

export async function adminAtual() {
  try {
    const token = (await cookies()).get('tv_sessao')?.value
    const admin = await adminPeloToken(getDB(), token, process.env.ADMIN_MASTER)
    if (!admin) return null

    return admin
  } catch {
    // Banco indisponível ou sessão ilegível nunca abre a gestão por acidente.
    return null
  }
}

export async function papel(comDetalhes = false) {
  const admin = await adminAtual()
  return comDetalhes ? admin : admin?.papel || null
}

// Delegamos ao 404 do próprio Next para não manter uma cópia frágil do HTML.
// Na validação com next start, devem ser comparados status, Content-Type e corpo
// com uma rota que não existe; se o Next mudar, a comparação precisa ser refeita.
export function naoEncontrado() {
  notFound()
}

export function soAdmin(handler) {
  return async function rotaProtegida(req) {
    const admin = await papel(true)
    if (!admin || admin.precisa_trocar_senha) return naoEncontrado()
    return handler(req, admin)
  }
}

export function soMaster(handler) {
  return async function rotaProtegida(req) {
    const admin = await papel(true)
    if (admin?.papel !== 'master') return naoEncontrado()
    return handler(req, admin)
  }
}

// Ação de dinheiro, conta de cliente ou dado sensível: o membro da equipe
// recebe 403 com aviso (a tela mostra o motivo); quem não é admin segue com o
// 404 do soAdmin. Auditoria de 07/11/2026, itens A1, M7, M8 e B14.
export const MSG_SO_MASTER = 'Só o Administrador Master pode fazer esta ação.'
export function soMasterComAviso(handler) {
  return soAdmin((req, admin) =>
    admin.papel === 'master'
      ? handler(req, admin)
      : Response.json({ ok: false, erro: MSG_SO_MASTER }, { status: 403, headers: cabecalhosPrivados })
  )
}

// A troca obrigatória de senha é a única rota que aceita o membro antes
// de ele concluir essa etapa. O próprio handler ainda recusa o master.
export function soAdminInclusive(handler) {
  return async function rotaProtegida(req) {
    const admin = await papel(true)
    if (!admin) return naoEncontrado()
    return handler(req, admin)
  }
}

export const cabecalhosPrivados = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex',
}
