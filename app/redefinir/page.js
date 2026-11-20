import AcessoLayout from '@/components/acesso/AcessoLayout'
import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Escolher nova senha',
  description: 'Defina a nova senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/redefinir' },
}

export default function RedefinirPage() {
  return (
    <AcessoLayout>
      <ContaForm modo="redefinir" />
    </AcessoLayout>
  )
}
