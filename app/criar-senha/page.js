import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Criar sua senha',
  description: 'Crie a senha da sua conta e abra o acervo Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/criar-senha' },
}

export default function CriarSenhaPage() {
  return (
    <div className="shell max-w-md pb-24 pt-14">
      <h1 className="font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">
        Crie sua senha
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        É o último passo. A conta usa o e-mail da sua compra — por isso ele não aparece aqui para
        ser trocado.
      </p>

      <div className="card-cut mt-8 bg-white px-6 py-7">
        <ContaForm modo="criar" />
      </div>

      <p className="mt-7 text-[13.5px] leading-relaxed text-ink-muted">
        Já criou a senha antes?{' '}
        <a href="/entrar" className="link-signal font-semibold">
          Entre por aqui
        </a>
        .
      </p>
    </div>
  )
}
