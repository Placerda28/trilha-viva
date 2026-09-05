# Trilha Viva — Multitracks Gospel

Site de venda do pacote único com mais de 4.000 multitracks (VS) gospel.
Next.js 15 (App Router) + Tailwind CSS + Stripe. Publicado na Cloudflare Workers
com o adapter OpenNext, com deploy automático a cada push na `main`.

---

## 1. Como rodar no seu computador

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # abre em http://localhost:3000
```

Para ver o site rodando no runtime dos Workers (igual à produção):

```bash
cp .dev.vars.example .dev.vars   # preencha as variáveis
npm run preview                  # build do OpenNext + workerd local
```

Para publicar direto da sua máquina, sem passar pelo GitHub: `npm run deploy`.

---

## 2. Variáveis de ambiente (o que preencher)

| Variável | Onde conseguir | Obrigatória |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | A URL pública do site | Sim (em *build*) |
| `STRIPE_SECRET_KEY` | Stripe → Desenvolvedores → Chaves de API | Sim |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint `/api/webhook` | Sim |
| `DRIVE_URL` | Link do Google Drive com as 4.000 VS | Sim |
| `RESEND_API_KEY` | resend.com → API Keys (grátis) | Recomendada |
| `EMAIL_FROM` | Remetente verificado no Resend | Recomendada |
| `NEXT_PUBLIC_PAYMENT_LINK` | Payment Link da Stripe (plano B) | Não |

Na Cloudflare há **dois lugares** e a diferença importa:

- `NEXT_PUBLIC_SITE_URL` é embutida no HTML durante o build, então vai em
  **Settings → Build → Variables and secrets**. Mudou o valor? Precisa de um
  novo build para valer.
- Todas as outras são lidas em tempo de execução e vão em
  **Settings → Variables and secrets** do Worker, sempre como **Secret**.

---

## 3. Como a entrega segura funciona

O link do Drive **nunca** aparece no código do site nem no HTML público.

1. O visitante preenche nome e e-mail em `/assinar`.
2. `POST /api/checkout` cria uma sessão de pagamento na Stripe (Pix ou cartão).
3. A Stripe devolve o cliente para `/sucesso?session_id=cs_...`.
4. `POST /api/acesso` consulta a Stripe **no servidor**. Só se
   `payment_status === "paid"` a rota devolve o valor de `DRIVE_URL`.
5. `POST /api/webhook` recebe a confirmação da Stripe e dispara o e-mail com o
   mesmo link (via Resend).

A página `/sucesso` é `noindex` e as respostas são `no-store`, então o link não
entra em cache nem no Google. Sem pagamento confirmado, a rota não devolve nada.

### Trave o Drive também

O código protege o link; o Google Drive protege o arquivo. Faça as duas coisas:

- Compartilhe a pasta como **"Qualquer pessoa com o link — Leitor"**.
- Trabalhe sempre numa **pasta espelho**, nunca na original.
- Acompanhe os acessos e, se detectar vazamento, troque a pasta de lugar e
  atualize `DRIVE_URL` na Cloudflare — todos os links antigos morrem de uma vez.

---

## 4. Estrutura de pastas

```
app/
  page.js                 Home (hero, acervo, preço, FAQ)
  musicas/                Catálogo + página de cada música
  artistas/               Página por artista/ministério
  assinar/                Checkout do pacote único
  sucesso/                Liberação do acesso após o pagamento
  como-usar/              Guia: Reaper, Ableton, Prime, tablet, roteamento
  blog/                   Artigos de SEO
  faq/ termos/ privacidade/
  api/checkout            Cria a sessão de pagamento
  api/acesso              Verifica o pagamento e libera o link
  api/webhook             Recebe a confirmação da Stripe e envia o e-mail
  sitemap.js robots.js opengraph-image.jsx
components/
  Logo, Header, Footer, Cover, StageScene, TabletMockup,
  CatalogBrowser, CheckoutForm, AccessPanel, ui
lib/
  site.js       Nome, preços, navegação
  catalog.js    Amostra pública do acervo (169 músicas)
  artists.js    Agrupamento por artista
  tools.js      Programas recomendados e passo a passo
  posts.js      Artigos do blog
  faq.js        Perguntas frequentes
public/icon.svg Logo/favicon
assets/         Fotos fatiadas em base64 + manifest com sha256
scripts/        decode-assets.mjs — remonta as fotos no prebuild
wrangler.jsonc  Configuração do Worker
open-next.config.ts
```

---

## 5. Como adicionar músicas ao catálogo

Abra `lib/catalog.js` e acrescente uma linha na lista `RAW`, no formato
`Título|Artista`. Slug, capa e categoria são gerados automaticamente. Cada nova
linha vira uma página nova em `/musicas/...` e entra no sitemap.

---

## 6. SEO já configurado

- Metadados e canonical em todas as páginas.
- JSON-LD: Organization, WebSite, Product, FAQPage, HowTo, MusicRecording,
  MusicGroup, BlogPosting e BreadcrumbList.
- `sitemap.xml` com as ~185 URLs e `robots.txt` liberando também os robôs de IA.
- Imagem de compartilhamento gerada automaticamente em `/opengraph-image`.
- Páginas dedicadas por música e por artista — é isso que captura as buscas de
  cauda longa ("multitrack Ousado Amor", "VS Gabriela Rocha").

Depois de publicar: cadastre o site no **Google Search Console** e envie o
sitemap. É o passo que faz o Google indexar rápido.
