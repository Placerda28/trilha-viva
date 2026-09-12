import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Esqueci minha senha',
  description: 'Receba um link para escolher uma nova senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/recuperar' },
}

export default function RecuperarPage() {
  return (
    <div className="shell max-w-md pb-24 pt-14">
      <h1 className="font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">
        Esqueci minha senha
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Informe o e-mail da compra. Enviamos um link para você escolher uma nova senha.
      </p>

      <div className="card-cut mt-8 bg-white px-6 py-7">
        <ContaForm modo="recuperar" />
      </div>

      <p className="mt-7 text-[13.5px] leading-relaxed text-ink-muted">
        Lembrou a senha?{' '}
        <a href="/entrar" className="link-signal font-semibold">
          Voltar para a entrada
        </a>
        .
      </p>
    </div>
  )
}
