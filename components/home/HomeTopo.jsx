import FundoFaixas from './FundoFaixas'
import TopoTexto from './TopoTexto'

// Topo escuro da home (MUDANÇAS §3, item 1): fundo de faixas de onda andando
// devagar, texto à esquerda e, só no computador, a foto da banda à direita.
// No celular não tem foto (decisão de 12/10/2026).
//
// A foto é a de 1536 px (banda-palco.webp), não a de 4K. Com display:none no
// celular e loading="lazy", o navegador nem baixa o arquivo ali.
export default function HomeTopo() {
  return (
    <section
      id="topo"
      aria-labelledby="h-topo"
      data-tema="escuro"
      className="relative overflow-hidden bg-ink text-white [container-type:inline-size]"
    >
      <FundoFaixas />
      <div className="grid lg:grid-cols-2">
        <TopoTexto />
        <div className="relative hidden min-h-[600px] lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/banda-palco.webp"
            width="1536"
            height="864"
            loading="lazy"
            decoding="async"
            alt="Equipe de louvor cantando no palco, com banda completa e luzes de show"
            className="absolute inset-0 block h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, #0D0D0D 0%, rgba(13,13,13,0) 35%)' }}
          />
        </div>
      </div>
    </section>
  )
}
