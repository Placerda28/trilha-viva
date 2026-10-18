# Design do site

O conceito é "preto no branco, corte vermelho". Os tokens ficam em `tailwind.config.js` e `app/globals.css`, e isso aqui é o resumo.

## Cores
| Token | Cor | Uso |
|---|---|---|
| `ink` | #0D0D0D | texto principal, fundos pretos |
| `ink-muted` | #5C5C5C | texto secundário |
| `paper` | #F2F3F5 | fundo |
| `mist` | #E7E8EB | áreas de apoio |
| `line` | #E0E2E6 | linhas e bordas |
| `signal` | #E5152D | só gráfico, traço e borda |
| `signal-deep` | #C40F24 | texto e botão vermelhos no fundo claro |
| `signal-lite` | #FF5566 | texto vermelho dentro de painel preto |

- O vermelho nunca ocupa área grande.
- Sem sombras.

## Tipografia
- **Archivo** (variável) na interface. **Source Serif 4** (variável) nos textos longos.
- As duas são auto-hospedadas via `@fontsource`; `next/font/google` não funciona aqui.
- Os títulos usam a escala `d1`/`d2`/`d3` do Tailwind (tamanho fluido com `clamp`).

## Marca
- Um disco com 7 barras de canal, a 4ª (o clique) sempre vermelha.
- O disco inverte com o fundo; a barra vermelha não muda (`components/Logo.jsx`).

## Regras
- Tem que funcionar no celular primeiro.
- Foco visível, campos com rótulo e `role="alert"` nas mensagens de erro.
- Imagens com `<img>` simples (o motivo está em `docs/architecture.md`).
- Componentes de interface ficam em `components/ui.jsx` e `components/ui/`, que usam `radix-ui`. Reaproveite-os antes de criar outro.
