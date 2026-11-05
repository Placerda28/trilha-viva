import Link from 'next/link'
import Icone from '../../Icone'
import { linkSeguro, rotuloDoLink } from '../painelUtil'

// Um alerta: o texto que o servidor montou (nunca traz CPF, celular nem Pix),
// o botão que leva ao lugar de resolver e o "Marcar como resolvido". Alerta de
// gravidade alta leva o fio vermelho na borda; o texto fica em preto.
export default function AlertaLinha({ alerta: a, alta, aoResolver }) {
  const link = linkSeguro(a.link)
  return (
    <li className="relative px-4 py-4 sm:px-5 md:flex md:items-center md:justify-between md:gap-6">
      {alta && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-signal" />}
      <div className="flex min-w-0 items-start gap-3">
        <Icone nome="alerta" tamanho={20} className={'mt-0.5 shrink-0 ' + (alta ? 'text-signal-deep' : 'text-ink-muted')} />
        <p className="break-words text-[15px] leading-snug text-ink">{a.texto}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-8 md:mt-0 md:shrink-0 md:pl-0">
        <Link href={link} prefetch={false} className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px]">
          {rotuloDoLink(link)}
        </Link>
        <button type="button" onClick={() => aoResolver(a)} className="btn-ink min-h-11 !px-4 !py-2.5 !text-[14px]">
          Marcar como resolvido
        </button>
      </div>
    </li>
  )
}
