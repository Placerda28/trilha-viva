import { cn } from '@/lib/cn'

// Casca das páginas de catálogo e de conteúdo (redesenho): fundo branco de ponta
// a ponta, contêiner de largura máxima e o espaçamento do DESIGN.md. O
// `data-rodape-colado` faz o rodapé encostar na página em vez de deixar uma
// faixa cinza de 96 px entre os dois.
//
//   <Pagina>…</Pagina>                      catálogo (1280 px)
//   <Pagina largura={1080} espaco="…">      conteúdo (1080 px)
//
// `[container-type:inline-size]` é o que dá sentido às medidas em `cqi`. Ele
// prende elementos `position: fixed` aqui dentro: a barra de compra do celular
// fica FORA desta casca.
export default function Pagina({ largura = 1280, espaco = '24px', className, children }) {
  return (
    <div data-rodape-colado className="bg-white text-ink [container-type:inline-size]">
      <div
        className={cn(
          'mx-auto flex flex-col px-[clamp(16px,4cqi,32px)] pb-[clamp(56px,7cqi,96px)] pt-[clamp(16px,3cqi,32px)]',
          className
        )}
        style={{ maxWidth: largura, gap: espaco }}
      >
        {children}
      </div>
    </div>
  )
}
