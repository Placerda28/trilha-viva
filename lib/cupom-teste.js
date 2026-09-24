import { getDB, umaLinha } from '@/lib/d1'

// Cupom de teste, de USO ÚNICO, para o Paulo provar a compra de ponta a ponta
// pagando R$ 1,00 em vez do preço cheio.
//
// Não é o sistema de cupons (esse está planejado para o menu de gestão). É uma
// trava só: o cupom existe enquanto a variável CUPOM_TESTE estiver cadastrada
// no Worker, no formato  CODIGO:AAAA-MM-DD  (o código e o último dia válido).
//
// Uso único sem mexer no banco: a única forma de uma compra de R$ 1,00 existir
// é por este cupom, então basta uma compra desse valor gravada em `compras`
// para ele deixar de valer. Depois do teste, apagar a variável do painel.
export const PRECO_TESTE = 1

export async function precoDoCupom(cupom) {
  const cfg = String(process.env.CUPOM_TESTE || '').trim()
  const corte = cfg.lastIndexOf(':')
  if (corte < 1 || !cupom) return null

  const codigo = cfg.slice(0, corte).trim().toUpperCase()
  const ate = cfg.slice(corte + 1).trim()
  // Código curto dá para chutar. Abaixo de 8 caracteres, o cupom nem liga.
  if (codigo.length < 8) return null
  if (String(cupom).trim().toUpperCase() !== codigo) return null

  const fim = new Date(`${ate}T23:59:59-03:00`)
  if (Number.isNaN(fim.getTime()) || Date.now() > fim.getTime()) return null

  const db = getDB()
  if (!db) return null
  const usado = await umaLinha(
    db,
    'SELECT COUNT(*) AS n FROM compras WHERE valor_centavos = ?',
    PRECO_TESTE * 100
  )
  if (Number(usado?.n || 0) > 0) return null

  return PRECO_TESTE
}
