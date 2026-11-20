import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import TextoLegal from '@/components/catalogo/TextoLegal'
import { PALCO_LANCADO, PALCO_PRECO_MENSAL } from '@/lib/palco'
import { OG_IMAGEM, site, priceBRL } from '@/lib/site'

const title = 'Termos de uso'
const description = 'Condições de uso do acervo Trilha Viva — Multitracks Gospel.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/termos' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/termos` },
}

// Data da última mudança no texto (commit de 22/10/2026). Ao mexer em qualquer
// seção, atualize aqui.
const ATUALIZADO = '22/10/2026'

const secoes = [
  {
    id: 'o-que-voce-adquire',
    titulo: '1. O que você está adquirindo',
    corpo: (
      <p>
        O acesso ao acervo Trilha Viva dá direito ao uso do material de multitracks (VS)
        disponibilizado, mediante pagamento único de {priceBRL(site.price)}, com acesso por prazo
        indeterminado enquanto o serviço existir.
      </p>
    ),
  },
  {
    id: 'uso-permitido',
    titulo: '2. Uso permitido',
    corpo: (
      <p>
        O material pode ser usado por você e pela sua equipe de louvor em cultos, ensaios, eventos
        da sua igreja e transmissões do seu ministério.
      </p>
    ),
  },
  {
    id: 'uso-nao-permitido',
    titulo: '3. Uso não permitido',
    corpo: (
      <>
        <ul>
          <li>Revender, sublicenciar ou distribuir o acervo, no todo ou em parte.</li>
          <li>Compartilhar o link de acesso publicamente ou em grupos abertos.</li>
          <li>Publicar os arquivos em outros serviços de armazenamento para terceiros.</li>
        </ul>
        <p>
          O acesso pode ser bloqueado, sem reembolso, quando houver distribuição indevida
          comprovada.
        </p>
      </>
    ),
  },
  {
    id: 'direitos-autorais',
    titulo: '4. Direitos autorais das obras',
    corpo: (
      <p>
        Os títulos e nomes de artistas são citados apenas para identificar a versão instrumental
        correspondente. A Trilha Viva não é afiliada aos artistas, gravadoras ou editoras
        mencionadas. A execução pública de obras musicais em cultos e eventos pode estar sujeita a
        obrigações próprias perante os órgãos de arrecadação, de responsabilidade de quem realiza
        a execução.
      </p>
    ),
  },
  {
    id: 'garantia-e-reembolso',
    titulo: '5. Garantia e reembolso',
    corpo: (
      <p>
        Você pode solicitar o reembolso integral em até 7 dias corridos a contar da compra,
        conforme o artigo 49 do Código de Defesa do Consumidor. Basta responder o e-mail da
        compra.
      </p>
    ),
  },
  {
    id: 'disponibilidade',
    titulo: '6. Disponibilidade',
    corpo: (
      <p>
        O acervo é entregue por meio de armazenamento em nuvem. Interrupções pontuais do provedor
        podem ocorrer; nesses casos, restabelecemos o acesso o mais rápido possível.
      </p>
    ),
  },
  {
    id: 'contato',
    titulo: '7. Contato',
    corpo: <p>Dúvidas sobre estes termos: {site.email}.</p>,
  },
  // Só depois do lançamento do Palco (PALCO_LANCADO). Resumo das condições do
  // MUDANÇAS §14, com os números do próprio site: o texto jurídico final precisa
  // da revisão do Paulo antes de ligar a chave.
  ...(PALCO_LANCADO
    ? [
        {
          id: 'assinatura-do-palco',
          titulo: '8. Assinatura do Palco',
          corpo: (
            <p>
              O Palco, programa da Trilha Viva para tocar VS no culto, é uma assinatura mensal de {PALCO_PRECO_MENSAL},
              cobrada no cartão. Quem tem o pacote testa por 7 dias grátis; quem não tem, por 3 dias. Você pode cancelar
              quando quiser e continua com o acesso até o fim do período já pago. Cada conta pode usar o Palco em até 2
              computadores. A assinatura é separada do pacote de {priceBRL(site.price)}, que continua sendo pagamento
              único.
            </p>
          ),
        },
      ]
    : []),
]

export default function TermosPage() {
  return (
    <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
      <CabecaPagina
        migalhas={[{ href: '/', label: 'Início' }, { label: 'Termos de uso' }]}
        titulo="Termos de uso"
        intro={`As regras de uso do site e do pacote 2.000 VS${PALCO_LANCADO ? ' e do Palco' : ''}.`}
        grande
      />
      <TextoLegal secoes={secoes} atualizado={ATUALIZADO} />
    </Pagina>
  )
}
