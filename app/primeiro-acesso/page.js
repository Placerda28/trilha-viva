import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Primeiro acesso',
  description: 'Comprou e ainda não criou a senha? Receba o link para criar a senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/primeiro-acesso' },
}

export default function PrimeiroAcessoPage() {
  return (
    <div className="shell max-w-md pb-24 pt-14">
      <h1 className="font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">Primeiro acesso</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Comprou e ainda não criou sua senha? Informe o e-mail usado na compra. Enviamos um link para
        você criar a senha e abrir o acervo.
      </p>

      <div className="card-cut mt-8 bg-white px-6 py-7">
        <ContaForm modo="primeiro" />
      </div>

      <p className="mt-7 text-[13.5px] leading-relaxed text-ink-muted">
        Já criou a senha?{' '}
        <a href="/entrar" className="link-signal font-semibold">
          Entre por aqui
        </a>
        .
      </p>
    </div>
  )
}
