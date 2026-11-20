// Classes que se repetem na home, no /assinar e nas telas de acesso (redesenho,
// fase 2). Uma lista só para o título, o contêiner e o link sublinhado não
// ficarem diferentes de uma tela para outra.
//
// `cqi` só vale dentro de um elemento com [container-type:inline-size]:
// <Secao> (components/venda/Secao.jsx) já traz isso.

export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-[clamp(20px,4cqi,32px)]'
export const SECAO_Y = 'py-[clamp(64px,8cqi,112px)]'

// Título de seção (DESIGN.md: section-title) e de cartão.
export const H2 =
  'font-semi-condensed text-[clamp(32px,4.4cqi,52px)] font-[750] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]'
export const H3 = 'font-semi-condensed text-[22px] font-bold leading-[1.15]'
export const TEXTO = 'text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]'

// Link de texto, com 44 px de altura de toque.
export const LINK =
  'inline-flex min-h-11 items-center text-[16px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2'
