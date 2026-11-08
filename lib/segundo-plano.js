import { getCloudflareContext } from '@opennextjs/cloudflare'

// Roda a tarefa depois de a resposta sair (ctx.waitUntil do Worker). Serve às
// rotas que respondem igual exista o e-mail ou não: sem isso, quem é cliente
// demorava mais (consulta ao banco + envio do e-mail) e o tempo da resposta
// entregava a lista de clientes (auditoria de 07/11/2026, B8).
// Fora do Worker (testes, next dev sem contexto), espera a tarefa terminar.
// Erro da tarefa vira log: a resposta já saiu e não pode mudar.
export async function emSegundoPlano(rotulo, tarefa) {
  const promessa = Promise.resolve()
    .then(tarefa)
    .catch((erro) => console.error(rotulo, erro?.message))
  let ctx = null
  try {
    ctx = getCloudflareContext().ctx
  } catch {
    /* sem contexto do Worker */
  }
  if (ctx?.waitUntil) ctx.waitUntil(promessa)
  else await promessa
}
