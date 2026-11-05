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

// E-mails mensais (etapas 5 a 8): 5 destaques reais do catálogo (lib/catalog.js, DESTAQUE) por e-mail, sem repetir.
export const musicasMensais = [
  [['so-tu-es-santo-morada', 'Só Tu És Santo — Morada'],
    ['yeshua-casa-worship', 'Yeshua — Casa Worship'],
    ['nada-alem-do-sangue-fernandinho', 'Nada Além do Sangue — Fernandinho'],
    ['raridade-anderson-freire', 'Raridade — Anderson Freire'],
    ['a-casa-e-sua-casa-worship', 'A Casa É Sua — Casa Worship']],
  [['caminho-no-deserto-fernandinho', 'Caminho no Deserto — Fernandinho'],
    ['deus-de-promessas-toque-no-altar', 'Deus de Promessas — Toque no Altar'],
    ['rendido-estou-aline-barros', 'Rendido Estou — Aline Barros'],
    ['ruja-o-leao-fhop-music', 'Ruja o Leão — FHOP Music'],
    ['atos-2-gabriela-rocha', 'Atos 2 — Gabriela Rocha']],
  [['me-atraiu-gabriela-rocha', 'Me Atraiu — Gabriela Rocha'],
    ['digno-e-o-cordeiro-diante-do-trono', 'Digno É o Cordeiro — Diante do Trono'],
    ['santo-eli-soares', 'Santo — Eli Soares'],
    ['holy-forever-bethel-music', 'Holy Forever — Bethel Music'],
    ['jireh-maverick-city', 'Jireh — Maverick City']],
  [['reckless-love-bethel-music', 'Reckless Love — Bethel Music'],
    ['preciso-de-ti-lagoinha-worship', 'Preciso de Ti — Lagoinha Worship'],
    ['tudo-e-teu-morada', 'Tudo É Teu — Morada'],
    ['galileu-fernandinho', 'Galileu — Fernandinho'],
    ['pai-nosso-bethel-music', 'Pai Nosso — Bethel Music']],
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
    5: {
      assunto: 'Cinco músicas para tocar neste mês',
      paragrafos: [
        'Faz um tempo que você baixou a VS grátis. Que tal levar mais músicas para o ensaio?',
        'Separamos cinco multitracks do acervo para você conhecer:',
        oferta,
      ],
      botao: 'Ver o acervo completo', link: compra,
    },
    6: {
      assunto: 'Como montar o repertório do mês',
      paragrafos: [
        'Montar o repertório com antecedência deixa o ensaio mais leve: escolha as músicas, confira o tom e separe quem toca o quê.',
        'Com os canais separados, cada músico ensaia a sua parte e o clique mantém a banda junta.',
        'Estas são cinco músicas que costumam entrar no repertório das igrejas:',
        oferta,
      ],
      botao: 'Quero o acervo completo', link: compra,
    },
    7: {
      assunto: 'Mais um mês, mais músicas para a sua banda',
      paragrafos: [
        'O acervo da Trilha Viva tem mais de 2.000 multitracks gospel, todas com clique e guia.',
        'Veja cinco sugestões para o próximo culto:',
        oferta,
      ],
      botao: 'Conhecer o acervo', link: compra,
    },
    8: {
      assunto: 'Última mensagem da Trilha Viva',
      paragrafos: [
        'Esta é a última mensagem da nossa sequência. Obrigado por ter experimentado a VS grátis.',
        oferta,
        'Se um dia precisar, o acervo continua aqui. Cinco músicas para começar:',
      ],
      botao: 'Conhecer o acervo completo', link: compra,
    },
  }
  const modelo = modelos[etapa]
  if (!modelo) throw new Error('Etapa de e-mail de lead inválida.')
  const saudacao = lead.nome ? `Olá, ${lead.nome}!` : 'Olá!'
  const links = etapa >= 5 ? musicasMensais[etapa - 5].map(([slug, titulo]) => [titulo, `${site}/musicas/${slug}`])
    : etapa === 3 ? musicasLead.map(([slug, titulo]) => [titulo, `${site}/musicas/${slug}`])
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
