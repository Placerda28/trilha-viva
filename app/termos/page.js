import { Breadcrumbs } from '@/components/ui'
import { site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Termos de uso',
  description: 'Condições de uso do acervo Trilha Viva — Multitracks Gospel.',
  alternates: { canonical: '/termos' },
}

export default function TermosPage() {
  return (
    <div className="shell max-w-3xl pt-12">
      <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Termos de uso' }]} />
      <h1 className="mt-8 font-bold text-[34px] leading-[1.12] text-ink sm:text-[44px]">
        Termos de uso
      </h1>
      <div className="prose-tv pb-8">
        <h2>1. O que você está adquirindo</h2>
        <p>
          O acesso ao acervo Trilha Viva dá direito ao uso do material de multitracks (VS)
          disponibilizado, mediante pagamento único de {priceBRL(site.price)}, com acesso por prazo
          indeterminado enquanto o serviço existir.
        </p>
        <h2>2. Uso permitido</h2>
        <p>
          O material pode ser usado por você e pela sua equipe de louvor em cultos, ensaios, eventos
          da sua igreja e transmissões do seu ministério.
        </p>
        <h2>3. Uso não permitido</h2>
        <ul>
          <li>Revender, sublicenciar ou distribuir o acervo, no todo ou em parte.</li>
          <li>Compartilhar o link de acesso publicamente ou em grupos abertos.</li>
          <li>Publicar os arquivos em outros serviços de armazenamento para terceiros.</li>
        </ul>
        <p>
          O acesso pode ser bloqueado, sem reembolso, quando houver distribuição indevida
          comprovada.
        </p>
        <h2>4. Direitos autorais das obras</h2>
        <p>
          Os títulos e nomes de artistas são citados apenas para identificar a versão instrumental
          correspondente. A Trilha Viva não é afiliada aos artistas, gravadoras ou editoras
          mencionadas. A execução pública de obras musicais em cultos e eventos pode estar sujeita a
          obrigações próprias perante os órgãos de arrecadação, de responsabilidade de quem realiza
          a execução.
        </p>
        <h2>5. Garantia e reembolso</h2>
        <p>
          Você pode solicitar o reembolso integral em até 7 dias corridos a contar da compra,
          conforme o artigo 49 do Código de Defesa do Consumidor. Basta responder o e-mail da
          compra.
        </p>
        <h2>6. Disponibilidade</h2>
        <p>
          O acervo é entregue por meio de armazenamento em nuvem. Interrupções pontuais do provedor
          podem ocorrer; nesses casos, restabelecemos o acesso o mais rápido possível.
        </p>
        <h2>7. Contato</h2>
        <p>Dúvidas sobre estes termos: {site.email}.</p>
      </div>
    </div>
  )
}
