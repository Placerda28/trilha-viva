// Chave Pix do afiliado: validação por tipo e máscara. Puro, sem `@/`.
import { limparCpf, validarCpf } from './cpf.js'
import { mascararEmail } from './painel.js'

export const TIPOS_PIX = ['cpf', 'email', 'telefone', 'aleatoria']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// { ok: true, chave } com a chave no formato que o Pix usa, ou { ok: false, erro }.
export function validarChavePix(tipo, bruto) {
  const texto = typeof bruto === 'string' ? bruto.trim() : ''
  if (tipo === 'cpf') {
    return validarCpf(texto) ? { ok: true, chave: limparCpf(texto) } : { ok: false, erro: 'Informe um CPF válido como chave.' }
  }
  if (tipo === 'email') {
    const e = texto.toLowerCase()
    return e.length <= 77 && EMAIL.test(e) ? { ok: true, chave: e } : { ok: false, erro: 'Informe um e-mail válido como chave.' }
  }
  if (tipo === 'telefone') {
    let d = texto.replace(/\D/g, '')
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
    return d.length === 10 || d.length === 11
      ? { ok: true, chave: `+55${d}` }
      : { ok: false, erro: 'Informe o telefone com DDD como chave.' }
  }
  if (tipo === 'aleatoria') {
    const u = texto.toLowerCase()
    return UUID.test(u) ? { ok: true, chave: u } : { ok: false, erro: 'A chave aleatória tem o formato 123e4567-e89b-12d3-a456-426614174000.' }
  }
  return { ok: false, erro: 'Escolha o tipo da chave.' }
}

export const mascararCpf = (cpf) => {
  const d = limparCpf(cpf)
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

export function mascararChave(tipo, chave) {
  const c = String(chave || '')
  if (tipo === 'cpf') return mascararCpf(c)
  if (tipo === 'email') return mascararEmail(c)
  if (tipo === 'telefone') return `(**) *****-${c.slice(-4)}`
  return `${c.slice(0, 4)}…${c.slice(-4)}`
}
