// Página de texto legal (/termos, /privacidade): índice à esquerda com os
// títulos das seções e o texto à direita. O texto de cada seção é o que já
// estava no ar, sem mudança; este componente só dá a moldura e o estilo.
//
//   secoes: [{ id, titulo, corpo: <p>…</p> }]
//   atualizado: "22/10/2026" (data da última mudança no texto)
const TEXTO =
  'flex flex-col gap-3 text-[17px] leading-[1.65] text-text-2 ' +
  '[&_strong]:font-semibold [&_strong]:text-ink ' +
  '[&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-[22px] ' +
  '[&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4'

export default function TextoLegal({ secoes, atualizado }) {
  return (
    <div className="flex flex-wrap items-start gap-x-14 gap-y-6">
      <nav aria-label="Seções" className="flex flex-[0_1_260px] flex-col border-t border-ink">
        {secoes.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex min-h-11 items-center border-b border-line py-1.5 text-[15px] underline-offset-4 hover:underline"
          >
            {s.titulo}
          </a>
        ))}
      </nav>
      <article className="flex max-w-[720px] flex-[1_1_420px] flex-col gap-8">
        <p className="text-[14px] text-text-3">Atualizado em {atualizado}</p>
        {secoes.map((s) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-3">
            <h2 className="font-semi-condensed text-[26px] font-[750] leading-[1.1]">{s.titulo}</h2>
            <div className={TEXTO}>{s.corpo}</div>
          </section>
        ))}
      </article>
    </div>
  )
}
