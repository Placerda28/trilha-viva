import AcessoLayout from '@/components/acesso/AcessoLayout'
import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Entrar na sua conta',
  description: 'Acesse o acervo Trilha Viva com o e-mail da sua compra.',
  // Tela de conta não entra no Google: não traz visitante e só polui a busca.
  robots: { index: false, follow: false },
  alternates: { canonical: '/entrar' },
}

export default function EntrarPage() {
  return (
    <AcessoLayout>
      <ContaForm modo="entrar" />
    </AcessoLayout>
  )
}
