import { getCloudflareContext } from '@opennextjs/cloudflare'

// Roda a tarefa antes de responder e segura a resposta até um tempo mínimo.
// Serve às rotas que respondem igual exista o e-mail ou não: sem o tempo fixo,
// quem é cliente demorava mais (consulta ao banco + envio do e-mail) e o tempo
// da resposta entregava a lista de clientes (auditoria de 07/11/2026, B8).
// Antes a tarefa ia para o ctx.waitUntil, depois da resposta; em 08/11 o
// e-mail de "Esqueci a senha" deixou de chegar, então voltou a rodar antes.
// Erro da tarefa vira log: a resposta é a mesma de qualquer jeito.
// Fora do Worker (testes, next dev sem contexto) não espera o tempo mínimo.
export const TEMPO_MINIMO_MS = 2500

export async function emTempoFixo(rotulo, tarefa, minimoMs = TEMPO_MINIMO_MS) {
  const inicio = Date.now()
  try {
    await tarefa()
  } catch (erro) {
    console.error(rotulo, erro?.message)
  }
  let noWorker = false
  try {
    noWorker = Boolean(getCloudflareContext().ctx)
  } catch {
    /* sem contexto do Worker */
  }
  const falta = minimoMs - (Date.now() - inicio)
  if (noWorker && falta > 0) await new Promise((fim) => setTimeout(fim, falta))
}
