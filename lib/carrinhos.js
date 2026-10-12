import { executar, umaLinha } from './d1.js'

// A origem vai para uma coluna de diagnóstico, nunca para decidir preço ou acesso.
// Aceitar somente este alfabeto deixa o texto curto, previsível e sem separadores
// que poderiam confundir a leitura posterior.
function limparParteUtm(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 40)
}

export function limparUtm(utm) {
  const valor = utm && typeof utm === 'object' ? utm : {}
  return {
    source: limparParteUtm(valor.source),
    medium: limparParteUtm(valor.medium),
    campaign: limparParteUtm(valor.campaign),
    content: limparParteUtm(valor.content),
  }
}

export function nomeValido(nome) {
  const limpo = String(nome || '').trim()
  return limpo.length >= 1 && limpo.length <= 80
}

export function limparTelefone(valor) {
  let digitos = String(valor || '').replace(/[^0-9]/g, '')
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    digitos = digitos.slice(2)
  }
  return digitos
}

export function telefoneValido(valor) {
  return /^[1-9][0-9]{9,10}$/.test(limparTelefone(valor))
}

export function origemDoCarrinho({ utm, cupom } = {}) {
  const limpo = limparUtm(utm)
  const partes = []
  if (limpo.source || limpo.medium || limpo.campaign) {
    // Os hífens preservam a posição source/medium/campaign quando algum campo
    // vier vazio, sem guardar palavras adicionais na coluna.
    // content (ex.: "semana2", qual WhatsApp da sequência) só entra quando
    // existe, para o formato antigo continuar igual.
    partes.push(
      `utm=${limpo.source || '-'}/${limpo.medium || '-'}/${limpo.campaign || '-'}` +
        (limpo.content ? `/${limpo.content}` : '')
    )
  }

  const codigo = String(cupom || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40)
  if (codigo) partes.push(`cupom=${codigo}`)

  return partes.join(';').slice(0, 200)
}

function emailNormalizado(email) {
  return String(email || '').trim().toLowerCase()
}

export async function gravarCarrinho(
  db,
  { id, email, nome, telefone, origem, utm, fbp, fbc, ip, ua } = {}
) {
  const referencia = String(id || '').trim()
  const emailLimpo = emailNormalizado(email)
  if (!db || !referencia || !emailLimpo) return null
  const u = limparUtm(utm)
  const texto = (valor, max) => String(valor || '').trim().slice(0, max) || null

  // O id é a referência única enviada ao Mercado Pago. INSERT simples evita
  // esconder uma colisão improvável e deixa o checkout registrar a falha no log.
  // fbp/fbc/ip/ua: os identificadores da Meta de quem abriu o pagamento.
  return executar(
    db,
    `INSERT INTO carrinhos
       (id, email, nome, telefone, origem, fbp, fbc, ip, ua,
        utm_source, utm_medium, utm_campaign, utm_content, teste)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       EXISTS(SELECT 1 FROM contatos_teste
         WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?) LIMIT 1))`,
    referencia,
    emailLimpo,
    texto(nome, 80),
    limparTelefone(telefone) || null,
    texto(origem, 200),
    texto(fbp, 200),
    texto(fbc, 600),
    texto(ip, 64),
    texto(ua, 400),
    u.source || null,
    u.medium || null,
    u.campaign || null,
    u.content || null,
    emailLimpo,
    limparTelefone(telefone)
  )
}

export async function carrinhoParaPreencher(db, referencia) {
  if (!db || !referencia) return null

  // Sete dias limitam por quanto tempo o link do lembrete revela os dados usados
  // para preencher o formulário. LIMIT 1 mantém a consulta barata no Worker.
  return umaLinha(
    db,
    `SELECT nome, email, telefone
       FROM carrinhos
      WHERE id = ?
        AND criado_em >= datetime('now', '-7 days')
      LIMIT 1`,
    String(referencia)
  )
}

export async function marcarCarrinhosPagos(db, { referencia, email } = {}) {
  const referenciaLimpa = String(referencia || '').trim()
  const emailLimpo = emailNormalizado(email)
  if (!db || (!referenciaLimpa && !emailLimpo)) return null

  // O e-mail também fecha carrinhos antigos da mesma pessoa. Isso é necessário
  // para medir uma recuperação mesmo quando ela conclui por outra referência.
  return executar(
    db,
    `UPDATE carrinhos
        SET status = 'pago', pago_em = datetime('now')
      WHERE status <> 'pago'
        AND (id = ? OR email = ?)`,
    referenciaLimpa || null,
    emailLimpo || null
  )
}
