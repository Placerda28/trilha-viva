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
      <h1 className="mt-8 font-display text-[34px] font-normal leading-[1.12] text-ink sm:text-[44px]">
        Política de privacidade
      </h1>
      <div className="prose-tv pb-8">
        <h2>Quais dados coletamos</h2>
        <ul>
          <li>Nome e e-mail informados no checkout, para enviar o acesso e dar suporte.</li>
          <li>
            Dados da transação (valor, data, status) fornecidos pela Stripe. Não recebemos nem
            armazenamos números de cartão.
          </li>
        </ul>
        <h2>Para que usamos</h2>
        <p>
          Exclusivamente para entregar o acervo comprado, prestar suporte e comunicar novidades do
          próprio acervo. Não vendemos e não compartilhamos seus dados com terceiros para fins
          publicitários.
        </p>
        <h2>Pagamentos</h2>
        <p>
          O processamento é feito pela Stripe, em ambiente próprio e criptografado. A política de
          privacidade da Stripe se aplica à etapa de pagamento.
        </p>
        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
          escrevendo para {site.email}. Atendemos em até 15 dias.
        </p>
        <h2>Cookies</h2>
        <p>
          O site usa apenas o essencial para funcionar. Não utilizamos cookies de publicidade
          direcionada.
        </p>
      </div>
    </div>
  )
}
