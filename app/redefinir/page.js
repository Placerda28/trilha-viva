import ContaForm from '@/components/ContaForm'

export const metadata = {
  title: 'Escolher nova senha',
  description: 'Defina a nova senha da sua conta Trilha Viva.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/redefinir' },
}

export default function RedefinirPage() {
  return (
    <div className="shell max-w-md pb-24 pt-14">
      <h1 className="font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">
        Escolher nova senha
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Escolha a nova senha. Ao salvar, quem estiver logado nesta conta em outros aparelhos será
        desconectado.
      </p>

      <div className="card-cut mt-8 bg-white px-6 py-7">
        <ContaForm modo="redefinir" />
      </div>

      <p className="mt-7 text-[13.5px] leading-relaxed text-ink-muted">
        O link vence em 1 hora e vale uma vez só. Se ele não funcionar mais,{' '}
        <a href="/recuperar" className="link-signal font-semibold">
          peça outro
        </a>
        .
      </p>
    </div>
  )
}
