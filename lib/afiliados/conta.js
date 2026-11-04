// Conta e código do afiliado. Sem `@/` (o robô também importa daqui).
import { normalizarCodigoAfiliado, validarFormatoCodigo } from './codigo.js'

// Afiliado do cliente logado, ou null. Uma consulta, pelo índice único de cliente_id.
export async function afiliadoDoCliente(db, clienteId) {
  if (!db || !clienteId) return null
  const r = await db
    .prepare('SELECT id, codigo, status, nome FROM afiliados WHERE cliente_id = ? LIMIT 1')
    .bind(clienteId)
    .first()
  return r ? { id: Number(r.id), codigo: r.codigo, status: r.status, nome: r.nome } : null
}

// Nomes que a marca usa e que um afiliado não pode tomar.
export const CODIGOS_RESERVADOS = [
  'TRILHA', 'TRILHAVIVA', 'ADMIN', 'ADMINISTRADOR', 'SUPORTE', 'CONTATO', 'GESTAO', 'MASTER',
  'PALCO', 'ACERVO', 'AFILIADO', 'AFILIADOS', 'OFICIAL', 'EQUIPE', 'SITE', 'TESTE',
]

// { codigo, disponivel, motivo? }. Recusa formato ruim, reservado, cupom e código em uso.
export async function consultarCodigo(db, bruto) {
  const codigo = normalizarCodigoAfiliado(bruto)
  if (!validarFormatoCodigo(codigo)) {
    return { codigo, disponivel: false, motivo: 'Use de 4 a 15 letras e números, sem espaços nem símbolos.' }
  }
  if (CODIGOS_RESERVADOS.includes(codigo)) {
    return { codigo, disponivel: false, motivo: 'Este código é reservado. Escolha outro.' }
  }
  const cupom = await db.prepare('SELECT 1 AS x FROM cupons WHERE codigo = ? LIMIT 1').bind(codigo).first()
  if (cupom) return { codigo, disponivel: false, motivo: 'Este código já está em uso. Escolha outro.' }
  const uso = await db.prepare('SELECT 1 AS x FROM afiliados WHERE codigo = ? LIMIT 1').bind(codigo).first()
  if (uso) return { codigo, disponivel: false, motivo: 'Este código já está em uso. Escolha outro.' }
  // Código que um afiliado já teve fica reservado (os links antigos não podem render venda para outro).
  const antigo = await db.prepare('SELECT 1 AS x FROM afiliados_codigos_antigos WHERE codigo = ? LIMIT 1').bind(codigo).first()
  if (antigo) return { codigo, disponivel: false, motivo: 'Este código já está em uso. Escolha outro.' }
  return { codigo, disponivel: true }
}
