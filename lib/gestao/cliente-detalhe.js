import { isoUtc } from './clientes.js'
import { inicioDoDiaBrasilia } from './datas.js'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function idClienteValido(valor) {
  const id = Number(valor)
  return Number.isSafeInteger(id) && id >= 1 ? id : null
}

const EMAIL_DO_CLIENTE = '(SELECT LOWER(TRIM(email)) FROM clientes WHERE id = ?)'

function compraDaLinha(l) {
  return {
    id: Number(l.id),
    em: isoUtc(l.criado_em),
    valor_centavos: Number(l.valor_centavos || 0),
    forma: l.forma_pagamento || null,
    cupom: l.cupom || null,
    status: l.status,
    teste: Boolean(Number(l.teste)),
    utm_source: l.utm_source || null,
    utm_campaign: l.utm_campaign || null,
    utm_content: l.utm_content || null,
    meta: l.meta_status || null,
    meta_enviado_em: isoUtc(l.meta_enviado_em),
    acesso_enviado_em: isoUtc(l.acesso_enviado_em),
  }
}

function carrinhoDaLinha(l) {
  if (!l) return null
  const recuperado = Boolean(l.recuperado_em)
  return {
    status: l.status,
    criado_em: isoUtc(l.criado_em),
    pago_em: isoUtc(l.pago_em),
    teste: Boolean(Number(l.teste)),
    utm_source: l.utm_source || null,
    utm_campaign: l.utm_campaign || null,
    emails_enviados: Number(l.emails_enviados || 0),
    whatsapp_enviados: Number(l.whatsapp_enviados || 0),
    whatsapp_motivo: l.whatsapp_motivo || null,
    finalizado_motivo: l.finalizado_motivo || null,
    recuperado,
    recuperado_pela_etapa: recuperado ? Number(l.recuperado_etapa || 0) || null : null,
    recuperado_pelo_canal: recuperado ? l.recuperado_canal || null : null,
  }
}

function leadDaLinha(l) {
  if (!l) return null
  return {
    criado_em: isoUtc(l.criado_em),
    consentimento_em: isoUtc(l.consentimento_em),
    origem: l.origem || null,
    meio: l.meio || null,
    campanha: l.campanha || null,
    pagina_entrada: l.pagina_entrada || null,
    envios: Number(l.envios || 0),
    downloads: Number(l.downloads || 0),
    baixou: Boolean(l.primeiro_download_em),
    primeiro_download_em: isoUtc(l.primeiro_download_em),
    comprou: Boolean(Number(l.comprou)),
    comprou_em: isoUtc(l.comprou_em),
    descadastrado: Boolean(Number(l.descadastrado)),
  }
}

function historicoDaLinha(l) {
  let detalhe = null
  try {
    detalhe = l.detalhe ? JSON.parse(l.detalhe) : null
  } catch {
    detalhe = null
  }
  return { id: Number(l.id), em: isoUtc(l.criado_em), quem: l.quem, acao: l.acao, alvo: l.alvo || null, detalhe }
}

// Ficha de uma pessoa, num único db.batch(). Nunca devolve IP, agente nem token
// (as consultas nem selecionam essas colunas). O título da música fica para o
// navegador montar a partir do slug. Cliente inexistente: null.
export async function consultarClienteDetalhe(db, id, { limiteDia = 30, agora = new Date() } = {}) {
  const hoje = inicioDoDiaBrasilia(agora)
  const [cliente, compras, totais, ultimos, carrinho, lead, historico] = await db.batch([
    db.prepare(`
      SELECT c.id, c.nome, c.email, c.criado_em, c.ultimo_acesso, c.bloqueado, c.supabase_id,
             (SELECT k.telefone FROM carrinhos k
               WHERE k.email = LOWER(TRIM(c.email)) AND COALESCE(k.telefone, '') <> ''
               ORDER BY k.status = 'pago' DESC, k.criado_em DESC LIMIT 1) AS telefone
        FROM clientes c WHERE c.id = ? LIMIT 1`).bind(id),
    db.prepare(`
      SELECT id, criado_em, valor_centavos, forma_pagamento, cupom, status, teste,
             utm_source, utm_campaign, utm_content, meta_status, meta_enviado_em, acesso_enviado_em
        FROM compras WHERE cliente_id = ?
       ORDER BY criado_em DESC, id DESC LIMIT 50`).bind(id),
    db.prepare(`
      SELECT COUNT(*) AS total, COALESCE(SUM(criado_em >= ?), 0) AS hoje
        FROM downloads WHERE cliente_id = ? LIMIT 1`).bind(hoje, id),
    db.prepare(`
      SELECT slug, criado_em FROM downloads WHERE cliente_id = ?
       ORDER BY criado_em DESC, id DESC LIMIT 20`).bind(id),
    // Carrinho representante (o de mais etapas, como na aba Recuperação) e a recuperação da pessoa.
    db.prepare(`
      SELECT x.*,
             (SELECT l.canal FROM carrinhos e JOIN lembretes_enviados l ON l.carrinho_id = e.id
               WHERE e.email = x.email AND l.enviado_em < x.recuperado_em
               ORDER BY l.enviado_em DESC, l.canal ASC, l.etapa DESC LIMIT 1) AS recuperado_canal,
             (SELECT l.etapa FROM carrinhos e JOIN lembretes_enviados l ON l.carrinho_id = e.id
               WHERE e.email = x.email AND l.enviado_em < x.recuperado_em
               ORDER BY l.enviado_em DESC, l.canal ASC, l.etapa DESC LIMIT 1) AS recuperado_etapa
        FROM (
          SELECT k.email, k.status, k.criado_em, k.pago_em, k.teste, k.utm_source, k.utm_campaign,
                 k.whatsapp_motivo, k.finalizado_motivo,
                 (SELECT COUNT(*) FROM lembretes_enviados l JOIN carrinhos o ON o.id = l.carrinho_id
                   WHERE o.email = k.email AND l.canal = 'email') AS emails_enviados,
                 (SELECT COUNT(*) FROM lembretes_enviados l JOIN carrinhos o ON o.id = l.carrinho_id
                   WHERE o.email = k.email AND l.canal = 'whatsapp') AS whatsapp_enviados,
                 (SELECT MIN(p.pago_em) FROM carrinhos p
                   WHERE p.email = k.email AND p.pago_em IS NOT NULL AND EXISTS (
                     SELECT 1 FROM carrinhos e JOIN lembretes_enviados l ON l.carrinho_id = e.id
                      WHERE e.email = p.email AND l.enviado_em < p.pago_em LIMIT 1)) AS recuperado_em
            FROM carrinhos k
           WHERE k.email = ${EMAIL_DO_CLIENTE}
           ORDER BY k.etapa_email DESC, k.criado_em DESC, k.id DESC
           LIMIT 1
        ) x`).bind(id),
    db.prepare(`
      SELECT criado_em, consentimento_em, origem, meio, campanha, pagina_entrada, envios, downloads,
             primeiro_download_em, comprou, comprou_em, descadastrado
        FROM leads WHERE email = ${EMAIL_DO_CLIENTE} LIMIT 1`).bind(id),
    db.prepare(`
      SELECT id, criado_em, quem, acao, alvo, detalhe
        FROM registro
       WHERE alvo = (SELECT email FROM clientes WHERE id = ?) OR alvo = ?
       ORDER BY criado_em DESC, id DESC LIMIT 30`).bind(id, String(id)),
  ])

  const c = linhas(cliente)[0]
  if (!c) return null
  const listaCompras = linhas(compras).map(compraDaLinha)
  const total = linhas(totais)[0]
  return {
    cliente: {
      id: Number(c.id),
      nome: c.nome || null,
      email: c.email,
      telefone: c.telefone || null,
      criado_em: isoUtc(c.criado_em),
      ultimo_acesso: isoUtc(c.ultimo_acesso),
      bloqueado: Boolean(Number(c.bloqueado)),
      tem_senha: Boolean(c.supabase_id),
      teste: listaCompras.some((x) => x.teste),
    },
    compras: listaCompras,
    downloads: {
      total: Number(total?.total || 0),
      hoje: Number(total?.hoje || 0),
      limite_dia: limiteDia,
      ultimos: linhas(ultimos).map((d) => ({ slug: d.slug || null, em: isoUtc(d.criado_em) })),
    },
    carrinho: carrinhoDaLinha(linhas(carrinho)[0]),
    lead: leadDaLinha(linhas(lead)[0]),
    historico: linhas(historico).map(historicoDaLinha),
  }
}
