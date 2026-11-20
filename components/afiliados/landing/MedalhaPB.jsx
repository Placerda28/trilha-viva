// Medalha preto e branco do nível (DESIGN.md): círculo com 1, 2 ou 3 setas.
// Bronze = 1, Prata = 2, Ouro = 3. Sem cor de metal: o site é preto e branco e a
// seta conta o degrau. `grau` 0 = sem nível ainda (traço no lugar das setas).
//
//   clara     fundo branco, borda e setas pretas (sobre fundo claro)
//   escura    fundo preto, setas brancas (sobre fundo claro; o Ouro da escada)
//   sobrePreto fundo branco com borda branca (sobre painel preto)
//   vazada    só contorno branco e setas brancas (sobre painel preto)
//   vazia     contorno cinza tracejado (sem nível)
// `anel` desenha um fio preto por dentro da borda (a medalha grande do topo).
const VARIANTES = {
  clara: 'border-ink bg-white text-ink',
  escura: 'border-ink bg-ink text-white',
  sobrePreto: 'border-white bg-white text-ink',
  vazada: 'border-white text-white',
  vazia: 'border-dark-border text-dark-text-3',
}

// Uma seta por degrau, empilhadas e centradas (viewBox 24).
const setas = (grau) =>
  Array.from({ length: grau }, (_, i) => `M6 ${15 + (grau - 1) * 2.5 - i * 5}l6-6 6 6`).join('')

export default function MedalhaPB({ grau = 1, tamanho = 72, variante = 'clara', anel = false, titulo = '', className = '' }) {
  const vazia = grau <= 0
  const icone = Math.round(tamanho * (anel ? 0.5 : 0.44))
  return (
    <span
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : 'true'}
      style={{ width: tamanho, height: tamanho }}
      className={`relative box-border flex shrink-0 items-center justify-center rounded-full border ${VARIANTES[vazia ? 'vazia' : variante]} ${className}`}
    >
      {anel && <span aria-hidden="true" className="absolute inset-[6px] rounded-full border border-ink" />}
      <svg width={icone} height={icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" className="relative">
        <path d={vazia ? 'M7 12h10' : setas(grau)} />
      </svg>
    </span>
  )
}
