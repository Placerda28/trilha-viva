# Produto — Trilha Viva

## Para quem
Líderes de louvor, músicos e voluntários de som de igrejas evangélicas do Brasil. Eles compram para a banda ou o ministério, não para uso pessoal. Não são profissionais de áudio, mas usam programas de playback ou DAW (Reaper, Ableton Live, Cakewalk, Prime, Cantabile, Waveform, Studio One) no notebook ou no tablet, no ensaio e no culto. O celular é o aparelho em que a maioria chega ao site.

Esse perfil vem do texto do site e da experiência do Paulo. Nenhuma pesquisa com cliente foi feita.

## O que vende
Acesso vitalício, em **pagamento único de R$ 89,90** (preço "de" R$ 899,00), no Pix ou no cartão, sem mensalidade, a um acervo de multitracks gospel (VS) que continua crescendo:
- O catálogo do site lista **1.563 músicas** (1.819 arquivos, contando tons e versões), segundo `lib/catalog.js`.
- A comunicação pública fala em "mais de 2.000 multitracks".

Cada música vem com os canais separados (bateria, baixo, teclados, guitarra, pads, metais, vozes), mais clique e guia falada. A banda ao vivo silencia o que já toca e usa o resto.

## Posicionamento
Não é playback fechado: é multitrack aberta. A igreja tira o que a banda já cobre, e o clique e a guia são o que o playback comum não oferece.

Os concorrentes no Google são multitracks.com.br e multitrackgospel.com.

## Marca e voz
- Nome: Trilha Viva. A marca é um disco com 7 barras de canal, e a 4ª barra (o clique) é sempre vermelha (`components/Logo.jsx`).
- A voz é direta, em português simples, sem jargão de engenheiro de som.
- Regras visuais: `docs/design.md`.

## Produto irmão: Palco
O Palco toca as VS do acervo direto no navegador (iPad, notebook, celular), com mixagem por faixa e repertórios salvos. Ainda está em desenvolvimento, em `C:\dev\trilha-viva-palco`.

## Princípios
1. Refinar, não refazer: o visual, o texto e a organização do site já funcionam.
2. Nunca trocar a renderização estática (exigida pelo limite de CPU da Cloudflare) por um ajuste cosmético. Detalhes em `docs/architecture.md`.
3. Celular primeiro.
4. Provar antes de dizer que está pronto: ver funcionando, não só ler o código.
5. Acessibilidade básica que já existe (foco visível, `role="alert"` em erro, campos com rótulo) não pode regredir.
