import { MOTIVOS } from '../../lib/whatsapp-sequencia.js'
import { emailAoSuporte, explicarErro, hojeBrasilia, linhas, mudou, paragrafos } from './whatsapp-suporte.js'

// O resumo diário do WhatsApp para o suporte e as contas do dia. Saiu do
// whatsapp-estado.js, que reexporta as duas funções.

// --------------------------------------------------- resumo do dia ----

// Uma vez por dia, depois das 20h de Brasília (quando os envios acabam).
export async function resumoDoDia(db, env, agora, fetchImpl, logger) {
  const local = new Date(new Date(agora).getTime() - 3 * 3600000)
  if (local.getUTCHours() < 20) return false
  const dia = hojeBrasilia(agora)
  const vez = await db.prepare(`
    UPDATE whatsapp_estado SET resumo_enviado_em = ?
     WHERE id = 1 AND estado = 'ativo' AND COALESCE(resumo_enviado_em, '') <> ?`).bind(dia, dia).run()
  if (!mudou(vez)) return false

  const n = (v) => Number(v || 0)
  const [d, m, a] = [dia.slice(8, 10), dia.slice(5, 7), dia.slice(0, 4)]
  const numeros = await numerosDoDia(db, dia)
  const total = (campo) => numeros.porMensagem.reduce((s, r) => s + n(r[campo]), 0)
  const totalRecusas = numeros.recusas.reduce((s, r) => s + n(r.total), 0)
  const porMensagem = numeros.porMensagem
    .map((r) => `- ${r.etapa}ª: ${n(r.enviadas)} enviadas, ${n(r.entregues)} entregues, ${n(r.lidas)} lidas`)
    .join('\n')
  const cliques = Object.entries(numeros.cliques)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([conteudo, quantos]) => `${conteudo}: ${quantos}`)
    .join(' · ')
  const totalCliques = Object.values(numeros.cliques).reduce((s, v) => s + v, 0)
  const encerradas = numeros.encerradas
    .map((r) => `- ${MOTIVOS[r.motivo] || r.motivo}: ${n(r.total)}`)
    .join('\n')
  const detalheRecusas = numeros.recusas.map((r) => `- ${n(r.total)} × ${explicarErro(r.codigo)}`).join('\n')
  const texto = [
    `WhatsApp em ${d}/${m}/${a}:`,
    `Enviadas: ${total('enviadas')}\nEntregues: ${total('entregues')}\nLidas: ${total('lidas')}\nRecusadas: ${totalRecusas}\nVoltaram ao checkout pelo botão: ${totalCliques}${cliques ? ` (${cliques})` : ''}\nCompraram hoje depois de um WhatsApp: ${n(numeros.compraram)}`,
    porMensagem ? `Por mensagem da sequência:\n${porMensagem}` : '',
    encerradas ? `Sequências que pararam hoje:\n${encerradas}` : '',
    totalRecusas ? `Recusas:\n${detalheRecusas}` : '',
    'Para pausar: gestão → Recuperação → WhatsApp → Pausar.',
  ].filter(Boolean).join('\n\n')
  try {
    await emailAoSuporte(env, { assunto: `WhatsApp: resumo de ${d}/${m}`, texto, html: paragrafos(texto) }, fetchImpl)
  } catch (erro) {
    logger.error('Resumo diário do WhatsApp não enviado:', erro?.message || erro)
  }
  return true
}

// Os números de um dia de Brasília (das 03:00 UTC às 03:00 UTC do dia
// seguinte), separados do e-mail para o teste conferir as contas.
export async function numerosDoDia(db, dia) {
  const inicio = `${dia} 03:00:00`
  const [porMensagem, recusas, origens, compraram, encerradas] = await Promise.all([
    db.prepare(`
      SELECT etapa, COUNT(*) AS enviadas,
             SUM(CASE WHEN wa_status IN ('delivered', 'read') THEN 1 ELSE 0 END) AS entregues,
             SUM(CASE WHEN wa_status = 'read' THEN 1 ELSE 0 END) AS lidas
        FROM lembretes_enviados
       WHERE canal = 'whatsapp' AND enviado_em >= ? AND enviado_em < datetime(?, '+1 day')
       GROUP BY etapa ORDER BY etapa`).bind(inicio, inicio).all(),
    // Recusas: mensagens da sequência que falharam e 1ªs que a Meta não aceitou.
    db.prepare(`
      SELECT codigo, SUM(total) AS total FROM (
        SELECT COALESCE(wa_erro, 'sem código') AS codigo, COUNT(*) AS total
          FROM lembretes_enviados
         WHERE canal = 'whatsapp' AND wa_status = 'failed'
           AND enviado_em >= ? AND enviado_em < datetime(?, '+1 day')
         GROUP BY 1
        UNION ALL
        SELECT COALESCE(whatsapp_erro, 'sem código'), COUNT(*)
          FROM carrinhos
         WHERE whatsapp_status = 'failed' AND whatsapp_enviado_em IS NULL
           AND whatsapp_falhou_em >= ? AND whatsapp_falhou_em < datetime(?, '+1 day')
         GROUP BY 1
      ) GROUP BY codigo ORDER BY total DESC`).bind(inicio, inicio, inicio, inicio).all(),
    // Quem tocou em "Finalizar compra" e preencheu o checkout de novo.
    db.prepare(`
      SELECT origem FROM carrinhos
       WHERE origem LIKE 'utm=whatsapp/lembrete/%'
         AND criado_em >= ? AND criado_em < datetime(?, '+1 day')
       LIMIT 500`).bind(inicio, inicio).all(),
    db.prepare(`
      SELECT COUNT(DISTINCT pago.email) AS total
        FROM carrinhos pago
       WHERE pago.pago_em >= ? AND pago.pago_em < datetime(?, '+1 day')
         AND EXISTS (
           SELECT 1 FROM carrinhos s
             JOIN lembretes_enviados l ON l.carrinho_id = s.id AND l.canal = 'whatsapp'
            WHERE (s.email = pago.email OR s.telefone = pago.telefone) AND l.enviado_em < pago.pago_em
            LIMIT 1
         )
       LIMIT 1`).bind(inicio, inicio).first(),
    db.prepare(`
      SELECT whatsapp_motivo AS motivo, COUNT(*) AS total
        FROM carrinhos
       WHERE whatsapp_encerrado_em >= ? AND whatsapp_encerrado_em < datetime(?, '+1 day')
       GROUP BY 1 ORDER BY 2 DESC`).bind(inicio, inicio).all(),
  ])
  // origem = "utm=whatsapp/lembrete/carrinho/semanaN;cupom=..."
  const cliques = {}
  for (const { origem } of linhas(origens)) {
    const partes = String(origem || '').split(';')[0].slice(4).split('/')
    const conteudo = partes[3] || 'sem marcação'
    cliques[conteudo] = (cliques[conteudo] || 0) + 1
  }
  return {
    porMensagem: linhas(porMensagem),
    recusas: linhas(recusas),
    cliques,
    compraram: Number(compraram?.total || 0),
    encerradas: linhas(encerradas),
  }
}
