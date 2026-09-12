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
    <div className="shell max-w-md pb-24 pt-14">
      <h1 className="font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">Entrar</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Use o e-mail que você informou na compra e a senha que criou depois do pagamento.
      </p>

      <div className="card-cut mt-8 bg-white px-6 py-7">
        <ContaForm modo="entrar" />
      </div>

      <p className="mt-7 text-[13.5px] leading-relaxed text-ink-muted">
        Ainda não tem acesso?{' '}
        <a href="/assinar" className="link-signal font-semibold">
          Conheça o acervo completo
        </a>
        .
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
        Comprou e não criou a senha? Procure o e-mail de confirmação — ele tem o link. Ou use
        &quot;Esqueci minha senha&quot; acima com o mesmo endereço.
      </p>
    </div>
  )
}
