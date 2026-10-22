import { isoUtc } from './clientes.js'
import { formatarDataBrasilia } from './csv.js'
import {
  TOTAL_MENSAGENS,
  ajustarHorario,
  deSql,
  diasDeEmail,
  lerMensagens,
  resumoDaSequencia,
} from '../whatsapp-sequencia.js'

// Da linha do D1 para o que a aba Recuperação e a planilha mostram: totais,
// e-mails, a sequência de WhatsApp e a linha do CSV. As consultas ficam em
// recuperacao.js, que reexporta o que é público daqui.

export function totaisDaLinha(linha, whatsappAtivo) {
  const recuperados = Number(linha?.recuperados || 0)
  const pessoasComLembrete = Number(linha?.pessoas_com_lembrete || 0)
  return {
    pessoas: Number(linha?.pessoas || 0),
    andamento: Number(linha?.andamento || 0),
    recuperados,
    recuperados_email: Number(linha?.recuperados_email || 0),
    recuperados_whatsapp: Number(linha?.recuperados_whatsapp || 0),
    finalizados: Number(linha?.finalizados || 0),
    sem_envio: Number(linha?.sem_envio || 0),
    comprou_sem_lembrete: Number(linha?.comprou_sem_lembrete || 0),
    emails_enviados: Number(linha?.emails_enviados || 0),
    whatsapp_enviados: Number(linha?.whatsapp_enviados || 0),
    whatsapp_ativo: Boolean(whatsappAtivo),
    taxa: pessoasComLembrete ? recuperados / pessoasComLembrete : 0,
    valor_recuperado_centavos: Number(linha?.valor_recuperado_centavos || 0),
  }
}

const ENTREGA = { sent: 'enviado', delivered: 'entregue', read: 'lido', failed: 'falhou' }

function iso(data) {
  return data ? new Date(data).toISOString().slice(0, 19) + 'Z' : null
}

// Dias de e-mail da pessoa (enviados e o próximo previsto), para a data
// prevista do WhatsApp seguir a regra "nunca no mesmo dia de um e-mail".
function diasDeEmailDaLinha(linha) {
  const datas = [linha.email_1_em, linha.email_2_em, linha.email_3_em, linha.email_4_em]
  if (linha.situacao === 'andamento' && Number(linha.etapa_email || 0) < 4) datas.push(linha.proximo_email_em)
  return diasDeEmail(datas.filter(Boolean))
}

// A sequência de WhatsApp da pessoa (até 9 mensagens), com o status que a
// Meta devolve para cada uma. situacao/enviado_em descrevem a última
// mensagem (ou por que nenhuma saiu). "desligado" substitui previsto / não
// enviado enquanto o WhatsApp não estiver ligado (estado 'ativo').
function whatsappDaLinha(linha, whatsappAtivo, agora = new Date()) {
  const mensagens = lerMensagens(linha.whatsapp_mensagens)
  const ultima = mensagens.at(-1)
  let situacao
  if (ultima) situacao = ENTREGA[ultima.status] || 'enviado'
  else if (linha.whatsapp_enviado_em) situacao = 'enviado'
  else if (linha.telefone === null || linha.telefone === undefined || linha.telefone === '') situacao = 'sem_celular'
  else if (linha.pago_em) situacao = 'comprou'
  else if (Number(linha.whatsapp_descadastrado || 0)) situacao = 'nao_enviado'
  else if (Number(linha.teste || 0) || linha.whatsapp_motivo) situacao = 'nao_enviado'
  else if (linha.whatsapp_falhou_em) situacao = 'falhou'
  else if (Number(linha.whatsapp_no_prazo || 0)) situacao = 'previsto'
  else situacao = 'nao_enviado'

  const original = situacao
  if (!whatsappAtivo && (situacao === 'previsto' || situacao === 'nao_enviado')) situacao = 'desligado'

  let sequencia = { enviadas: 0, proximo_numero: null, proximo_em: null, motivo: linha.whatsapp_motivo || (Number(linha.teste || 0) ? 'teste' : null) }
  if (linha.whatsapp_enviado_em) {
    sequencia = resumoDaSequencia({
      etapa: linha.whatsapp_etapa,
      proximoEm: deSql(linha.proximo_whatsapp_em),
      motivo: linha.whatsapp_motivo,
      mensagens,
      comprou: Boolean(linha.pago_em),
      descadastrado: Boolean(Number(linha.whatsapp_descadastrado || 0)),
      diasComEmail: diasDeEmailDaLinha(linha),
    }, agora)
    if (!whatsappAtivo) sequencia = { ...sequencia, proximo_numero: null, proximo_em: null }
  } else if (original === 'previsto' && whatsappAtivo) {
    // A 1ª: 3 h depois do carrinho, no horário permitido.
    sequencia.proximo_numero = 1
    sequencia.proximo_em = ajustarHorario(new Date(Math.max(deSql(linha.whatsapp_previsto_em).getTime(), agora.getTime())))
  }

  return {
    situacao,
    enviado_em: ultima ? iso(ultima.enviado_em) : isoUtc(linha.whatsapp_enviado_em),
    previsto_em: original === 'previsto' ? isoUtc(linha.whatsapp_previsto_em) : null,
    total: TOTAL_MENSAGENS,
    mensagens: mensagens.map((m) => ({
      numero: m.numero,
      enviado_em: iso(m.enviado_em),
      situacao: ENTREGA[m.status] || 'enviado',
      situacao_em: iso(m.status_em),
      erro: m.erro,
    })),
    enviadas: sequencia.enviadas,
    proximo_numero: sequencia.proximo_numero,
    proximo_em: iso(sequencia.proximo_em),
    motivo: sequencia.motivo,
  }
}

function emailsDaLinha(linha) {
  const emails = []
  for (let etapa = 1; etapa <= 4; etapa += 1) {
    const enviadoEm = linha[`email_${etapa}_em`]
    if (enviadoEm) emails.push({ etapa, enviado_em: isoUtc(enviadoEm) })
  }
  return emails
}

export function recuperacaoDaLinha(linha, whatsappAtivo = false, agora = new Date()) {
  const emAndamento = linha.situacao === 'andamento'
  const etapa = Number(linha.etapa_email || 0)
  return {
    teste: Boolean(Number(linha.teste)),
    nome: linha.nome || '',
    email: linha.email,
    telefone: linha.telefone || null,
    criado_em: isoUtc(linha.criado_em),
    utm_source: linha.utm_source || null,
    utm_campaign: linha.utm_campaign || null,
    situacao: linha.situacao,
    finalizado_motivo: linha.finalizado_motivo || null,
    finalizado_em: isoUtc(linha.finalizado_em),
    emails: emailsDaLinha(linha),
    proximo_email_em: emAndamento ? isoUtc(linha.proximo_email_em) : null,
    proxima_etapa: emAndamento && etapa < 4 ? etapa + 1 : null,
    whatsapp: whatsappDaLinha(linha, whatsappAtivo, agora),
    pago_em: isoUtc(linha.pago_em),
    recuperado_pela_etapa:
      linha.situacao === 'recuperado' ? Number(linha.recuperado_pela_etapa || 0) || null : null,
    recuperado_pelo_canal:
      linha.situacao === 'recuperado' ? linha.recuperado_pelo_canal || null : null,
  }
}

const SITUACOES_CSV = {
  recuperado: 'Recuperado',
  comprou_sem_lembrete: 'Comprou sem lembrete',
  finalizado: 'Finalizado',
  andamento: 'Em andamento',
  aguardando: 'Aguardando',
  sem_envio: 'Sem envio',
}

export const CABECALHO_RECUPERACAO = [
  'Nome',
  'E-mail',
  'Celular',
  'Carrinho em',
  'Situação',
  'E-mail 1 em',
  'E-mail 2 em',
  'E-mail 3 em',
  'E-mail 4 em',
  'WhatsApp',
  'Pago em',
  'Recuperado pela etapa',
  'Recuperado pelo canal',
]

const WHATSAPP_CSV = {
  enviado: 'Enviado',
  entregue: 'Entregue',
  lido: 'Lido',
  falhou: 'Falhou',
  sem_celular: 'Sem celular',
  previsto: 'Previsto',
  nao_enviado: 'Não enviado',
  comprou: 'Comprou antes',
  desligado: 'Desligado',
}

export function linhaRecuperacaoCsv(linha) {
  const whatsapp = whatsappDaLinha(linha, Boolean(linha.whatsappAtivo))
  const descricaoWhatsapp = WHATSAPP_CSV[whatsapp.situacao] || whatsapp.situacao || ''
  const situacaoWhatsapp = whatsapp.enviado_em
    ? `${descricaoWhatsapp} (${formatarDataBrasilia(whatsapp.enviado_em)}) · ${whatsapp.enviadas} de ${whatsapp.total}`
    : descricaoWhatsapp
  return [
    linha.nome || '',
    linha.email || '',
    linha.telefone || '',
    formatarDataBrasilia(linha.criado_em),
    SITUACOES_CSV[linha.situacao] || linha.situacao || '',
    formatarDataBrasilia(linha.email_1_em),
    formatarDataBrasilia(linha.email_2_em),
    formatarDataBrasilia(linha.email_3_em),
    formatarDataBrasilia(linha.email_4_em),
    situacaoWhatsapp,
    formatarDataBrasilia(linha.pago_em),
    linha.recuperado_pela_etapa || '',
    linha.recuperado_pelo_canal || '',
  ]
}
