import AcessoLayout from '@/components/acesso/AcessoLayout'
import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Criar sua senha',
  description: 'Crie a senha da sua conta e abra o acervo Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/criar-senha' },
}

export default function CriarSenhaPage() {
  return (
    <AcessoLayout>
      <ContaForm modo="criar" />
    </AcessoLayout>
  )
}
