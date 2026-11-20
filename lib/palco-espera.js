import { executar } from './d1.js'
import { normalizarEmail } from '@/lib/sessao'
import { mesmaOrigem } from './origem.js'
import { cabecalhosLeads, reservarCadastro, verificarTurnstile } from './leads.js'

// Lista de espera do Palco: e-mail + sistema (migrations/0029). Mesmo padrão do
// /api/vs-gratis: mesma origem, Turnstile, limite por IP (a tabela de tentativas
// é a dos leads) e resposta sempre { ok, erro }. Não envia e-mail. Quem já está
// na lista recebe a mesma resposta, para a rota não revelar quem se inscreveu.
export const SISTEMAS_PALCO = ['windows', 'mac', 'celular']

function erro(mensagem, status = 400) {
  return Response.json({ ok: false, erro: mensagem }, { status, headers: cabecalhosLeads })
}

export function validarEspera(corpo) {
  const c = corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo : {}
  const email = typeof c.email === 'string' ? normalizarEmail(c.email) : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Informe um e-mail válido.' }
  if (!SISTEMAS_PALCO.includes(c.sistema)) return { erro: 'Escolha onde você vai usar o Palco.' }
  if (c.turnstile != null && typeof c.turnstile !== 'string') return { erro: 'Dados do formulário inválidos.' }
  return { email, sistema: c.sistema }
}

export async function responderListaEspera(req, { db, segredo, ambiente, buscar = fetch } = {}) {
  if (!mesmaOrigem(req)) return erro('Origem do pedido inválida.', 403)
  let corpo
  try { corpo = await req.json() } catch { return erro('Envie um formulário válido.') }
  const dados = validarEspera(corpo)
  if (dados.erro) return erro(dados.erro)
  if (!db) return erro('A lista de espera está indisponível agora. Tente novamente mais tarde.', 503)
  const verificacao = await verificarTurnstile(req, corpo.turnstile, segredo, ambiente, buscar)
  if (verificacao) return verificacao
  const ip = (req.headers.get('cf-connecting-ip') || '').slice(0, 64)
  if (!ip && ambiente !== 'development') return erro('Não foi possível verificar sua conexão.', 503)
  try {
    if (!(await reservarCadastro(db, ip))) return erro('Limite de 5 pedidos por hora atingido. Tente mais tarde.', 429)
    await executar(db, 'INSERT INTO palco_lista_espera (email, sistema) VALUES (?, ?) ON CONFLICT(email, sistema) DO NOTHING',
      dados.email, dados.sistema)
    return Response.json({ ok: true }, { headers: cabecalhosLeads })
  } catch (falha) {
    // Inclui a tabela ainda não criada (migração não aplicada): a página segue de pé.
    console.error('palco lista de espera', falha?.message)
    return erro('Não foi possível entrar na lista agora. Tente novamente mais tarde.', 503)
  }
}
