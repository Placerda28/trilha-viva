// Código do afiliado: só registra a venda. Não é cupom e não dá desconto.
export function normalizarCodigoAfiliado(valor) {
  return String(valor ?? '').trim().toUpperCase()
}

export function validarFormatoCodigo(valor) {
  return /^[A-Z0-9]{4,15}$/.test(normalizarCodigoAfiliado(valor))
}
