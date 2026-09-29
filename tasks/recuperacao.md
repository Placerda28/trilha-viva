# Recuperação de carrinho por e-mail — contrato entre backend (Codex) e frontend (Claude)

Branch: `recuperacao`. Aprovado pelo Paulo em 29/09/2026 (remetente acesso@,
link com `?r=`, teto 40/dia e 1.100/mês, datas em texto UTC).

Objetivo: quem informou nome e e-mail, foi ao Mercado Pago e não pagou recebe
UM lembrete por e-mail, 1 hora depois. Um lembrete por e-mail, para sempre.
O WhatsApp entra depois no mesmo fluxo: agora só ficam as colunas vazias
(`telefone`, `whatsapp_enviado_em`) e o `canal` em `descadastros`.

Regra que vale acima de tudo: o lembrete NUNCA atrapalha uma venda. Qualquer
falha dele no checkout ou no aviso do MP vira `console.error` e o fluxo segue.

## Banco (migrations/0004_carrinhos.sql — aplicado em produção só pelo Paulo)
Datas em TEXT UTC `datetime('now')`, como o resto do banco.
- `carrinhos`: id TEXT PRIMARY KEY (= external_reference do MP, UUID),
  email TEXT NOT NULL CHECK (email = lower(trim(email))), nome TEXT,
  telefone TEXT (NULL por enquanto), criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','lembrado','ignorado')),
  email_enviado_em TEXT, whatsapp_enviado_em TEXT (NULL por enquanto),
  pago_em TEXT, origem TEXT.
  Índices: (email) e (status, criado_em).
- `descadastros`: email TEXT PRIMARY KEY CHECK (email = lower(trim(email))),
  canal TEXT NOT NULL DEFAULT 'email', criado_em TEXT NOT NULL DEFAULT (datetime('now')).
  Uma linha = essa pessoa não recebe mais lembrete (de nenhum canal, por ora).

## Site (Worker `www`)

### POST /api/checkout — mudanças pontuais
- `nome` passa a ser obrigatório (depois do trim, 1 a 80 caracteres):
  400 { error: 'Informe seu nome.' }. Vale para MP e Stripe.
- Corpo aceita também `utm` = { source, medium, campaign } (opcional). O
  servidor limpa cada um (só a-z, 0-9, "-", "_", "."; até 40 caracteres).
- Só no ramo do Mercado Pago, depois da reserva do cupom e ANTES de
  `criarPreferencia`: grava o carrinho com id = `referencia`, e-mail
  normalizado, nome, origem (texto curto, ex.: `utm=email/lembrete/carrinho;cupom=X`,
  até 200 caracteres). Em try/catch próprio: se falhar, `console.error` e segue.
- Se a preferência falhar, o carrinho fica (não é problema: o robô só manda
  lembrete depois de 1 h e para quem ainda não comprou).

### GET /api/carrinho?r=<uuid> — preencher o formulário a partir do lembrete
- `r` precisa passar em `referenciaValida`. Devolve só carrinhos criados nos
  últimos 7 dias. 200 { ok:true, nome, email } | 404 { ok:false }.
- `Cache-Control: no-store`. Freio simples por IP como o do checkout.
- Por que existe: e-mail e nome NÃO podem ir na URL (o Pixel da Meta manda a
  URL da página para a Meta, e a política de privacidade promete o contrário).

### Aviso do Mercado Pago (app/api/mercadopago/webhook) — mudança pontual
- No ramo `paid`, DEPOIS de `liberarAcesso(r)`, em try/catch próprio:
  UPDATE carrinhos SET status='pago', pago_em=datetime('now')
  WHERE status <> 'pago' AND (id = <referencia> OR email = <email normalizado>).
  (Todos os carrinhos do e-mail, inclusive 'lembrado' e 'ignorado': é isso que
  permite contar "recuperado" = pago_em > email_enviado_em.)
- Nada mais muda no webhook (liberação de acesso, evento da Meta, cupom).

### Descadastro: /api/descadastrar?e=<email>&t=<assinatura>
- Assinatura = HMAC-SHA256 em hex, chave `LEMBRETE_SEGREDO`, frase
  `descadastro:<email normalizado>`. Função única em `lib/lembrete-assinatura.js`,
  SEM imports com `@/` (o robô importa o mesmo arquivo por caminho relativo).
  Comparação em tempo constante.
- GET com assinatura válida: página simples com o botão "Confirmar
  cancelamento" (form POST para o mesmo endereço). NÃO grava nada — leitores
  de e-mail abrem links sozinhos para checar vírus.
- POST com assinatura válida (o botão, ou o "cancelar inscrição" do Gmail/Outlook,
  que manda `List-Unsubscribe=One-Click`): INSERT OR IGNORE em descadastros e
  mostra "Pronto, você não vai mais receber lembretes."
- Assinatura inválida ou faltando: 400 com página "Link inválido", nada gravado.
- Páginas com `X-Robots-Tag: noindex` e `Cache-Control: no-store`, visual
  simples com a paleta do site (Claude revisa o HTML).
- Segredo novo `LEMBRETE_SEGREDO` no site E no robô (o mesmo valor).

## Robô: Worker separado `recuperacao-carrinho` (pasta workers/recuperacao-carrinho/)
Separado do site: se quebrar, o site não sente. wrangler.jsonc próprio, cron
`*/10 * * * *`, ligação D1 `DB` no mesmo banco (trilha-viva,
2dac1356-eb0b-432b-a3d2-1c5cbbb9c29c), observability ligada. `fetch` responde 404.
Variáveis no wrangler.jsonc (versionadas): MODO="teste",
TESTE_PARA="paulohenrique_ls@hotmail.com", LEMBRETE_BCC="trilhaviva.suporte@gmail.com",
EMAIL_FROM="Trilha Viva <acesso@trilhaviva.org>", EMAIL_REPLY_TO="contato@trilhaviva.org",
SITE_URL="https://trilhaviva.org", TETO_DIA="40", TETO_MES="1100".
Segredos (Paulo cola): RESEND_API_KEY, LEMBRETE_SEGREDO.

A cada rodada:
1. Conta lembretes enviados no dia UTC (o dia do Resend vira à meia-noite UTC)
   e no mês UTC (email_enviado_em). Bateu TETO_DIA ou TETO_MES → para a rodada.
2. Só em MODO=ativo: carrinhos 'aberto' com mais de 48 h viram 'ignorado'.
3. Pega até 20 carrinhos 'aberto' com criado_em entre 48 h e 1 h atrás, do mais
   velho para o mais novo, e para cada um:
   - MODO=teste e o e-mail não é TESTE_PARA → só registra no log (e-mail
     mascarado) e NÃO mexe na linha.
   - Envia só se as três forem verdadeiras: (a) o e-mail não tem compra paga
     (compras JOIN clientes, status='pago'); (b) nenhum carrinho desse e-mail
     tem email_enviado_em; (c) o e-mail não está em descadastros.
     Não passou → status='ignorado'.
   - Passou → primeiro "reserva" a linha: UPDATE ... SET status='lembrado',
     email_enviado_em=datetime('now') WHERE id=? AND status='aberto'. Se não
     mudou nenhuma linha (outra rodada pegou), pula. Depois envia.
   - Envio falhou → status='ignorado', email_enviado_em=NULL, console.error.
     Nunca tenta de novo o mesmo carrinho.
   - Um erro num carrinho não para os outros. Respeita o teto também no meio da rodada.
4. Resend: `Idempotency-Key` = id do carrinho (segunda proteção contra envio duplo).

## O e-mail
- De EMAIL_FROM; para o cliente; Bcc LEMBRETE_BCC (sempre, inclusive no teste);
  reply_to EMAIL_REPLY_TO. O cliente não vê o Bcc.
- Assunto: "Seu acesso à Trilha Viva ficou pela metade"
- Texto (HTML com tabela e estilo inline, fundo claro, botão #C40F24, e versão texto puro):
  - Oi, {nome}! (sem nome: "Oi!"; nome passa por escapeHtml)
  - Vai mesmo desperdiçar essa oferta? São 2.000 multitracks gospel por R$ 89,90,
    pagamento único e acesso vitalício — menos de R$ 0,05 por música.
  - O preço de lançamento ainda está de pé. Finalize agora:
  - [Finalizar minha compra] → SITE_URL/assinar?r=<id>&utm_source=email&utm_medium=lembrete&utm_campaign=carrinho
  - Pix ou cartão, acesso liberado na hora.
  - Rodapé: Não quer mais receber? [Cancelar lembretes] → SITE_URL/api/descadastrar?e=..&t=..
- Cabeçalhos: `List-Unsubscribe: <link de cancelar>` e
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.

## Formulário (Claude)
- Campos Nome e E-mail, obrigatórios, nessa ordem, nos dois cards do /assinar.
- Linha abaixo do botão: "Usamos seu e-mail para enviar o acesso e, se a compra
  não for concluída, um lembrete. Você pode cancelar a qualquer momento."
- Com `?r=` no endereço: chama GET /api/carrinho e preenche nome e e-mail (no
  navegador). Com `utm_*` no endereço: manda em `utm` no /api/checkout.

## Gestão (Codex: rota; Claude: tela)
- GET /api/gestao/carrinhos?periodo=hoje|7d|30d&pagina=N (atrás do middleware,
  soAdmin, 404 para quem não é admin, no-store). Dias de Brasília.
  → { ok, totais:{ abertos, lembrados, recuperados, taxa }, itens:[{ nome, email,
  criado_em, status, email_enviado_em, pago_em }], pagina, temMais } (50 por página).
  recuperados = carrinhos com email_enviado_em e pago_em > email_enviado_em.
  taxa = recuperados / lembrados (0 quando não houver lembrados).
- Aba "Carrinhos" no menu.

## Privacidade (Claude)
Parágrafo: o e-mail do checkout pode receber UM lembrete se a compra não for
concluída; como cancelar (link no próprio e-mail ou pedido para contato@).
