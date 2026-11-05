// Gestão do robô de conversão dos leads da VS grátis: funil, parar e enviar agora.
// "Enviar agora" só ADIANTA o próximo envio do canal para a próxima rodada do robô (até 10 min):
// quem envia é o robô, com os mesmos bloqueios (horário, teto, modelo aprovado, compra, descadastro).

const TOTAL_EMAILS = 8
const TOTAL_WHATSAPP = 4
export const CUSTO_PADRAO_CENTAVOS = 40

export function custoPorMensagem(valor) {
  const n = Number(valor)
  return valor != null && valor !== '' && Number.isSafeInteger(n) && n >= 0 ? n : CUSTO_PADRAO_CENTAVOS
}

const num = (v) => Number(v || 0)

export async function funilLeads(db, { inicioUtc, fimUtc }, custoCentavos = CUSTO_PADRAO_CENTAVOS) {
  const emails = Array.from({ length: TOTAL_EMAILS }, (_, i) => `COALESCE(SUM(etapa_email >= ${i + 1}), 0) AS e${i + 1}`).join(', ')
  const [geral, whatsapp, origem] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS cadastros,
        COALESCE(SUM(primeiro_download_em IS NOT NULL), 0) AS baixaram,
        COALESCE(SUM(comprou = 1), 0) AS compraram,
        COALESCE(SUM(encerrado_em IS NULL), 0) AS em_andamento,
        COALESCE(SUM(encerrado_motivo = 'concluido'), 0) AS concluido,
        COALESCE(SUM(encerrado_motivo = 'comprou'), 0) AS comprou,
        COALESCE(SUM(encerrado_motivo = 'descadastrou'), 0) AS descadastrou,
        COALESCE(SUM(encerrado_motivo = 'parado'), 0) AS parado, ${emails}
      FROM leads WHERE criado_em >= ? AND criado_em < ? LIMIT 1`).bind(inicioUtc, fimUtc).first(),
    db.prepare(`SELECT w.etapa AS etapa, COUNT(*) AS enviadas,
        COALESCE(SUM(w.wa_status IN ('delivered', 'read')), 0) AS entregues,
        COALESCE(SUM(w.wa_status = 'read'), 0) AS lidas,
        COALESCE(SUM(w.wa_status = 'failed'), 0) AS falhas
      FROM leads_whatsapp w JOIN leads l ON l.id = w.lead_id
      WHERE l.criado_em >= ? AND l.criado_em < ? GROUP BY w.etapa ORDER BY w.etapa`).bind(inicioUtc, fimUtc).all(),
    // Origem pela UTM do botão do WhatsApp (utm_source=whatsapp, utm_medium=lead): só vale para quem abriu o
    // checkout (carrinho) ou comprou; o clique em si não é rastreado.
    db.prepare(`SELECT
        (SELECT COUNT(DISTINCT l.id) FROM leads l JOIN carrinhos c ON c.email = l.email
          WHERE l.criado_em >= ? AND l.criado_em < ? AND c.utm_source = 'whatsapp' AND c.utm_medium = 'lead') AS carrinhos,
        (SELECT COUNT(DISTINCT l.id) FROM leads l JOIN clientes cl ON cl.email = l.email
          JOIN compras p ON p.cliente_id = cl.id AND p.status = 'pago' AND p.teste = 0
          WHERE l.criado_em >= ? AND l.criado_em < ? AND p.utm_source = 'whatsapp' AND p.utm_medium = 'lead') AS compras
      LIMIT 1`).bind(inicioUtc, fimUtc, inicioUtc, fimUtc).first(),
  ])
  const porEtapa = new Map((whatsapp?.results || []).map((l) => [num(l.etapa), l]))
  const cadastros = num(geral?.cadastros)
  const compraram = num(geral?.compraram)
  const enviadasTotal = [...porEtapa.values()].reduce((s, l) => s + num(l.enviadas) - num(l.falhas), 0)
  return {
    cadastros,
    baixaram: num(geral?.baixaram),
    // Sem rastreio de clique nas mensagens: o contrato fica com null (a tela mostra "sem dado").
    clicaram: null,
    abriram_checkout_pelo_whatsapp: num(origem?.carrinhos),
    compraram,
    compraram_pelo_whatsapp: num(origem?.compras),
    taxa_conversao: cadastros ? Math.round(compraram / cadastros * 10000) / 100 : 0,
    em_andamento: num(geral?.em_andamento),
    encerrados: {
      concluido: num(geral?.concluido), comprou: num(geral?.comprou),
      descadastrou: num(geral?.descadastrou), parado: num(geral?.parado),
    },
    whatsapp: Array.from({ length: TOTAL_WHATSAPP }, (_, i) => {
      const l = porEtapa.get(i + 1)
      return { etapa: i + 1, enviadas: num(l?.enviadas), entregues: num(l?.entregues), lidas: num(l?.lidas), falhas: num(l?.falhas) }
    }),
    emails: Array.from({ length: TOTAL_EMAILS }, (_, i) => ({ etapa: i + 1, receberam: num(geral?.[`e${i + 1}`]) })),
    mensagens_whatsapp: enviadasTotal,
    custo_mensagem_centavos: custoCentavos,
    custo_whatsapp_centavos: enviadasTotal * custoCentavos,
  }
}

// Para o processo inteiro (os dois canais). Devolve 'ok', 'nao_encontrado' ou 'ja_encerrado'.
export async function pararLead(db, id) {
  const r = await db.prepare(`UPDATE leads SET encerrado_em = datetime('now'), encerrado_motivo = 'parado',
      proximo_email_em = NULL, proximo_whatsapp_em = NULL
    WHERE id = ? AND encerrado_em IS NULL`).bind(id).run()
  if (r?.meta?.changes) return 'ok'
  const existe = await db.prepare('SELECT email FROM leads WHERE id = ? LIMIT 1').bind(id).first()
  return existe ? 'ja_encerrado' : 'nao_encontrado'
}

// Adianta o próximo envio do canal para a próxima rodada. 'ok', 'nao_encontrado' ou 'nada_a_enviar'
// (processo encerrado, canal parado ou concluído, sem consentimento, descadastrado ou comprou).
export async function enviarAgora(db, id, canal) {
  const aberto = 'id = ? AND encerrado_em IS NULL AND consentimento = 1 AND descadastrado = 0 AND comprou = 0'
  const r = canal === 'whatsapp'
    ? await db.prepare(`UPDATE leads SET proximo_whatsapp_em = datetime('now')
        WHERE ${aberto} AND whatsapp_encerrado_em IS NULL AND whatsapp_etapa < ${TOTAL_WHATSAPP}`).bind(id).run()
    : await db.prepare(`UPDATE leads SET proximo_email_em = datetime('now')
        WHERE ${aberto} AND etapa_email < ${TOTAL_EMAILS}`).bind(id).run()
  if (r?.meta?.changes) return 'ok'
  const existe = await db.prepare('SELECT email FROM leads WHERE id = ? LIMIT 1').bind(id).first()
  return existe ? 'nada_a_enviar' : 'nao_encontrado'
}
