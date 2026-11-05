// E-mails do programa de afiliados enviados pelo robô (resumo do fechamento e "faltam X vendas").
// Sem `@/`: o robô importa lib/ por caminho relativo. Nome sempre com escapeHtml; sem cópia oculta.
import { escapeHtml, safeUrl } from './safe.js'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const reais = (c) => 'R$ ' + (Number(c) / 100).toFixed(2).replace('.', ',')
export const nomeDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`

function moldura({ titulo, paragrafos, botao, link }) {
  const url = safeUrl(link)
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F3F5;color:#0D0D0D;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #E0E2E6"><tr><td style="padding:32px;line-height:1.6">
    <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a;font-weight:700">Trilha Viva · Multitracks Gospel</p>
    <h1 style="font-size:24px">${escapeHtml(titulo)}</h1>
    ${paragrafos.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
    <p><a href="${url}" style="display:inline-block;background:#C40F24;color:#fff;padding:15px 22px;text-decoration:none;font-weight:700">${escapeHtml(botao)}</a></p>
    <p style="border-top:1px solid #E0E2E6;padding-top:20px;font-size:12px;color:#5C5C5C">Dúvidas? Responda este e-mail. Trilha Viva · trilhaviva.org</p>
    </td></tr></table></td></tr></table></body></html>`
}

function montar(env, para, assunto, titulo, paragrafos, botao) {
  const site = String(env.SITE_URL || 'https://trilhaviva.org').replace(/\/+$/, '')
  const link = site + '/minha-conta/afiliado'
  return {
    from: env.EMAIL_FROM, to: [para], reply_to: env.EMAIL_REPLY_TO, subject: assunto,
    html: moldura({ titulo, paragrafos, botao, link }),
    text: [titulo, ...paragrafos, `${botao}: ${link}`, 'Dúvidas? Responda este e-mail. Trilha Viva · trilhaviva.org'].join('\n\n'),
  }
}

const nomeMes = (mes) => MESES[Number(mes.slice(5, 7)) - 1]
const vendasTxt = (n) => `${n} ${n === 1 ? 'venda' : 'vendas'}`

// d: { para, nome, mes, vendas, nivel, total, disponivel }. Sem base nem bônus: o afiliado vê um valor só, o total do mês.
export function montarResumoFechamento(d, env) {
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  const titulo = `Seu mês de ${nomeMes(d.mes)} fechou: ${vendasTxt(d.vendas)}${d.nivel ? `, nível ${d.nivel}` : ''}, ${reais(d.total)} disponível para saque`
  const paragrafos = [saudacao, `${titulo}.`]
  if (Number(d.disponivel) !== Number(d.total)) paragrafos.push(`Somando o que você já tinha, o saldo disponível para saque agora é ${reais(d.disponivel)}.`)
  paragrafos.push('O saque pode ser pedido uma vez por mês, na sua área, de uma vez com todo o saldo disponível.')
  return { titulo, ...montar(env, d.para, `${titulo} — Trilha Viva`, `Seu mês de ${nomeMes(d.mes)} fechou`, paragrafos, 'Abrir minha área') }
}

// d: { para, nome, mes, vendas, faltam, proximo, valorHoje?, valorSeBater? }
export function montarFaltamVendas(d, env) {
  const plural = d.faltam === 1 ? 'venda' : 'vendas'
  const titulo = `Faltam ${d.faltam} ${plural} para o nível ${d.proximo}`
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  const paragrafos = [
    saudacao,
    `Você tem ${vendasTxt(d.vendas)} em ${nomeDoMes(d.mes)}. Com mais ${d.faltam} ${plural} até o fim do mês, todas as vendas do mês passam a valer o valor do nível ${d.proximo}.`,
  ]
  if (d.valorHoje != null && d.valorSeBater != null) {
    paragrafos.push(`Hoje seu mês vale ${reais(d.valorHoje)}. Batendo a meta, passa a valer ${reais(d.valorSeBater)}.`)
  }
  return { titulo, ...montar(env, d.para, `${titulo} — Trilha Viva`, titulo, paragrafos, 'Ver meu mês') }
}

// d: { para, nome, valor, pagoEm ('DD/MM/AAAA'), comprovanteUrl, comprovanteNome }
// O comprovante vai como anexo por URL (Resend baixa do link assinado): o Worker não carrega o arquivo.
export function montarSaquePago(d, env) {
  const titulo = `Seu saque de ${reais(d.valor)} foi pago`
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  const email = montar(env, d.para, `${titulo} — Trilha Viva`, titulo,
    [saudacao,
      `Pagamos ${reais(d.valor)} na sua chave Pix em ${d.pagoEm}.`,
      'O comprovante do pagamento está em anexo neste e-mail e também na aba Saques da sua área.'],
    'Abrir minha área')
  if (d.comprovanteUrl) email.attachments = [{ filename: d.comprovanteNome || 'comprovante.pdf', path: d.comprovanteUrl }]
  return { titulo, ...email }
}

// d: { para, nome, valor, motivo }
export function montarSaqueRecusado(d, env) {
  const titulo = `Seu saque de ${reais(d.valor)} foi recusado`
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  return {
    titulo,
    ...montar(env, d.para, `${titulo} — Trilha Viva`, titulo,
      [saudacao, `Motivo: ${d.motivo}`, 'Os valores voltaram ao seu saldo. Corrija o que for preciso e peça o saque de novo quando quiser.'],
      'Abrir minha área'),
  }
}

// d: { para, nome, codigo }. O código só registra as vendas: ninguém ganha desconto.
export function montarAfiliadoAprovado(d, env) {
  const site = String(env.SITE_URL || 'https://trilhaviva.org').replace(/\/+$/, '')
  const titulo = 'Seu cadastro de afiliado foi aprovado'
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  return {
    titulo,
    ...montar(env, d.para, `${titulo} — Trilha Viva`, titulo,
      [saudacao,
        `Seu código é ${d.codigo}. Seu link de divulgação: ${site}/?ref=${d.codigo}`,
        'O código só registra as suas vendas: quem compra paga o preço normal, sem desconto. Você já pode divulgar e acompanhar tudo na sua área.'],
      'Abrir minha área'),
  }
}
