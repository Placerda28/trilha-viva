// Moldura da área do cliente (MUDANÇAS §7): menu de 260 px à esquerda no
// computador (a partir de `nav:`, 1080 px) e a barra "Minha conta · página ▾"
// no topo no celular. O fundo é branco de ponta a ponta: `data-rodape-colado`
// faz o rodapé encostar nele.
//
//   <ContaChrome menu={<MenuContaAuto … />}>{página}</ContaChrome>
//
// O `container-type` é o que dá sentido ao `cqi` do título (TituloConta).
export default function ContaChrome({ menu, children }) {
  return (
    <div data-rodape-colado className="bg-white text-ink [container-type:inline-size]">
      <div className="mx-auto flex max-w-[1280px] flex-col nav:flex-row nav:items-start nav:px-8 nav:pb-24 nav:pt-10">
        <div className="w-full nav:sticky nav:top-24 nav:max-h-[calc(100vh-7rem)] nav:w-[260px] nav:shrink-0 nav:overflow-y-auto nav:pr-6">
          {menu}
        </div>
        <div className="min-w-0 flex-1 px-4 pb-16 pt-6 nav:pb-0 nav:pl-8 nav:pr-0 nav:pt-0">{children}</div>
      </div>
    </div>
  )
}
