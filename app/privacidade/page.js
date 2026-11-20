import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import TextoLegal from '@/components/catalogo/TextoLegal'
import { OG_IMAGEM, site } from '@/lib/site'

const title = 'Política de privacidade'
const description = 'Como a Trilha Viva trata os seus dados pessoais.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/privacidade' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/privacidade` },
}

// Data da última mudança no texto (commit de 10/11/2026). Ao mexer em qualquer
// seção, atualize aqui.
const ATUALIZADO = '10/11/2026'

// O texto de cada seção é o de antes do redesenho, sem mudança. O id
// "exclusao-de-dados" é âncora usada em outros lugares: não mudar.
const secoes = [
  {
    id: 'dados-que-coletamos',
    titulo: 'Quais dados coletamos',
    corpo: (
      <ul>
        <li>
          Nome, e-mail e WhatsApp informados no checkout, para enviar o acesso, dar suporte e
          lembrar de uma compra não concluída.
        </li>
        <li>
          Para facilitar uma próxima compra, seu nome, e-mail e WhatsApp podem ficar salvos apenas
          no seu próprio navegador. Você pode apagá-los a qualquer momento pelo link &quot;Não é
          você? Limpar&quot;.
        </li>
        <li>
          Dados da transação (valor, data, status) fornecidos pelo Mercado Pago. Não recebemos nem
          armazenamos números de cartão.
        </li>
      </ul>
    ),
  },
  {
    id: 'para-que-usamos',
    titulo: 'Para que usamos',
    corpo: (
      <p>
        Para entregar o acervo comprado, prestar suporte, comunicar novidades do próprio acervo e
        medir o resultado dos nossos anúncios. Não vendemos seus dados.
      </p>
    ),
  },
  {
    id: 'lembrete-de-compra',
    titulo: 'Lembrete de compra não concluída',
    corpo: (
      <p>
        Se a compra não for concluída, podemos enviar até <strong>quatro</strong> lembretes por
        e-mail com o link para terminar a compra: cerca de uma hora depois, uma semana depois, 15
        dias depois e 30 dias depois. Depois do quarto, não enviamos mais nada sobre essa compra, e
        paramos antes se você comprar. O WhatsApp informado pode receber até{' '}
        <strong>nove</strong> lembretes pela conta oficial da Trilha Viva: o primeiro cerca de três horas depois e
        os outros um por semana, das 9h às 20h. Paramos se você comprar, pedir para sair ou responder (aí quem
        responde é a nossa equipe). Para não receber, use o link &quot;Cancelar lembretes&quot; no próprio
        e-mail, toque em &quot;Não quero receber&quot; ou responda SAIR no WhatsApp, ou escreva para{' '}
        {site.email}. Pedir para sair em um canal encerra os lembretes nos dois.
      </p>
    ),
  },
  {
    id: 'vs-gratis',
    titulo: 'VS grátis',
    corpo: (
      <p>
        Quem pede a VS grátis informa nome, e-mail e WhatsApp e aceita receber a VS e conteúdos da
        Trilha Viva por e-mail e WhatsApp. Enviamos o link da VS na hora e, depois, até{' '}
        <strong>quatro</strong> mensagens pelo WhatsApp oficial da Trilha Viva (cerca de 5 minutos, 3, 5
        e 7 dias depois do pedido) e até <strong>oito</strong> e-mails (na hora, 3, 5 e 7 dias depois e
        mais um por mês durante quatro meses). Depois disso, paramos. Paramos antes se você comprar ou
        pedir para sair: use o link de descadastro do e-mail, toque em &quot;Não quero receber&quot; no
        WhatsApp ou escreva para {site.email}.
      </p>
    ),
  },
  {
    id: 'whatsapp',
    titulo: 'WhatsApp',
    corpo: (
      <p>
        As mensagens de WhatsApp da Trilha Viva são enviadas e recebidas pela plataforma
        WhatsApp Business, da Meta, que trata o número e o conteúdo das mensagens segundo a
        política de privacidade dela. Guardamos as mensagens trocadas com você para dar suporte e
        podemos apagá-las a pedido.
      </p>
    ),
  },
  {
    id: 'instagram',
    titulo: 'Instagram',
    corpo: (
      <p>
        Quando você nos envia uma mensagem pelo Instagram, guardamos a conversa para responder e acompanhar o seu atendimento.
      </p>
    ),
  },
  {
    id: 'anuncios-e-medicao',
    titulo: 'Anúncios e medição (Meta)',
    corpo: (
      <p>
        Usamos o Pixel da Meta e a API de Conversões da Meta (Facebook e Instagram) para saber
        quais anúncios trazem visitas e compras. Eles registram páginas visitadas, o início do
        pagamento e a compra concluída, junto com cookies da Meta, endereço IP e navegador. O
        e-mail, o telefone e o nome da compra só são enviados criptografados (hash SHA-256), nunca
        em texto aberto. Também guardamos a origem da visita (o link ou anúncio que trouxe você) e
        os identificadores da Meta do checkout, para medir quais anúncios vendem. O
        tratamento pela Meta segue a política de privacidade dela. Você pode limitar anúncios
        personalizados nas configurações de anúncios da sua conta Meta ou bloqueando cookies de
        terceiros no navegador.
      </p>
    ),
  },
  {
    id: 'pagamentos',
    titulo: 'Pagamentos',
    corpo: (
      <p>
        O processamento é feito pelo Mercado Pago, em ambiente próprio e criptografado. A política
        de privacidade do Mercado Pago se aplica à etapa de pagamento.
      </p>
    ),
  },
  {
    id: 'seus-direitos',
    titulo: 'Seus direitos (LGPD)',
    corpo: (
      <p>
        Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
        escrevendo para {site.email}. Atendemos em até 15 dias.
      </p>
    ),
  },
  {
    id: 'exclusao-de-dados',
    titulo: 'Como pedir a exclusão dos seus dados',
    corpo: (
      <p>
        Envie um e-mail para {site.email} com o assunto &quot;Excluir meus dados&quot;, a partir do
        e-mail usado na compra (ou informando o número de WhatsApp). Apagamos nome, e-mail,
        WhatsApp, carrinhos e mensagens em até 15 dias e confirmamos por e-mail. Os dados de
        compras pagas que a lei obriga a guardar (registros fiscais) ficam só pelo prazo legal.
      </p>
    ),
  },
  {
    id: 'cookies',
    titulo: 'Cookies',
    corpo: (
      <p>
        O site usa cookies essenciais para funcionar (como o da sua sessão na conta) e os cookies
        da Meta descritos acima, para medir os anúncios.
      </p>
    ),
  },
]

export default function PrivacidadePage() {
  return (
    <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
      <CabecaPagina
        migalhas={[{ href: '/', label: 'Início' }, { label: 'Privacidade' }]}
        titulo="Política de privacidade"
        intro="Quais dados guardamos, para quê e como pedir para apagar."
        grande
      />
      <TextoLegal secoes={secoes} atualizado={ATUALIZADO} />
    </Pagina>
  )
}
