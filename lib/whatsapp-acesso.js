// "Seu acesso está liberado" pelo WhatsApp, logo depois que o pagamento é
// confirmado. É a rede de segurança de quem fecha a tela do Mercado Pago sem
// voltar ao site: o botão da mensagem leva direto para a criação da senha.
//
// Mensagem fora de conversa aberta só sai por MODELO aprovado pela Meta
// (categoria Utilidade). Enquanto o modelo não for aprovado e a variável
// WA_ACESSO não for "ativo" no painel da Cloudflare, nada sai e o resto da
// compra segue igual. Sem imports com "@/": testável com node --test.
import { chamarMeta, configuracaoMeta, primeiroNome, telefoneComPais, telefoneSemPais } from './whatsapp-meta.js'

export const MODELO_ACESSO = 'acesso_liberado'

// O texto aqui tem que ser IGUAL ao modelo aprovado pelo Paulo (12/10/2026)
// e cadastrado na Meta. O rodapé "Trilha Viva" é fixo no modelo e não vai
// no pedido.
export function textoAcesso(nome) {
  return (
    'Olá, ' + (primeiroNome(nome) || 'tudo bem') + '! Seu pagamento foi confirmado e seu acesso à Trilha Viva está liberado. ' +
    'Toque no botão abaixo para criar sua senha e começar a baixar suas multitracks. ' +
    'Se o link vencer, use “Primeiro acesso” em trilhaviva.org/entrar.'
  )
}

export function acessoPorWhatsappLigado(env = {}) {
  return String(env.WA_ACESSO || '').trim().toLowerCase() === 'ativo' && configuracaoMeta(env).ok
}

// Botão de link com parte variável: no modelo o endereço é
// https://trilhaviva.org/criar-senha?t={{1}} e aqui vai só o código.
export function pedidoAcesso({ telefone, nome, token }, env = {}) {
  return {
    messaging_product: 'whatsapp',
    to: telefoneComPais(telefone),
    type: 'template',
    template: {
      name: String(env.WA_TEMPLATE_ACESSO || MODELO_ACESSO),
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: primeiroNome(nome) || 'tudo bem' }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(token || '') }] },
      ],
    },
  }
}

// Nunca estoura: o aviso do Mercado Pago não pode cair por causa do WhatsApp.
// Devolve 'enviado' | 'desligado' | 'pausado' | 'sem_telefone' | 'falhou'.
export async function enviarAcessoLiberado(env, db, { telefone, nome, token }, fetchImpl = globalThis.fetch) {
  try {
    if (!acessoPorWhatsappLigado(env)) return 'desligado'
    const numero = telefoneSemPais(telefone)
    if (!/^[1-9][0-9]{9,10}$/.test(numero) || !token) return 'sem_telefone'
    // A trava geral do WhatsApp (gestão > WhatsApp > pausar) vale aqui também.
    const estado = db
      ? await db.prepare('SELECT estado FROM whatsapp_estado WHERE id = 1 LIMIT 1').first().catch(() => null)
      : null
    if (estado?.estado === 'pausado') return 'pausado'
    const id = await chamarMeta(env, pedidoAcesso({ telefone: numero, nome, token }, env), fetchImpl)
    if (db) {
      // Fica na conversa da gestão, como as outras mensagens que saem.
      await db
        .prepare(
          `INSERT OR IGNORE INTO whatsapp_mensagens (wa_msg_id, telefone, direcao, texto, enviado_por)
           VALUES (?, ?, 'saida', ?, 'acesso_liberado')`
        )
        .bind(id, numero, textoAcesso(nome))
        .run()
        .catch((erro) => console.error('whatsapp acesso gravar', erro?.message))
    }
    return 'enviado'
  } catch (erro) {
    console.error('whatsapp acesso liberado', erro?.message || erro)
    return 'falhou'
  }
}
