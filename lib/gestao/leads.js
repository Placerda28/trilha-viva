import { isoUtc, paginaValida } from './clientes.js'
import { formatarCelular, formatarDataBrasilia } from './csv.js'

const POR_PAGINA = 25
const CAMPOS = `id, nome, email, whatsapp, consentimento, consentimento_em,
  origem, meio, campanha, pagina_entrada, criado_em, ultimo_envio_em,
  envios, downloads, primeiro_download_em, comprou, comprou_em, descadastrado`

export async function consultarLeads(db, { inicioUtc, fimUtc, pagina }) {
  const numero = paginaValida(pagina)
  const [resultado, resumo] = await Promise.all([
    db.prepare(`SELECT ${CAMPOS} FROM leads
      WHERE criado_em >= ? AND criado_em < ?
      ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(inicioUtc, fimUtc, POR_PAGINA, (numero - 1) * POR_PAGINA).all(),
    db.prepare(`SELECT COUNT(*) AS cadastros,
      COALESCE(SUM(primeiro_download_em IS NOT NULL), 0) AS baixaram,
      COALESCE(SUM(comprou = 1), 0) AS compraram
      FROM leads WHERE criado_em >= ? AND criado_em < ? LIMIT 1`)
      .bind(inicioUtc, fimUtc).first(),
  ])
  const cadastros = Number(resumo?.cadastros || 0)
  const compraram = Number(resumo?.compraram || 0)
  return {
    pagina: numero,
    por_pagina: POR_PAGINA,
    total_itens: cadastros,
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
