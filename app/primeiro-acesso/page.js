import AcessoLayout from '@/components/acesso/AcessoLayout'
import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Primeiro acesso',
  description: 'Comprou e ainda não criou a senha? Receba o link para criar a senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/primeiro-acesso' },
}

export default function PrimeiroAcessoPage() {
  return (
    <AcessoLayout>
      <ContaForm modo="primeiro" />
    </AcessoLayout>
  )
}
