// Lê o ?ref= do endereço e monta o cookie e o aviso de clique do afiliado.
// Puro (sem Next, sem banco): roda no navegador, em components/RefCaptura.jsx.
import { normalizarCodigoAfiliado, validarFormatoCodigo } from './afiliados/codigo.js'

export const COOKIE_REF = 'tv_ref'
export const DIAS_REF = 30

// Só o último ?ref= vale. Formato inválido não grava nada.
export function refDoEndereco(busca) {
  const p = busca instanceof URLSearchParams ? busca : new URLSearchParams(String(busca || ''))
  const bruto = p.getAll('ref').pop()
  if (!bruto) return null
  const codigo = normalizarCodigoAfiliado(bruto)
  if (!validarFormatoCodigo(codigo)) return null
  const utm = (nome) => String(p.get(nome) || '').slice(0, 100)
  return {
    codigo,
    utm_source: utm('utm_source'),
    utm_medium: utm('utm_medium'),
    utm_campaign: utm('utm_campaign'),
    utm_content: utm('utm_content'),
  }
}

// Texto do Set-Cookie (sem o Secure; quem monta decide pelo https).
export function cookieDoRef(codigo, seguro) {
  return `${COOKIE_REF}=${codigo}; Max-Age=${DIAS_REF * 86400}; Path=/; SameSite=Lax${seguro ? '; Secure' : ''}`
}
