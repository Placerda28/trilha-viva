// Título de toda página da conta: h1 semicondensado e uma frase embaixo.
// `children` fica à direita (o contador de downloads, por exemplo).
export default function TituloConta({ titulo, subtitulo, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-semi-condensed text-[clamp(32px,4cqi,44px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {titulo}
        </h1>
        {subtitulo && <p className="text-[16px] leading-[1.5] text-text-2">{subtitulo}</p>}
      </div>
      {children}
    </div>
  )
}

// Subtítulo de seção (h2 de 20 px) usado em quase todas as páginas.
export function SecaoTitulo({ id, children, className = '' }) {
  return (
    <h2 id={id} className={`font-semi-condensed text-[20px] font-bold leading-tight ${className}`}>
      {children}
    </h2>
  )
}
