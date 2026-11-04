// Clique no link do afiliado (?ref=). Sem `@/`. Nunca guarda o IP puro.
import { normalizarCodigoAfiliado, validarFormatoCodigo } from './codigo.js'

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

// HMAC-SHA256(segredo, 'afiliado-clique:' + ip + ua).
export async function visitanteHash(segredo, ip, agente) {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const dados = new TextEncoder().encode(`afiliado-clique:${ip}|${agente}`)
  return hex(await crypto.subtle.sign('HMAC', chave, dados))
}

export function dispositivoDe(agente) {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(agente) ? 'celular' : 'computador'
}

// Só o caminho (sem ? nem #), até 200 caracteres, alfabeto curto.
export function limparCaminho(valor) {
  const c = String(valor ?? '').split(/[?#]/)[0].replace(/[^A-Za-z0-9/_.~%-]/g, '').slice(0, 200)
  return c.startsWith('/') ? c : ''
}

// 1 INSERT condicional: só se o afiliado existe, está ativo e o visitante
// ainda não clicou nele nas últimas 24 h. Devolve true se gravou.
export async function registrarClique(db, { codigo, caminho, utm, visitante, dispositivo }) {
  const c = normalizarCodigoAfiliado(codigo)
  if (!validarFormatoCodigo(c)) return false
  const r = await db
    .prepare(
      `INSERT INTO afiliados_cliques
         (afiliado_id, pagina, utm_source, utm_medium, utm_campaign, utm_content, visitante_hash, dispositivo)
       SELECT a.id, ?, ?, ?, ?, ?, ?, ? FROM afiliados a
        WHERE a.codigo = ? AND a.status = 'ativo'
          AND NOT EXISTS (SELECT 1 FROM afiliados_cliques x
                           WHERE x.afiliado_id = a.id AND x.visitante_hash = ?
                             AND x.criado_em > datetime('now', '-24 hours'))`,
    )
    .bind(
      limparCaminho(caminho) || null,
      utm.source || null,
      utm.medium || null,
      utm.campaign || null,
      utm.content || null,
      visitante,
      dispositivo,
      c,
      visitante,
    )
    .run()
  return Number(r?.meta?.changes || 0) > 0
}
