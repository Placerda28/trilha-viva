import { fonteCarrinhos, fonteCompras } from './testes.js'
import { paginaValida } from './clientes.js'
import { SQL_MENSAGENS } from '../whatsapp-sequencia.js'
import { recuperacaoDaLinha, totaisDaLinha } from './recuperacao-linha.js'

// A conversão das linhas e a planilha ficam em recuperacao-linha.js; quem já
// importava daqui segue importando daqui.
export {
  recuperacaoDaLinha,
  CABECALHO_RECUPERACAO,
  linhaRecuperacaoCsv,
} from './recuperacao-linha.js'

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

const cte = (mostrarTestes = false) => `
  WITH primeiro_lembrete AS (
    SELECT c.email, MIN(l.enviado_em) AS primeiro_lembrete_em
      FROM ${fonteCarrinhos(mostrarTestes)} c
      JOIN lembretes_enviados l ON l.carrinho_id = c.id
     GROUP BY c.email
  ),
  pagamentos_pessoa AS (
    SELECT pago.email,
           MIN(pago.pago_em) AS pago_em,
           MIN(CASE
             WHEN EXISTS (
               SELECT 1
                 FROM ${fonteCarrinhos(mostrarTestes)} enviado
                 JOIN lembretes_enviados l
                   ON l.carrinho_id = enviado.id
                WHERE enviado.email = pago.email AND l.enviado_em < pago.pago_em
                LIMIT 1
             ) THEN pago.pago_em
           END) AS recuperado_em
      FROM ${fonteCarrinhos(mostrarTestes)} pago
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
      FROM ${fonteCarrinhos(mostrarTestes)} c
      LEFT JOIN pagamentos_pessoa pe ON pe.email = c.email
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
  ),
  whatsapp_pessoa AS (
    SELECT c.email,
           c.id AS pessoa_whatsapp_carrinho,
           c.whatsapp_enviado_em AS pessoa_whatsapp_enviado_em,
           c.whatsapp_falhou_em AS pessoa_whatsapp_falhou_em,
           c.whatsapp_etapa AS pessoa_whatsapp_etapa,
           c.proximo_whatsapp_em AS pessoa_proximo_whatsapp_em,
           c.whatsapp_motivo AS pessoa_whatsapp_motivo,
           ROW_NUMBER() OVER (
             PARTITION BY c.email
             ORDER BY CASE WHEN c.whatsapp_enviado_em IS NOT NULL THEN 2
                           WHEN c.whatsapp_falhou_em IS NOT NULL THEN 1
                           ELSE 0 END DESC,
                      c.criado_em DESC, c.id DESC
           ) AS ordem_whatsapp
      FROM ${fonteCarrinhos(mostrarTestes)} c
  ),
  detalhados AS (
    SELECT classificados.*,
           wp.pessoa_whatsapp_carrinho,
           wp.pessoa_whatsapp_enviado_em,
           wp.pessoa_whatsapp_falhou_em,
           wp.pessoa_whatsapp_etapa,
           wp.pessoa_proximo_whatsapp_em,
           wp.pessoa_whatsapp_motivo
      FROM classificados
      LEFT JOIN whatsapp_pessoa wp
        ON wp.email = classificados.email AND wp.ordem_whatsapp = 1
  )`

const campos = (mostrarTestes = false) => `
  id,
  teste,
  nome,
  email,
  telefone,
  criado_em,
  utm_source,
  utm_campaign,
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
  pessoa_whatsapp_enviado_em AS whatsapp_enviado_em,
  pessoa_whatsapp_falhou_em AS whatsapp_falhou_em,
  pessoa_whatsapp_etapa AS whatsapp_etapa,
  pessoa_proximo_whatsapp_em AS proximo_whatsapp_em,
  pessoa_whatsapp_motivo AS whatsapp_motivo,
  (SELECT ${SQL_MENSAGENS} FROM lembretes_enviados l
    WHERE l.carrinho_id = classificados.pessoa_whatsapp_carrinho AND l.canal = 'whatsapp'
  ) AS whatsapp_mensagens,
  EXISTS(
    SELECT 1 FROM descadastros d WHERE d.email = classificados.email LIMIT 1
  ) AS whatsapp_descadastrado,
  criado_em > datetime('now', '-48 hours') AS whatsapp_no_prazo,
  datetime(criado_em, '+3 hours') AS whatsapp_previsto_em,
  CASE WHEN recuperado_em IS NOT NULL THEN (
    SELECT l.etapa
      FROM ${fonteCarrinhos(mostrarTestes)} enviado
      JOIN lembretes_enviados l ON l.carrinho_id = enviado.id
     WHERE enviado.email = classificados.email AND l.enviado_em < recuperado_em
     ORDER BY l.enviado_em DESC, l.canal ASC, l.etapa DESC
     LIMIT 1
  ) END AS recuperado_pela_etapa,
  CASE WHEN recuperado_em IS NOT NULL THEN (
    SELECT l.canal
      FROM ${fonteCarrinhos(mostrarTestes)} enviado
      JOIN lembretes_enviados l ON l.carrinho_id = enviado.id
     WHERE enviado.email = classificados.email AND l.enviado_em < recuperado_em
     ORDER BY l.enviado_em DESC, l.canal ASC, l.etapa DESC
     LIMIT 1
  ) END AS recuperado_pelo_canal`

// Totais da aba. Sem período: todo o histórico. Com período, a população é a das
// pessoas cujo carrinho representante nasceu no intervalo, e as mensagens
// contam pela data de envio. Os "?" seguem a ordem do texto.
export function sqlTotais(mostrarTestes = false, periodo = null) {
  const fc = fonteCarrinhos(mostrarTestes)
  const fp = fonteCompras(mostrarTestes)
  const naData = (coluna) => (periodo ? ` AND ${coluna} >= ? AND ${coluna} < ?` : '')
  const par = periodo ? [periodo.inicioUtc, periodo.fimUtc] : []
  // Mesmo critério de campos(): o último lembrete antes da compra decide o canal.
  const canal = `(
    SELECT l.canal
      FROM ${fc} enviado
      JOIN lembretes_enviados l ON l.carrinho_id = enviado.id
     WHERE enviado.email = classificados.email AND l.enviado_em < classificados.recuperado_em
     ORDER BY l.enviado_em DESC, l.canal ASC, l.etapa DESC
     LIMIT 1
  )`
  const sql = `${cte(mostrarTestes)}
  SELECT
    SUM(CASE WHEN situacao <> 'comprou_sem_lembrete' THEN 1 ELSE 0 END) AS pessoas,
    SUM(CASE WHEN situacao IN ('andamento', 'aguardando') THEN 1 ELSE 0 END) AS andamento,
    SUM(CASE WHEN situacao = 'recuperado' THEN 1 ELSE 0 END) AS recuperados,
    SUM(CASE WHEN situacao = 'recuperado' AND ${canal} = 'email' THEN 1 ELSE 0 END) AS recuperados_email,
    SUM(CASE WHEN situacao = 'recuperado' AND ${canal} = 'whatsapp' THEN 1 ELSE 0 END) AS recuperados_whatsapp,
    SUM(CASE WHEN situacao = 'finalizado' THEN 1 ELSE 0 END) AS finalizados,
    SUM(CASE WHEN situacao = 'sem_envio' THEN 1 ELSE 0 END) AS sem_envio,
    SUM(CASE WHEN situacao = 'comprou_sem_lembrete' THEN 1 ELSE 0 END) AS comprou_sem_lembrete,
    (SELECT COUNT(*) FROM lembretes_enviados l JOIN ${fc} c ON c.id = l.carrinho_id
      WHERE l.canal = 'email'${naData('l.enviado_em')}) AS emails_enviados,
    (SELECT COUNT(*) FROM lembretes_enviados l JOIN ${fc} c ON c.id = l.carrinho_id
      WHERE l.canal = 'whatsapp'${naData('l.enviado_em')}) AS whatsapp_enviados,
    SUM(CASE WHEN EXISTS (
      SELECT 1 FROM ${fc} e JOIN lembretes_enviados l ON l.carrinho_id = e.id
       WHERE e.email = classificados.email LIMIT 1
    ) THEN 1 ELSE 0 END) AS pessoas_com_lembrete,
    (SELECT COALESCE(SUM(compra.valor_centavos), 0)
       FROM classificados recuperada
       JOIN primeiro_lembrete primeiro ON primeiro.email = recuperada.email
       JOIN clientes cliente ON cliente.email = recuperada.email
       JOIN ${fp} compra ON compra.cliente_id = cliente.id AND compra.status = 'pago'
      WHERE recuperada.ordem = 1
        AND recuperada.situacao = 'recuperado'
        AND compra.criado_em > primeiro.primeiro_lembrete_em${naData('recuperada.criado_em')}
    ) AS valor_recuperado_centavos
  FROM classificados
  WHERE ordem = 1${naData('criado_em')}
  LIMIT 1`
  return { sql, valores: [...par, ...par, ...par, ...par] }
}

export async function consultarRecuperacao(
  db,
  { filtro, busca, pagina, periodo = null, mostrarTestes = false, whatsappAtivo = false, agora = new Date() } = {}
) {
  const filtroLimpo = filtroRecuperacaoValido(filtro) || 'todos'
  const buscaLimpa = buscaRecuperacaoValida(busca)
  const numeroPagina = paginaValida(pagina)
  const condicoes = clausulas(filtroLimpo, buscaLimpa)
  const deslocamento = (numeroPagina - 1) * POR_PAGINA

  const totais = sqlTotais(mostrarTestes, periodo)
  const [paginaResultado, totaisLinha] = await Promise.all([
    db.prepare(`${cte(mostrarTestes)}
      SELECT ${campos(mostrarTestes)}
        FROM detalhados AS classificados
       WHERE ${condicoes.sql}
       ORDER BY criado_em DESC, id DESC
       LIMIT ? OFFSET ?`)
      .bind(...condicoes.valores, POR_PAGINA + 1, deslocamento)
      .all(),
    db.prepare(totais.sql).bind(...totais.valores).first(),
  ])

  const todas = linhas(paginaResultado)
  return {
    totais: totaisDaLinha(totaisLinha, whatsappAtivo),
    itens: todas.slice(0, POR_PAGINA).map((linha) =>
      recuperacaoDaLinha(linha, whatsappAtivo, agora)
    ),
    pagina: numeroPagina,
    temMais: todas.length > POR_PAGINA,
  }
}

export async function consultarRecuperacaoCsv(
  db,
  { filtro, busca, whatsappAtivo = false } = {}
) {
  const filtroLimpo = filtroRecuperacaoValido(filtro) || 'todos'
  const condicoes = clausulas(filtroLimpo, buscaRecuperacaoValida(busca))
  const resultado = await db.prepare(`${cte()}
    SELECT ${campos()}
      FROM detalhados AS classificados
     WHERE ${condicoes.sql}
     ORDER BY criado_em DESC, id DESC
     LIMIT 5000`).bind(...condicoes.valores).all()
  return linhas(resultado).map((linha) => ({ ...linha, whatsappAtivo }))
}
