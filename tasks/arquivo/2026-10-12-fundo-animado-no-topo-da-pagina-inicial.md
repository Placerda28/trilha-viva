# Fundo animado no topo da página inicial, 12/10/2026

Branch `hero-gradiente` (saiu de main 9e1f5dd). Pedido do Paulo/Cowork em 12/10: gradiente animado estilo "Prism" do Spell UI, só no topo da home, escuro como os anúncios ("Solta a VS." v3).
Decisão do Paulo (12/10): no celular o gradiente SUBSTITUI a foto da banda no topo.

- [x] Spell UI: licença MIT, sem pacote npm, mas usa next-themes + TypeScript e não tem pausa nem reserva. Feito componente próprio em WebGL 1 puro (components/HeroGradiente.jsx), nada instalado.
- [x] Ajustes num lugar só: lib/hero-gradiente.js (cores, força do vermelho e do feixe, velocidade). O fundo estático em CSS sai do mesmo arquivo.
- [x] Carregamento: components/HeroFundo.jsx espera o load + requestIdleCallback e só então baixa o efeito (dynamic, ssr:false). Fade de 600 ms. Pausa fora da tela e com a aba escondida; metade da resolução, DPR no máx. 1,5; 30 qps no celular.
- [x] Reduzir movimento: o efeito nem é baixado (testado). Sem WebGL: fica o estático, sem erro novo no console (testado).
- [x] Contraste (pior ponto em 40 s de animação): computador ≥ 10,36:1; celular ≥ 5,33:1 ("de R$ 899,00", que passou de branco 60% para 70%).
- [x] Testes: 174 passando.
- [x] Build limpo (Environments: .env.local; / continua estática). Feito em ~/tv-build.
- [x] Foto grande de baixo com loading="lazy": no celular ela fica escondida e era baixada mesmo assim (840 KB).
- [x] Peso: +0,6 KB no carregamento inicial (carregador) e 2,1 KB gzip do efeito, baixado depois da página pronta. Saiu o código do next/image do topo (5,9 KB): saldo ≈ −2 KB de JS próprio. Página no celular: 1.334 KB → 545 KB.
- [x] Lighthouse DEPOIS (prévia, mobile, 3 rodadas): Performance 74 / 74 / 74; LCP 4,2 / 4,1 / 4,2 s (agora o LCP é o título); CLS 0,001; TBT 370 / 460 / 440 ms. O JS total aparece +33 KB, mas é o Pixel da Meta (config maior no domínio workers.dev) — não é código nosso.
- [x] CPU parado 30 s (Chrome real): no ar 4,9% de 1 núcleo; prévia 13,7% (GPU 6,2%) com 30 qps — a 60 qps eram 18,9%, por isso 30 qps em qualquer aparelho. Topo fora da tela: 4,6% (pausa funciona).
- [x] Prints 1440 e 390 e vídeos curtos: scratchpad da sessão (provas/).
- [x] Prévia sem promover: https://hero-gradiente-www.trilha-viva.workers.dev (versão 8571f1b8). Produção não mudou.
- [x] Paulo: abrir a prévia no celular pelo Instagram (mandar o link numa DM para si mesmo e tocar nele) e no computador; dizer se quer mais/menos vermelho, feixe ou movimento.
- [x] Paulo aprovou como está (sem a foto da banda no celular). Merge em main (fast-forward, d5d3ffb) e deploy de ~/tv-build em 12/10 18:46 UTC: versão c78ca839. Antes estava a e8cfa55a (17:43, mesmo código com troca de segredo).
- [x] Conferido no ar: home, /assinar e /musicas 200; login 400 "Informe o e-mail e a senha."; fundo animado roda no computador e no celular (canvas visível, imagem muda em 4 s); botão do topo leva à /assinar com o formulário; console sem erro nem aviso. Única falha de rede: telemetria do próprio Pixel da Meta (on.aws), que já existia na versão anterior.
- [ ] Prova do Mercado Pago: enviar o formulário cria carrinho real. Fazer com um e-mail que já tem compra paga (o robô ignora, sem lembrete) — aguardando o Paulo.

Lighthouse ANTES (produção, trilhaviva.org, mobile, 3 rodadas): Performance 61 / 67 / 54; LCP 9,4 / 9,3 / 6,8 s (a foto de 840 KB era o LCP); CLS 0,001; TBT 490 / 310 / 970 ms.
