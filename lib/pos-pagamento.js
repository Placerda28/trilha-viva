// Regras da tela depois do pagamento (/sucesso), separadas da tela para
// poderem ser testadas sem navegador.

// A tela confere o pagamento a cada 3 segundos por até 3 minutos. No Pix a
// pessoa paga no app do banco e volta; o aviso do Mercado Pago costuma chegar
// em segundos, mas pode atrasar.
export const INTERVALO_MS = 3000
export const ESPERA_MAXIMA_MS = 3 * 60 * 1000
export const TENTATIVAS_MAXIMAS = Math.ceil(ESPERA_MAXIMA_MS / INTERVALO_MS)

// "paulo@gmail.com" vira "p***@gmail.com": a pessoa reconhece o próprio
// e-mail, e quem espiar a tela não lê o endereço inteiro.
export function mascararEmail(email) {
  const texto = String(email || '').trim()
  const arroba = texto.lastIndexOf('@')
  if (arroba < 1) return ''
  return texto.slice(0, 1) + '***' + texto.slice(arroba)
}

// O que a tela faz com a resposta de /api/acesso.
//   esperar   ainda pendente: consulta de novo em INTERVALO_MS
//   senha     pago e sem conta: mostra a criação de senha
//   entrar    pago e a pessoa já tem senha: vai para a entrada
//   esgotado  passou dos 3 minutos sem confirmar
//   recusado  o Mercado Pago recusou ou cancelou
//   erro      link inválido ou falha nossa
export function proximoPasso({ status, temConta } = {}, tentativas = 0) {
  if (status === 'paid') return temConta ? 'entrar' : 'senha'
  if (status === 'pending') return tentativas >= TENTATIVAS_MAXIMAS ? 'esgotado' : 'esperar'
  if (status === 'failed') return 'recusado'
  return 'erro'
}

// Chave usada para levar o e-mail da /sucesso até a /entrar sem pôr o
// endereço na barra (o Pixel da Meta lê o endereço da página).
export const CHAVE_EMAIL_ENTRAR = 'tv-email-entrar'
