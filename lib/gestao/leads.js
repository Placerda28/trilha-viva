import { buscaValida, escaparLike, isoUtc, paginaValida } from './clientes.js'
import { formatarCelular, formatarDataBrasilia } from './csv.js'

const POR_PAGINA = 25
const CAMPOS = `id, nome, email, whatsapp, consentimento, consentimento_em,
  origem, meio, campanha, pagina_entrada, criado_em, ultimo_envio_em,
  envios, downloads, primeiro_download_em, comprou, comprou_em, descadastrado,
  etapa_email, whatsapp_etapa, whatsapp_enviado_em, whatsapp_encerrado_em, whatsapp_motivo,
  encerrado_em, encerrado_motivo,
  CASE WHEN encerrado_em IS NULL THEN proximo_email_em END AS proximo_email,
  CASE WHEN encerrado_em IS NULL AND whatsapp_encerrado_em IS NULL AND whatsapp_etapa < 4
        AND consentimento = 1 AND descadastrado = 0 AND comprou = 0
    THEN COALESCE(proximo_whatsapp_em, CASE WHEN whatsapp_etapa = 0 THEN datetime(consentimento_em, '+5 minutes') END)
  END AS proximo_whatsapp`

// Busca por nome, e-mail ou WhatsApp. O celular é comparado só pelos dígitos
// (sem o 55 de país) porque o cadastro guarda o número limpo. Menos de 2
// caracteres = sem busca.
export function filtroBuscaLeads(valor) {
  const q = buscaValida(valor).trim().toLowerCase()
  if (q.length < 2) return { sql: '', valores: [] }
  const texto = `%${escaparLike(q)}%`
  let digitos = q.replace(/\D/g, '')
  if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2)
  const celular = digitos ? ` OR whatsapp LIKE ? ESCAPE '\\'` : ''
  return {
    sql: ` AND (LOWER(nome) LIKE ? ESCAPE '\\' OR LOWER(email) LIKE ? ESCAPE '\\'${celular})`,
    valores: digitos ? [texto, texto, `%${digitos}%`] : [texto, texto],
  }
}

export async function consultarLeads(db, { inicioUtc, fimUtc, pagina, q }) {
  const numero = paginaValida(pagina)
  const busca = filtroBuscaLeads(q)
  const [resultado, resumo, achados] = await Promise.all([
    db.prepare(`SELECT ${CAMPOS} FROM leads
      WHERE criado_em >= ? AND criado_em < ?${busca.sql}
      ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(inicioUtc, fimUtc, ...busca.valores, POR_PAGINA, (numero - 1) * POR_PAGINA).all(),
    db.prepare(`SELECT COUNT(*) AS cadastros,
      COALESCE(SUM(primeiro_download_em IS NOT NULL), 0) AS baixaram,
      COALESCE(SUM(comprou = 1), 0) AS compraram
      FROM leads WHERE criado_em >= ? AND criado_em < ? LIMIT 1`)
      .bind(inicioUtc, fimUtc).first(),
    // Com busca, o total de itens é o dos achados; os cartões seguem o período todo.
    busca.sql
      ? db.prepare(`SELECT COUNT(*) AS n FROM leads
          WHERE criado_em >= ? AND criado_em < ?${busca.sql} LIMIT 1`)
        .bind(inicioUtc, fimUtc, ...busca.valores).first()
      : null,
  ])
  const cadastros = Number(resumo?.cadastros || 0)
  const compraram = Number(resumo?.compraram || 0)
  return {
    pagina: numero,
    por_pagina: POR_PAGINA,
    total_itens: achados ? Number(achados.n || 0) : cadastros,
    totais: {
      cadastros,
      baixaram: Number(resumo?.baixaram || 0),
      compraram,
      taxa_conversao: cadastros ? Math.round(compraram / cadastros * 10000) / 100 : 0,
    },
    itens: (resultado?.results || []).map(leadDaLinha),
  }
}

export function leadDaLinha(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    whatsapp: linha.whatsapp,
    consentimento: Boolean(Number(linha.consentimento)),
    consentimento_em: isoUtc(linha.consentimento_em),
    origem: linha.origem || null,
    meio: linha.meio || null,
    campanha: linha.campanha || null,
    pagina_entrada: linha.pagina_entrada || null,
    criado_em: isoUtc(linha.criado_em),
    ultimo_envio_em: isoUtc(linha.ultimo_envio_em),
    envios: Number(linha.envios || 0),
    downloads: Number(linha.downloads || 0),
    primeiro_download_em: isoUtc(linha.primeiro_download_em),
    comprou: Boolean(Number(linha.comprou)),
    comprou_em: isoUtc(linha.comprou_em),
    descadastrado: Boolean(Number(linha.descadastrado)),
    // Robô de conversão: e-mail 0 a 8 (1 a 4 na hora/+3/+5/+7, 5 a 8 mensais), WhatsApp 0 a 4.
    etapa_email: Number(linha.etapa_email || 0),
    total_emails: 8,
    etapa_whatsapp: Number(linha.whatsapp_etapa || 0),
    total_whatsapp: 4,
    proximo_email_em: isoUtc(linha.proximo_email),
    proximo_whatsapp_em: isoUtc(linha.proximo_whatsapp),
    whatsapp_enviado_em: isoUtc(linha.whatsapp_enviado_em),
    whatsapp_parado_em: isoUtc(linha.whatsapp_encerrado_em),
    whatsapp_motivo: linha.whatsapp_motivo || null,
    encerrado: Boolean(linha.encerrado_em),
    encerrado_em: isoUtc(linha.encerrado_em),
    encerrado_motivo: linha.encerrado_motivo || null,
    convertido: Boolean(Number(linha.comprou)),
  }
}

export async function consultarLeadsCsv(db, { inicioUtc, fimUtc }) {
  const resultado = await db.prepare(`SELECT ${CAMPOS} FROM leads
    WHERE criado_em >= ? AND criado_em < ?
    ORDER BY criado_em DESC, id DESC LIMIT 5000`)
    .bind(inicioUtc, fimUtc).all()
  return resultado?.results || []
}

export const CABECALHO_LEADS = [
  'Nome', 'E-mail', 'WhatsApp', 'Cadastro', 'Origem', 'Meio', 'Campanha',
  'Página de entrada', 'Consentimento', 'Data do consentimento', 'Baixou',
  'Primeiro download', 'Downloads do link atual', 'Comprou', 'Data da compra', 'Descadastrado',
]

export function linhaLeadCsv(linha) {
  return [
    linha.nome, linha.email, formatarCelular(linha.whatsapp),
    formatarDataBrasilia(linha.criado_em), linha.origem, linha.meio, linha.campanha,
    linha.pagina_entrada, Number(linha.consentimento) ? 'Sim' : 'Não',
    formatarDataBrasilia(linha.consentimento_em), linha.primeiro_download_em ? 'Sim' : 'Não',
    formatarDataBrasilia(linha.primeiro_download_em), Number(linha.downloads || 0),
    Number(linha.comprou) ? 'Sim' : 'Não', formatarDataBrasilia(linha.comprou_em),
    Number(linha.descadastrado) ? 'Sim' : 'Não',
  ]
}
