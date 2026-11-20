// Links do pé das telas de conta.
const LINK = 'inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-[3px]'

export default function Rodape({ modo }) {
  if (modo === 'entrar') {
    return (
      <div className="flex flex-col border-t border-line pt-3 text-[15px] text-text-2">
        <p className="flex flex-wrap items-center gap-x-1.5">
          Comprou e ainda não tem senha?{' '}
          <a href="/primeiro-acesso" className={LINK}>
            Fazer o primeiro acesso
          </a>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5">
          Ainda não tem o pacote?{' '}
          <a href="/assinar" className={LINK}>
            Liberar as 2.000 VS
          </a>
        </p>
      </div>
    )
  }
  if (modo === 'redefinir') {
    return (
      <p className="border-t border-line pt-3 text-[15px] text-text-2">
        O link vence em 1 hora e vale uma vez só. Se ele não funcionar mais,{' '}
        <a href="/recuperar" className={LINK}>
          peça outro
        </a>
        .
      </p>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 border-t border-line pt-3 text-[15px] text-text-2">
      {modo === 'criar' ? 'Já criou a senha antes?' : 'Já tem senha?'}{' '}
      <a href="/entrar" className={LINK}>
        Entrar
      </a>
    </p>
  )
}
