import { executar, umaLinha } from './d1.js'
import { normalizarEmail, novoToken, resumo } from '@/lib/sessao'
import { limparTelefone, telefoneValido, limparUtm } from './carrinhos.js'
import { mesmaOrigem } from './origem.js'
import { enviarEmailLead } from './email.js'
import { consultarTurnstile } from './turnstile.js'

export const cabecalhosLeads = {
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
}

function erro(mensagem, status = 400) {
  return Response.json({ ok: false, erro: mensagem }, { status, headers: cabecalhosLeads })
}

export function validarLead(corpo) {
  const c = corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo : {}
  const nome = typeof c.nome === 'string' ? c.nome.trim().slice(0, 80) : ''
  const email = typeof c.email === 'string' ? normalizarEmail(c.email) : ''
  if (!nome) return { erro: 'Informe seu nome.' }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erro: 'Informe um e-mail válido.' }
  }
  if (typeof c.whatsapp !== 'string' || !telefoneValido(c.whatsapp)) {
    return { erro: 'Informe seu WhatsApp com DDD.' }
  }
  if (c.consentimento !== true) return { erro: 'Confirme seu consentimento para continuar.' }
  for (const chave of ['utm_source', 'utm_medium', 'utm_campaign', 'pagina_entrada', 'turnstile']) {
    if (c[chave] != null && typeof c[chave] !== 'string') return { erro: 'Dados do formulário inválidos.' }
  }
  const utm = limparUtm({ source: c.utm_source, medium: c.utm_medium, campaign: c.utm_campaign })
  return { nome, email, whatsapp: limparTelefone(c.whatsapp), consentimento: true,
    origem: utm.source, meio: utm.medium, campanha: utm.campaign,
    pagina_entrada: (c.pagina_entrada || '/vs-gratis').trim().slice(0, 500) }
}

export async function verificarTurnstile(req, token, segredo, ambiente, buscar) {
  if (!segredo) {
    // Apenas next dev dispensa a chave; produção e preview falham fechados.
    return ambiente === 'development' ? null : erro('Verificação indisponível. Tente novamente mais tarde.', 503)
  }
  const resultado = await consultarTurnstile(req, token, segredo, buscar)
  if (resultado === 'sem_token') return erro('Conclua a verificação de segurança.')
  if (resultado === 'invalido') return erro('Verificação de segurança inválida. Tente novamente.')
  if (resultado === 'indisponivel') return erro('Verificação indisponível. Tente novamente mais tarde.', 503)
  return null
}

export async function reservarCadastro(db, ip) {
  await executar(db, "DELETE FROM leads_tentativas WHERE criado_em <= datetime('now', '-1 hour')")
  // Contar e inserir na mesma instrução impede ultrapassar o limite em paralelo.
  return Boolean(await umaLinha(db, `INSERT INTO leads_tentativas (ip)
    SELECT ? WHERE (SELECT COUNT(*) FROM leads_tentativas
      WHERE ip = ? AND criado_em > datetime('now', '-1 hour')) < 5
    RETURNING id`, ip, ip))
}

export async function gravarLead(db, corpo, reservarEmail = false) {
  const d = validarLead(corpo)
  if (d.erro) throw new Error(d.erro)
  const token = novoToken()
  const hash = await resumo(token)
  // Quem se descadastrou continua descadastrado: o formulário não prova que o
  // e-mail é de quem preenche, então um recadastro não reativa o consentimento,
  // nem a sequência, nem troca o WhatsApp (auditoria de 07/11/2026, M6). A
  // pessoa ainda recebe o link na tela.
  const linha = await umaLinha(db, `INSERT INTO leads
    (nome, email, whatsapp, consentimento, consentimento_em, origem, meio, campanha,
     pagina_entrada, token_hash, token_expira_em, proximo_email_em)
    VALUES (?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?, datetime('now', '+7 days'), datetime('now', ?))
    ON CONFLICT(email) DO UPDATE SET
      nome = CASE WHEN leads.descadastrado = 1 THEN leads.nome ELSE excluded.nome END,
      whatsapp = CASE WHEN leads.descadastrado = 1 THEN leads.whatsapp ELSE excluded.whatsapp END,
      consentimento = CASE WHEN leads.descadastrado = 1 THEN leads.consentimento ELSE 1 END,
      consentimento_em = CASE WHEN leads.descadastrado = 1 THEN leads.consentimento_em ELSE excluded.consentimento_em END,
      -- Recadastro sem UTM não apaga a origem que o lead já tinha.
      origem = COALESCE(NULLIF(excluded.origem, ''), leads.origem),
      meio = COALESCE(NULLIF(excluded.meio, ''), leads.meio),
      campanha = COALESCE(NULLIF(excluded.campanha, ''), leads.campanha),
      pagina_entrada = excluded.pagina_entrada, token_hash = excluded.token_hash,
      token_expira_em = excluded.token_expira_em, downloads = 0,
      -- Quem já comprou recebe o link de novo, mas não volta para a sequência de oferta.
      etapa_email = CASE WHEN leads.comprou = 1 OR leads.descadastrado = 1 THEN leads.etapa_email ELSE 0 END,
      proximo_email_em = CASE WHEN leads.comprou = 1 OR leads.descadastrado = 1 THEN NULL ELSE excluded.proximo_email_em END,
      -- Quem voltou a se cadastrar reabre o processo concluído; descadastrou, comprou e parado pela Gestão continuam fechados.
      encerrado_em = CASE WHEN leads.encerrado_motivo = 'concluido' AND leads.descadastrado = 0 THEN NULL ELSE leads.encerrado_em END,
      encerrado_motivo = CASE WHEN leads.encerrado_motivo = 'concluido' AND leads.descadastrado = 0 THEN NULL ELSE leads.encerrado_motivo END
    RETURNING descadastrado`,
  d.nome, d.email, d.whatsapp, d.origem, d.meio, d.campanha, d.pagina_entrada, hash,
  reservarEmail ? '+10 minutes' : '+0 minutes')
  return { ok: true, nome: d.nome, link: `/vs-gratis/baixar?t=${token}`, descadastrado: Number(linha?.descadastrado) === 1 }
}

export async function responderCadastroLead(req, { db, segredo, ambiente, buscar = fetch, emailEnv, buscarEmail = fetch } = {}) {
  if (!mesmaOrigem(req)) return erro('Origem do pedido inválida.', 403)
  let corpo
  try { corpo = await req.json() } catch { return erro('Envie um formulário válido.') }
  const dados = validarLead(corpo)
  if (dados.erro) return erro(dados.erro)
  if (!db) return erro('Cadastro indisponível. Tente novamente mais tarde.', 503)
  const verificacao = await verificarTurnstile(req, corpo.turnstile, segredo, ambiente, buscar)
  if (verificacao) return verificacao
  const ip = (req.headers.get('cf-connecting-ip') || '').slice(0, 64)
  if (!ip && ambiente !== 'development') return erro('Não foi possível verificar sua conexão.', 503)
  try {
    if (!(await reservarCadastro(db, ip))) return erro('Limite de 5 pedidos por hora atingido. Tente mais tarde.', 429)
    // A reserva vence sozinha se o processo cair entre gravar e enviar.
    const { descadastrado, ...cadastro } = await gravarLead(db, corpo, true)
    // Descadastrado não recebe e-mail; a resposta é a mesma, para não revelar quem saiu da lista.
    if (descadastrado) return Response.json(cadastro, { headers: cabecalhosLeads })
    const hash = await resumo(new URL(cadastro.link, req.url).searchParams.get('t'))
    try {
      await enviarEmailLead({ ...dados, token_hash: hash }, cadastro.link, { env: emailEnv, fetchImpl: buscarEmail })
      await executar(db, `UPDATE leads SET
        etapa_email = CASE WHEN token_hash = ? THEN 1 ELSE etapa_email END, envios = envios + 1,
        ultimo_envio_em = datetime('now'), proximo_email_em = CASE
          WHEN token_hash <> ? THEN proximo_email_em
          WHEN comprou = 0 AND descadastrado = 0 AND consentimento = 1
          THEN datetime(consentimento_em, '+3 days') ELSE NULL END
        WHERE email = ?`, hash, hash, dados.email)
    } catch (falha) {
      console.error('vs grátis e-mail inicial', falha?.message)
      try {
        await executar(db, `UPDATE leads SET proximo_email_em = datetime('now')
          WHERE token_hash = ? AND etapa_email = 0 AND comprou = 0
          AND descadastrado = 0 AND consentimento = 1`, hash)
      } catch (falhaBanco) {
        console.error('vs grátis reagendamento', falhaBanco?.message)
      }
    }
    return Response.json(cadastro, { headers: cabecalhosLeads })
  } catch (falha) {
    console.error('vs grátis cadastro', falha?.message)
    return erro('Não foi possível cadastrar agora. Tente novamente mais tarde.', 503)
  }
}

export async function estadoTokenLead(db, hash) {
  const linha = await umaLinha(db, `SELECT downloads, token_expira_em > datetime('now') AS valido
    FROM leads WHERE token_hash = ? LIMIT 1`, hash)
  if (!linha?.valido) return 'vencido'
  return linha.downloads >= 3 ? 'esgotado' : null
}

export async function consumirDownloadLead(db, hash) {
  const resultado = await executar(db, `UPDATE leads SET downloads = downloads + 1,
    primeiro_download_em = COALESCE(primeiro_download_em, datetime('now'))
    WHERE token_hash = ? AND token_expira_em > datetime('now') AND downloads < 3`, hash)
  return Boolean(resultado?.meta?.changes)
}

export async function responderDownloadLead(req, { db, arquivosDe, linkDeDownload } = {}) {
  const redirecionar = (destino) => new Response(null, {
    status: 302, headers: { ...cabecalhosLeads, Location: destino },
  })
  const voltar = (motivo) => redirecionar(`/vs-gratis?link=${motivo}`)
  const token = new URL(req.url).searchParams.get('t') || ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return voltar('vencido')
  if (!db) return erro('Download indisponível. Tente novamente mais tarde.', 503)
  try {
    const hash = await resumo(token)
    const motivo = await estadoTokenLead(db, hash)
    if (motivo) return voltar(motivo)
    const [caminho] = await arquivosDe('a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada')
    const link = caminho && await linkDeDownload(caminho, caminho.split('/').pop(), 300)
    if (!link) return erro('Arquivo indisponível. Tente novamente mais tarde.', 503)
    // Só gasta uma tentativa quando o B2 fornece um link; revalida após a espera.
    if (!(await consumirDownloadLead(db, hash))) return voltar(await estadoTokenLead(db, hash) || 'esgotado')
    return redirecionar(link)
  } catch (falha) {
    console.error('vs grátis download', falha?.message)
    return erro('Download indisponível. Tente novamente mais tarde.', 503)
  }
}

export async function marcarLeadComprou(db, email, teste, compraId) {
  if (!db || teste) return
  await executar(db, `UPDATE leads SET comprou = 1,
    comprou_em = COALESCE(comprou_em, datetime('now')), proximo_email_em = NULL, proximo_whatsapp_em = NULL,
    encerrado_motivo = CASE WHEN encerrado_em IS NULL THEN 'comprou' ELSE encerrado_motivo END,
    encerrado_em = COALESCE(encerrado_em, datetime('now'))
    WHERE email = ? AND EXISTS (SELECT 1 FROM compras
      WHERE stripe_session_id = ? AND status = 'pago' AND teste = 0 LIMIT 1)`,
  normalizarEmail(email), compraId)
}
