// Regras puras da tela Leads (robô de conversão): rótulos, próximo envio e as
// linhas do funil. Sem React, para testar com node --test.

export const MOTIVO_ENCERRADO = {
  concluido: 'Concluído',
  comprou: 'Comprou',
  descadastrou: 'Pediu para sair',
  parado: 'Parado pela Gestão',
}
export const MOTIVO_WHATSAPP = {
  falhou: 'número sem WhatsApp',
  respondeu: 'respondeu',
  descadastro: 'pediu para sair',
}
export const TEXTO_FILA = 'Sai na próxima rodada do robô (até 10 min)'

const DIA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// 'DD/MM HH:mm' de Brasília.
export function diaHora(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : DIA_HORA.format(d).replace(',', '')
}

// Próximo envio de um canal. Data já passada = pedido na fila do robô.
export function proximoEnvio(iso, agora = Date.now()) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return t <= agora ? { fila: true, texto: TEXTO_FILA } : { fila: false, texto: diaHora(iso) }
}

export function situacao(l) {
  const motivo = MOTIVO_ENCERRADO[l.encerrado_motivo] || ''
  if (l.convertido) {
    const extra = l.encerrado && l.encerrado_motivo !== 'comprou' ? 'Encerrado: ' + motivo : ''
    return { id: 'convertido', rotulo: 'Convertido', detalhe: extra }
  }
  if (l.encerrado) return { id: 'encerrado', rotulo: 'Encerrado', detalhe: motivo }
  return { id: 'andamento', rotulo: 'Em andamento', detalhe: '' }
}

// As duas linhas "E-mail 3/8" e "WhatsApp 2/4" com o que vem depois.
// `enviados`: Set de 'id:canal' pedidos nesta visita (já estão na fila).
export function canaisDoLead(l, enviados = new Set(), agora = Date.now()) {
  const um = (id, rotulo, etapa, total, iso, parado) => {
    let prox = proximoEnvio(iso, agora)
    if (enviados.has(l.id + ':' + id)) prox = { fila: true, texto: TEXTO_FILA }
    let nota = ''
    if (!prox) nota = etapa >= total ? 'Sequência completa' : parado || 'Sem próximo envio'
    return { id, rotulo, etapa, total, prox, nota, falha: id === 'whatsapp' && l.whatsapp_motivo === 'falhou' && !prox }
  }
  const motivoWa = l.whatsapp_parado_em || l.whatsapp_motivo ? 'Parado: ' + (MOTIVO_WHATSAPP[l.whatsapp_motivo] || 'sem motivo informado') : ''
  return [
    um('email', 'E-mail', l.etapa_email, l.total_emails || 8, l.proximo_email_em, ''),
    um('whatsapp', 'WhatsApp', l.etapa_whatsapp, l.total_whatsapp || 4, l.proximo_whatsapp_em, motivoWa),
  ]
}

// O que o menu de ações de um lead oferece. Encerrado só não pode parar nem enviar.
export function acoesDoLead(l, enviados = new Set(), agora = Date.now()) {
  if (l.encerrado) return []
  const fila = (canal, iso) => !iso || enviados.has(l.id + ':' + canal) || new Date(iso).getTime() <= agora
  const lista = []
  if (!fila('whatsapp', l.proximo_whatsapp_em)) lista.push({ id: 'whatsapp', rotulo: 'Enviar WhatsApp agora' })
  if (!fila('email', l.proximo_email_em)) lista.push({ id: 'email', rotulo: 'Enviar e-mail agora' })
  lista.push({ id: 'parar', rotulo: 'Parar processo' })
  return lista
}

// Linhas do funil, em grupos, e a tabela alternativa vem da mesma lista.
export function passosDoFunil(f) {
  const base = Number(f.cadastros) || 0
  const pct = (n) => (base ? Math.round((Number(n) / base) * 100) : 0)
  const passo = (id, rotulo, valor, extra = {}) => ({ id, rotulo, valor, pct: valor == null ? null : pct(valor), ...extra })
  return {
    entrada: [passo('cadastros', 'Cadastraram', f.cadastros), passo('baixaram', 'Baixaram a VS', f.baixaram)],
    whatsapp: f.whatsapp.map((w) =>
      passo('w' + w.etapa, 'WhatsApp ' + w.etapa, w.entregues, { lidas: w.lidas, falhas: w.falhas, enviadas: w.enviadas, pctLidas: pct(w.lidas) })),
    emails: f.emails.map((e) => passo('e' + e.etapa, 'E-mail ' + e.etapa, e.receberam)),
    resultado: [passo('clicaram', 'Clicaram no link', f.clicaram ?? null), passo('compraram', 'Compraram', f.compraram)],
  }
}
