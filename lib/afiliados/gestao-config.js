// Configurações do programa de afiliados (tabela afiliados_config, 1 linha). Sem `@/`.
import { configuracao } from './niveis.js'
import { textoUtc } from './datas.js'

export const AVISO_CONFIG = 'Mudanças não alteram meses já fechados.'

// Limites de cada campo. Inteiros: [mínimo, máximo]. Boolean: true/false.
const INTEIROS = {
  carencia_dias: [0, 90],
  dia_fechamento: [1, 28],
  intervalo_saque_dias: [0, 90],
  saque_minimo_centavos: [0, 1_000_000],
}
const BOOLEANOS = ['aprovacao_automatica', 'programa_aberto']
const CAMPOS = [...Object.keys(INTEIROS), ...BOOLEANOS]
const ROTULO = {
  carencia_dias: 'A carência',
  dia_fechamento: 'O dia do fechamento',
  intervalo_saque_dias: 'O intervalo entre saques',
  saque_minimo_centavos: 'O saque mínimo',
}

export function lerConfig(c) {
  const saida = {}
  for (const k of Object.keys(INTEIROS)) saida[k] = Number(c[k])
  for (const k of BOOLEANOS) saida[k] = Boolean(c[k])
  saida.atualizado_em = c.atualizado_em ? `${String(c.atualizado_em).replace(' ', 'T').slice(0, 19)}Z` : null
  saida.atualizado_por = c.atualizado_por || null
  return saida
}

export async function dadosDaConfig(db) {
  const c = await configuracao(db)
  return c ? { ...lerConfig(c), aviso: AVISO_CONFIG } : null
}

// { ok: true, mudou: {campo: [de, para]}, config } ou { ok: false, erro, campo }. Campos ausentes não mudam.
export async function salvarConfig(db, corpo, quem, agora = new Date()) {
  const novo = {}
  for (const [k, [min, max]] of Object.entries(INTEIROS)) {
    if (!Object.hasOwn(corpo, k)) continue
    const v = corpo[k]
    if (!Number.isSafeInteger(v) || v < min || v > max) {
      return { ok: false, erro: `${ROTULO[k]} precisa ser um número inteiro de ${min} a ${max}.`, campo: k }
    }
    novo[k] = v
  }
  for (const k of BOOLEANOS) {
    if (!Object.hasOwn(corpo, k)) continue
    if (typeof corpo[k] !== 'boolean') return { ok: false, erro: 'Use verdadeiro ou falso.', campo: k }
    novo[k] = corpo[k] ? 1 : 0
  }
  if (Object.keys(novo).length === 0) return { ok: false, erro: `Informe ao menos um campo: ${CAMPOS.join(', ')}.`, campo: null }

  const antes = await configuracao(db)
  const mudou = {}
  for (const [k, v] of Object.entries(novo)) {
    if (Number(antes[k]) !== v) mudou[k] = [Number(antes[k]), v]
  }
  if (Object.keys(mudou).length > 0) {
    const campos = Object.keys(mudou)
    await db
      .prepare(`UPDATE afiliados_config SET ${campos.map((k) => `${k} = ?`).join(', ')}, atualizado_em = ?, atualizado_por = ? WHERE id = 1`)
      .bind(...campos.map((k) => mudou[k][1]), textoUtc(agora), quem)
      .run()
  }
  return { ok: true, mudou, config: await dadosDaConfig(db) }
}
