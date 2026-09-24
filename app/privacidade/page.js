import { Breadcrumbs } from '@/components/ui'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Política de privacidade',
  description: 'Como a Trilha Viva trata os seus dados pessoais.',
  alternates: { canonical: '/privacidade' },
}

export default function PrivacidadePage() {
  return (
    <div className="shell max-w-3xl pt-12">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Privacidade' }]} />
      <h1 className="mt-8 font-bold text-[34px] leading-[1.12] text-ink sm:text-[44px]">
        Política de privacidade
      </h1>
      <div className="prose-tv pb-8">
        <h2>Quais dados coletamos</h2>
        <ul>
          <li>Nome e e-mail informados no checkout, para enviar o acesso e dar suporte.</li>
          <li>
            Dados da transação (valor, data, status) fornecidos pelo Mercado Pago. Não recebemos nem
            armazenamos números de cartão.
          </li>
        </ul>
        <h2>Para que usamos</h2>
        <p>
          Para entregar o acervo comprado, prestar suporte, comunicar novidades do próprio acervo e
          medir o resultado dos nossos anúncios. Não vendemos seus dados.
        </p>
        <h2>Anúncios e medição (Meta)</h2>
        <p>
          Usamos o Pixel da Meta e a API de Conversões da Meta (Facebook e Instagram) para saber
          quais anúncios trazem visitas e compras. Eles registram páginas visitadas, o início do
          pagamento e a compra concluída, junto com cookies da Meta, endereço IP e navegador. O
          e-mail da compra só é enviado criptografado (hash SHA-256), nunca em texto aberto. O
          tratamento pela Meta segue a política de privacidade dela. Você pode limitar anúncios
          personalizados nas configurações de anúncios da sua conta Meta ou bloqueando cookies de
          terceiros no navegador.
        </p>
        <h2>Pagamentos</h2>
        <p>
          O processamento é feito pelo Mercado Pago, em ambiente próprio e criptografado. A política
          de privacidade do Mercado Pago se aplica à etapa de pagamento.
        </p>
        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
          escrevendo para {site.email}. Atendemos em até 15 dias.
        </p>
        <h2>Cookies</h2>
        <p>
          O site usa cookies essenciais para funcionar (como o da sua sessão na conta) e os cookies
          da Meta descritos acima, para medir os anúncios.
        </p>
      </div>
    </div>
  )
}
