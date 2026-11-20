import AcessoLayout from '@/components/acesso/AcessoLayout'
import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Esqueci minha senha',
  description: 'Receba um link para escolher uma nova senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/recuperar' },
}

export default function RecuperarPage() {
  return (
    <AcessoLayout>
      <ContaForm modo="recuperar" />
    </AcessoLayout>
  )
}
