import { isoUtc, paginaValida } from './clientes.js'
import { formatarDataBrasilia } from './csv.js'

const POR_PAGINA = 50
const FILTROS = new Set(['todos', 'andamento', 'recuperados', 'finalizados', 'sem_envio'])

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function filtroRecuperacaoValido(valor) {
  const filtro = String(valor || 'todos')
  return FILTROS.has(filtro) ? filtro : null
}

export function buscaRecuperacaoValida(valor) {
  return String(valor || '').trim().slice(0, 80)
}

function escaparLike(valor) {
  return valor.split('\\').join('\\\\').split('%').join('\\%').split('_').join('\\_')
}

function clausulas(filtro, busca) {
  const partes = ['ordem = 1']
  const valores = []

  if (filtro === 'todos') partes.push("situacao <> 'comprou_sem_lembrete'")
  if (filtro === 'andamento') partes.push("situacao IN ('andamento', 'aguardando')")
  if (filtro === 'recuperados') partes.push("situacao = 'recuperado'")
  if (filtro === 'finalizados') partes.push("situacao = 'finalizado'")
  if (filtro === 'sem_envio') partes.push("situacao = 'sem_envio'")

  if (busca) {
    const valor = `%${escaparLike(busca.toLowerCase())}%`
    partes.push(`(
      LOWER(COALESCE(nome, '')) LIKE ? ESCAPE '\\'
      OR LOWER(email) LIKE ? ESCAPE '\\'
      OR COALESCE(telefone, '') LIKE ? ESCAPE '\\'
    )`)
    valores.push(valor, valor, valor)
  }

  return { sql: partes.join(' AND '), valores }
}

const CTE = `
  WITH primeiro_lembrete AS (
    SELECT c.email, MIN(l.enviado_em) AS primeiro_email_em
      FROM carrinhos c
      JOIN lembretes_enviados l ON l.carrinho_id = c.id AND l.canal = 'email'
     GROUP BY c.email
  ),
  pagamentos_email AS (
    SELECT pago.email,
           MIN(pago.pago_em) AS pago_em,
           MIN(CASE
             WHEN EXISTS (
               SELECT 1
                 FROM carrinhos enviado
                 JOIN lembretes_enviados l
                   ON l.carrinho_id = enviado.id AND l.canal = 'email'
                WHERE enviado.email = pago.email AND l.enviado_em < pago.pago_em
                LIMIT 1
             ) THEN pago.pago_em
           END) AS recuperado_em
      FROM carrinhos pago
     WHERE pago.pago_em IS NOT NULL
     GROUP BY pago.email
  ),
  ranqueados AS (
    SELECT c.*,
           pe.pago_em AS primeiro_pago_em,
           pe.recuperado_em,
           ROW_NUMBER() OVER (
             PARTITION BY c.email
             ORDER BY c.etapa_email DESC, c.criado_em DESC, c.id DESC
           ) AS ordem
      FROM carrinhos c
      LEFT JOIN pagamentos_email pe ON pe.email = c.email
  ),
  classificados AS (
    SELECT ranqueados.*,
           CASE
             WHEN recuperado_em IS NOT NULL THEN 'recuperado'
             WHEN primeiro_pago_em IS NOT NULL THEN 'comprou_sem_lembrete'
             WHEN finalizado_em IS NOT NULL THEN 'finalizado'
             WHEN status = 'lembrado' AND finalizado_em IS NULL THEN 'andamento'
             WHEN status = 'aberto' THEN 'aguardando'
             WHEN status = 'ignorado' AND etapa_email = 0 THEN 'sem_envio'
             ELSE 'sem_envio'
           END AS situacao
      FROM ranqueados
  )`

const CAMPOS = `
  id,
  nome,
  email,
  telefone,
  criado_em,
  status,
  etapa_email,
  proximo_email_em,
  finalizado_em,
  finalizado_motivo,
  situacao,
  COALESCE(recuperado_em, primeiro_pago_em) AS pago_em,
  (SELECT l.enviado_em FROM lembretes_enviados l
    WHERE l.carrinho_id = classificados.id AND l.canal = 'email' AND l.etapa = 1
    LIMIT 1) AS email_1_em,
  (SELECT l.enviado_em FROM lembretes_enviados l
    WHERE l.carrinho_id = classificados.id AND l.canal = 'email' AND l.etapa = 2
    LIMIT 1) AS email_2_em,
  (SELECT l.enviado_em FROM lembretes_enviados l
    WHERE l.carrinho_id = classificados.id AND l.canal = 'email' AND l.etapa = 3
    LIMIT 1) AS email_3_em,
  (SELECT l.enviado_em FROM lembretes_enviados l
    WHERE l.carrinho_id = classificados.id AND l.canal = 'email' AND l.etapa = 4
    LIMIT 1) AS email_4_em,
  CASE WHEN recuperado_em IS NOT NULL THEN (
    SELECT l.etapa
      FROM carrinhos enviado
      JOIN lembretes_enviados l ON l.carrinho_id = enviado.id AND l.canal = 'email'
     WHERE enviado.email = classificados.email AND l.enviado_em < recuperado_em
     ORDER BY l.enviado_em DESC, l.etapa DESC
     LIMIT 1
  ) END AS recuperado_pela_etapa`

const SQL_TOTAIS = `${CTE}
  SELECT
    SUM(CASE WHEN situacao <> 'comprou_sem_lembrete' THEN 1 ELSE 0 END) AS pessoas,
    SUM(CASE WHEN situacao IN ('andamento', 'aguardando') THEN 1 ELSE 0 END) AS andamento,
    SUM(CASE WHEN situacao = 'recuperado' THEN 1 ELSE 0 END) AS recuperados,
    SUM(CASE WHEN situacao = 'finalizado' THEN 1 ELSE 0 END) AS finalizados,
    SUM(CASE WHEN situacao = 'sem_envio' THEN 1 ELSE 0 END) AS sem_envio,
    SUM(CASE WHEN situacao = 'comprou_sem_lembrete' THEN 1 ELSE 0 END) AS comprou_sem_lembrete,
    (SELECT COUNT(*) FROM lembretes_enviados WHERE canal = 'email') AS emails_enviados,
    (SELECT COUNT(DISTINCT c.email)
       FROM carrinhos c
       JOIN lembretes_enviados l ON l.carrinho_id = c.id AND l.canal = 'email'
    ) AS pessoas_com_email,
    (SELECT COALESCE(SUM(compra.valor_centavos), 0)
       FROM classificados recuperada
       JOIN primeiro_lembrete primeiro ON primeiro.email = recuperada.email
       JOIN clientes cliente ON cliente.email = recuperada.email
       JOIN compras compra ON compra.cliente_id = cliente.id AND compra.status = 'pago'
      WHERE recuperada.ordem = 1
        AND recuperada.situacao = 'recuperado'
        AND compra.criado_em > primeiro.primeiro_email_em
    ) AS valor_recuperado_centavos
  FROM classificados
  WHERE ordem = 1
  LIMIT 1`

function totaisDaLinha(linha) {
  const recuperados = Number(linha?.recuperados || 0)
  const pessoasComEmail = Number(linha?.pessoas_com_email || 0)
  return {
    pessoas: Number(linha?.pessoas || 0),
    andamento: Number(linha?.andamento || 0),
    recuperados,
    finalizados: Number(linha?.finalizados || 0),
    sem_envio: Number(linha?.sem_envio || 0),
    comprou_sem_lembrete: Number(linha?.comprou_sem_lembrete || 0),
    emails_enviados: Number(linha?.emails_enviados || 0),
    taxa: pessoasComEmail ? recuperados / pessoasComEmail : 0,
    valor_recuperado_centavos: Number(linha?.valor_recuperado_centavos || 0),
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

export function recuperacaoDaLinha(linha) {
  const emAndamento = linha.situacao === 'andamento'
  const etapa = Number(linha.etapa_email || 0)
  return {
    nome: linha.nome || '',
    email: linha.email,
    telefone: linha.telefone || null,
    criado_em: isoUtc(linha.criado_em),
    situacao: linha.situacao,
    finalizado_motivo: linha.finalizado_motivo || null,
    finalizado_em: isoUtc(linha.finalizado_em),
    emails: emailsDaLinha(linha),
    proximo_email_em: emAndamento ? isoUtc(linha.proximo_email_em) : null,
    proxima_etapa: emAndamento && etapa < 4 ? etapa + 1 : null,
    whatsapp: { situacao: 'aguardando', enviado_em: null },
    pago_em: isoUtc(linha.pago_em),
    recuperado_pela_etapa:
      linha.situacao === 'recuperado' ? Number(linha.recuperado_pela_etapa || 0) || null : null,
  }
}

export async function consultarRecuperacao(db, { filtro, busca, pagina } = {}) {
  const filtroLimpo = filtroRecuperacaoValido(filtro) || 'todos'
  const buscaLimpa = buscaRecuperacaoValida(busca)
  const numeroPagina = paginaValida(pagina)
  const condicoes = clausulas(filtroLimpo, buscaLimpa)
  const deslocamento = (numeroPagina - 1) * POR_PAGINA

  const [paginaResultado, totaisLinha] = await Promise.all([
    db.prepare(`${CTE}
      SELECT ${CAMPOS}
        FROM classificados
       WHERE ${condicoes.sql}
       ORDER BY criado_em DESC, id DESC
       LIMIT ? OFFSET ?`)
      .bind(...condicoes.valores, POR_PAGINA + 1, deslocamento)
      .all(),
    db.prepare(SQL_TOTAIS).first(),
  ])

  const todas = linhas(paginaResultado)
  return {
    totais: totaisDaLinha(totaisLinha),
    itens: todas.slice(0, POR_PAGINA).map(recuperacaoDaLinha),
    pagina: numeroPagina,
    temMais: todas.length > POR_PAGINA,
  }
}

export async function consultarRecuperacaoCsv(db, { filtro, busca } = {}) {
  const filtroLimpo = filtroRecuperacaoValido(filtro) || 'todos'
  const condicoes = clausulas(filtroLimpo, buscaRecuperacaoValida(busca))
  const resultado = await db.prepare(`${CTE}
    SELECT ${CAMPOS}
      FROM classificados
     WHERE ${condicoes.sql}
     ORDER BY criado_em DESC, id DESC
     LIMIT 5000`).bind(...condicoes.valores).all()
  return linhas(resultado)
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
]

export function linhaRecuperacaoCsv(linha) {
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
    'Aguardando — em breve',
    formatarDataBrasilia(linha.pago_em),
    linha.recuperado_pela_etapa || '',
  ]
}
