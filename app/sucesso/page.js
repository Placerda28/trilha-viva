import { Suspense } from 'react'
import AccessPanel from '@/components/AccessPanel'
import ConvitePalco from '@/components/ConvitePalco'
import { PaginaSucesso, TITULO_SUCESSO } from '@/components/sucesso/Pecas'
import { PALCO_DATA_LANCAMENTO, palcoEstado } from '@/lib/palco'

export const metadata = {
  title: 'Acesso liberado',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Compra concluída (MUDANÇAS §5). A conferência do pagamento e os estados
// (aprovado com ou sem conta, Pix pendente, recusado) estão em AccessPanel.
// O convite do Palco é montado aqui porque a chave do Palco só se lê no servidor.
export default function SucessoPage() {
  const convite = (
    <ConvitePalco
      variante="sucesso"
      palco={palcoEstado()}
      usuario="com-pacote"
      lancamento={PALCO_DATA_LANCAMENTO}
    />
  )
  return (
    <Suspense
      fallback={
        <PaginaSucesso>
          <h1 className={TITULO_SUCESSO}>Confirmando seu pagamento…</h1>
        </PaginaSucesso>
      }
    >
      <AccessPanel convite={convite} />
    </Suspense>
  )
}
