import { escapeHtml } from './safe.js'
import { linkDescadastroLead } from './descadastro.js'

const OFERTA = { preco: 'R$ 89,90', anterior: 'R$ 899,00' }
// Seleção de destaques do catálogo, sem carregar o acervo inteiro no cadastro.
export const musicasLead = [
  ['ousado-amor-vigilia-dos-asafes', 'Ousado Amor — Vigília dos Asafes'],
  ['bondade-de-deus-isaias-saad', 'Bondade de Deus — Isaias Saad'],
  ['lugar-secreto-gabriela-rocha', 'Lugar Secreto — Gabriela Rocha'],
  ['grandes-coisas-fernandinho', 'Grandes Coisas — Fernandinho'],
  ['so-tu-es-santo-morada', 'Só Tu És Santo — Morada'],
]

export async function montarEmailLead(lead, env, etapa, download = '') {
  const site = String(env.SITE_URL || 'https://trilhaviva.org').replace(/\/+$/, '')
  const cancelamento = await linkDescadastroLead(lead.email, env.LEMBRETE_SEGREDO)
  if (!cancelamento) throw new Error('Segredo de descadastro de lead não configurado.')
  const descadastro = site + cancelamento
  const guia = site + '/como-usar'
  const compra = `${site}/assinar?utm_source=email&utm_medium=lead&utm_campaign=vs-gratis-${etapa}`
  const oferta = `O acervo completo sai de ${OFERTA.anterior} por ${OFERTA.preco}, em pagamento único, com acesso vitalício e garantia de 7 dias.`
  const modelos = {
    1: {
      assunto: 'Sua VS grátis chegou 🎧',
      paragrafos: [
        download ? 'Sua VS está pronta para baixar. O link vale por 7 dias e permite até 3 downloads.'
          : 'Seu download está em /vs-gratis. Se perdeu o link, peça de novo lá. O novo link vale por 7 dias e permite até 3 downloads.',
        '1. Baixe o arquivo e extraia a pasta com os canais.',
        '2. Abra os canais no programa que você usa para tocar VS, todos no mesmo ponto de início.',
        '3. Mande o clique e a guia só para os fones da banda, e os instrumentos para o som da igreja (PA).',
      ],
      botao: download ? 'Baixar minha VS grátis' : 'Pedir novo link',
      link: download || site + '/vs-gratis',
    },
    2: {
      assunto: 'Conseguiu rodar a VS?',
      paragrafos: [
        'Deu certo tocar a VS com a banda?',
        'Separe as saídas: clique e guia vão só para os fones de quem toca. Os instrumentos vão para o som da igreja (PA), sem clique nem voz de guia para o público.',
        'Antes do ensaio, confira cada saída com o volume baixo. O passo a passo abaixo mostra como montar tudo.',
        'Travou em alguma parte? Responda este e-mail e conte onde parou.',
      ],
      botao: 'Ver como usar', link: guia,
    },
    3: {
      assunto: 'Imagina ter 2.000 dessas',
      paragrafos: [
        'Gostou de ensaiar com a VS? Na Trilha Viva você encontra mais de 2.000 multitracks gospel para preparar o repertório da sua igreja.',
        oferta,
        'Veja cinco músicas do acervo que você pode levar para o próximo ensaio:',
      ],
      botao: 'Quero o acervo completo', link: compra,
    },
    4: {
      assunto: 'Último lembrete: seu link vence hoje',
      paragrafos: [
        'O link de download do primeiro e-mail vence hoje. Se precisar de outro, peça um novo na página da VS grátis.',
        oferta,
        'Este é o último e-mail desta sequência. Obrigado por testar a VS com a gente!',
      ],
      botao: 'Pedir novo link', link: site + '/vs-gratis',
    },
  }
  const modelo = modelos[etapa]
  if (!modelo) throw new Error('Etapa de e-mail de lead inválida.')
  const saudacao = lead.nome ? `Olá, ${lead.nome}!` : 'Olá!'
  const links = etapa === 3 ? musicasLead.map(([slug, titulo]) => [titulo, `${site}/musicas/${slug}`])
    : etapa === 1 ? [['Veja o passo a passo', guia]] : etapa === 4 ? [['Conhecer o acervo completo', compra]] : []
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F3F5;color:#0D0D0D;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #E0E2E6"><tr><td style="padding:32px;line-height:1.6">
    <h1 style="font-size:24px">${escapeHtml(saudacao)}</h1>
    ${modelo.paragrafos.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
    ${links.map(([titulo, url]) => `<p><a href="${escapeHtml(url)}" style="color:#C40F24">${escapeHtml(titulo)}</a></p>`).join('')}
    <p><a href="${escapeHtml(modelo.link)}" style="display:inline-block;background:#C40F24;color:#fff;padding:15px 22px;text-decoration:none;font-weight:700">${modelo.botao}</a></p>
    <p style="border-top:1px solid #E0E2E6;padding-top:20px;font-size:12px;color:#5C5C5C">Não quer mais receber? <a href="${escapeHtml(descadastro)}">Cancelar e-mails da VS grátis</a></p>
    </td></tr></table></td></tr></table></body></html>`
  return {
    from: env.EMAIL_FROM, to: [lead.email], reply_to: env.EMAIL_REPLY_TO,
    subject: modelo.assunto, html,
    text: [saudacao, ...modelo.paragrafos, ...links.map(([titulo, url]) => `${titulo}: ${url}`),
      `${modelo.botao}: ${modelo.link}`, `Não quer mais receber? Cancelar e-mails da VS grátis: ${descadastro}`].join('\n\n'),
    headers: { 'List-Unsubscribe': `<${descadastro}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}
