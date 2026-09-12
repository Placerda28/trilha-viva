import { getCloudflareContext } from '@opennextjs/cloudflare'

// O banco D1 chega como "binding" do Worker, não como variável de ambiente.
// Fora do Worker (build, desenvolvimento local sem wrangler) ele não existe, e
// por isso toda chamada aqui devolve null em vez de estourar: quem usa decide
// o que dizer ao visitante.
export function getEnv() {
  try {
    return getCloudflareContext().env || {}
  } catch {
    return {}
  }
}

export function getDB() {
  return getEnv().DB || null
}

// Uma linha ou null. Encurta o `.bind().first()` que se repetiria em toda rota.
export async function umaLinha(db, sql, ...valores) {
  if (!db) return null
  const r = await db.prepare(sql).bind(...valores).first()
  return r || null
}

export async function executar(db, sql, ...valores) {
  if (!db) return null
  return db.prepare(sql).bind(...valores).run()
}
