import Link from 'next/link'

export const metadata = { title: 'Página não encontrada', robots: { index: false } }

export default function NotFound() {
  return (
    <div className="shell max-w-2xl py-28 text-center">
      <p className="text-[13px] font-semibold text-ink-muted">Erro 404</p>
      <h1 className="mt-5 font-bold text-[34px] leading-[1.12] text-ink sm:text-[44px]">
        Essa página saiu do setlist
      </h1>
      <p className="mt-4 text-[17px] leading-[1.6] text-ink-muted">
        O endereço não existe ou foi movido. Volte para o acervo e continue de onde parou.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/musicas" className="btn-ink">
          Ver o acervo
        </Link>
        <Link href="/" className="btn-quiet">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
