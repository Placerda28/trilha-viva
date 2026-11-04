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

// d: { para, nome, mes, vendas, nivel, base, bonus, total, disponivel }
export function montarResumoFechamento(d, env) {
  const mes = nomeDoMes(d.mes)
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  return {
    titulo: `Fechamento de ${mes}: você ganhou ${reais(d.total)}`,
    ...montar(env, d.para, `Fechamento de ${mes}: você ganhou ${reais(d.total)} — Trilha Viva`,
      `Fechamento de ${mes}: você ganhou ${reais(d.total)}`,
      [saudacao,
        `Vendas válidas no mês: ${d.vendas}. Nível: ${d.nivel || 'sem nível'}.`,
        `Comissão base: ${reais(d.base)}. Bônus de nível: ${reais(d.bonus)}. Total do mês: ${reais(d.total)}.`,
        `Saldo disponível para saque agora: ${reais(d.disponivel)}.`],
      'Abrir minha área'),
  }
}

// d: { para, nome, mes, vendas, faltam, proximo }
export function montarFaltamVendas(d, env) {
  const plural = d.faltam === 1 ? 'venda' : 'vendas'
  const titulo = `Faltam ${d.faltam} ${plural} para o nível ${d.proximo}`
  const saudacao = d.nome ? `Olá, ${d.nome}!` : 'Olá!'
  return {
    titulo,
    ...montar(env, d.para, `${titulo} — Trilha Viva`, titulo,
      [saudacao,
        `Você tem ${d.vendas} ${d.vendas === 1 ? 'venda' : 'vendas'} em ${nomeDoMes(d.mes)}. Com mais ${d.faltam} ${plural} até o fim do mês, todas as vendas do mês passam a valer o valor do nível ${d.proximo}.`],
      'Ver meu mês'),
  }
}
