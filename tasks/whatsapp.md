# WhatsApp na recuperação — preparado e DESLIGADO

Branch: `whatsapp` (saiu de `main` em 02/10/2026). Pedido do Paulo em 02/10.
O Paulo ainda não tem o número. Tudo fica pronto e desligado por chave; no dia
do número basta cadastrar segredos e ligar. Enquanto desligado, o site e o robô
se comportam EXATAMENTE como hoje.

## Decisões do Paulo (02/10)
- Serviço NÃO oficial (Z-API ou Evolution; a escolha fica para o dia do número).
  O robô suporta os dois por uma variável.
- UMA mensagem só, cerca de 24 h depois do carrinho, se a pessoa não comprou.
- Adiantar tudo agora, desligado.

## Divisão
- **Codex (backend):** `migrations/0006_whatsapp.sql`, `workers/recuperacao-carrinho/index.js`
  e `workers/recuperacao-carrinho/whatsapp.js` (novo), `workers/recuperacao-carrinho/wrangler.jsonc`
  (só as vars novas), `app/api/whatsapp/webhook/route.js` (novo), `lib/whatsapp-saida.js` (novo),
  `lib/gestao/recuperacao.js`, testes em `tests/recuperacao/`.
- **Claude:** `components/gestao/Recuperacao.jsx`, revisão, prova local, publicação, backup.

## Regras acima de tudo
- O WhatsApp NUNCA atrapalha o e-mail nem uma venda: roda DEPOIS da parte do e-mail,
  num try/catch próprio; qualquer erro dele vira log e a rodada do e-mail já terminou.
- `MODO_WHATSAPP` ausente ou `desligado` → a parte do WhatsApp nem consulta o banco.
- Número não oficial pode ser banido: volume baixo e espaçado (teto 20/dia, no
  máximo 3 por rodada de 10 min, só das 9h às 20h de Brasília), texto com 3 variações,
  sempre com "responda SAIR".
- Uma mensagem por pessoa, para sempre (nem por e-mail nem por celular repetido).

## Banco — migrations/0006_whatsapp.sql (aditiva)
```sql
ALTER TABLE carrinhos ADD COLUMN whatsapp_falhou_em TEXT;   -- tentativa que falhou (não tenta de novo)
CREATE INDEX IF NOT EXISTS idx_carrinhos_telefone ON carrinhos (telefone);
```
- Envio registrado em `lembretes_enviados` (canal 'whatsapp', etapa 1) e em
  `carrinhos.whatsapp_enviado_em` (as duas já existem).
- Descadastro por WhatsApp: `descadastros` com `canal = 'whatsapp'` (já existe; uma linha
  = não recebe mais nada, de nenhum canal, como hoje).

## Robô (workers/recuperacao-carrinho)
Variáveis novas no wrangler.jsonc (versionadas):
`MODO_WHATSAPP = "desligado"` (| "teste" | "ativo"), `WHATSAPP_PROVEDOR = "zapi"` (| "evolution"),
`WHATSAPP_TESTE_PARA = ""` (celular só dígitos, com DDD, sem 55), `WHATSAPP_TETO_DIA = "20"`.
Segredos (o Paulo cola no dia, via `npx wrangler secret put`):
- Z-API: `ZAPI_INSTANCIA`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- Evolution: `EVOLUTION_URL` (ex.: https://minha-evolution.com, sem barra no fim), `EVOLUTION_INSTANCIA`, `EVOLUTION_APIKEY`
Faltou segredo do provedor escolhido com MODO ≠ desligado → `console.error` e pula só o WhatsApp.

`whatsapp.js` (funções puras + envio, testáveis):
- `enviarWhatsapp({ telefone, texto }, env, fetchImpl)`:
  - zapi: `POST https://api.z-api.io/instances/${ZAPI_INSTANCIA}/token/${ZAPI_TOKEN}/send-text`,
    headers `Client-Token: ZAPI_CLIENT_TOKEN`, `Content-Type: application/json`,
    body `{ phone: '55' + telefone, message: texto }`.
  - evolution: `POST ${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCIA)}`,
    headers `apikey: EVOLUTION_APIKEY`, `Content-Type: application/json`,
    body `{ number: '55' + telefone, text: texto }`.
  - resposta não-2xx → erro. Timeout de 15 s (AbortController).
- `montarWhatsapp(carrinho, env)` → texto. Variação escolhida de forma estável pelo id do carrinho
  (soma dos códigos dos caracteres % 3). `{nome}` = primeiro nome (até 30 caracteres, sem
  caracteres de controle); sem nome → saudação sem nome ("Oi!" / "Olá, tudo bem?").
  `{link}` = `SITE_URL/assinar?r=<id>&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho`.
  Textos (exatos):
  - A: `Oi, {nome}! Aqui é da Trilha Viva. Vi que você começou a liberar o acesso às mais de 2.000 multitracks gospel e não concluiu. Ficou alguma dúvida? Se quiser terminar, é por aqui: {link}` + `\n\nSe não quiser mais mensagens, responda SAIR.`
  - B: `Olá, {nome}, tudo bem? É da Trilha Viva. Seu acesso ao acervo de multitracks ficou pela metade. Posso ajudar em alguma coisa? Para concluir com Pix ou cartão: {link}` + `\n\nPara não receber mais mensagens, responda SAIR.`
  - C: `Oi, {nome}! Passando para lembrar do seu acesso à Trilha Viva: mais de 2.000 multitracks gospel por R$ 89,90, pagamento único. Se ainda fizer sentido para o seu ministério, é só concluir aqui: {link}` + `\n\nNão quer mais mensagens? Responda SAIR.`
  - Sem nome: A → `Oi! Aqui é da Trilha Viva...`, B → `Olá, tudo bem? É da Trilha Viva...`, C → `Oi! Passando...`.
- `dentroDoHorario(agora)` → true se a hora de Brasília (UTC−3) estiver entre 9 e 19 (9h00 até 19h59).

Passo do WhatsApp em `executarRodada` (depois do e-mail, try/catch próprio, devolve
`resultado.whatsapp = { enviados, ignorados, apenasLog }`):
1. MODO desligado/ausente → retorna sem consultar nada. Fora do horário → retorna.
2. Conta envios do dia (canal 'whatsapp', dia UTC) — bateu `WHATSAPP_TETO_DIA` → retorna.
3. Candidatos (LIMIT 3): `telefone IS NOT NULL AND whatsapp_enviado_em IS NULL AND
   whatsapp_falhou_em IS NULL AND status IN ('aberto','lembrado') AND finalizado_em IS NULL
   AND criado_em <= now-24h AND criado_em >= now-72h`, mais antigo primeiro.
4. Para cada um: modo teste e telefone ≠ WHATSAPP_TESTE_PARA → só log (telefone mascarado,
   ex. `11*****4321`), não mexe. Bloqueado → não envia e grava `whatsapp_falhou_em = datetime('now')`
   (para não ser consultado de novo). Bloqueios: compra paga do e-mail, descadastro do e-mail,
   ou já existe `whatsapp_enviado_em` em qualquer carrinho com o mesmo e-mail OU o mesmo telefone.
   Na gestão, bloqueado por compra aparece como `comprou`; os outros como `falhou` só se não
   houver motivo melhor (descadastro → `nao_enviado`).
5. Reserva atômica: INSERT em `lembretes_enviados` (carrinho, 'whatsapp', 1) com o teto do dia
   e o "ninguém com este e-mail/telefone recebeu" no próprio INSERT ... SELECT; depois
   `UPDATE carrinhos SET whatsapp_enviado_em = datetime('now') WHERE id = ?`.
6. Envia. Falhou → apaga a reserva, `whatsapp_enviado_em = NULL`, `whatsapp_falhou_em = datetime('now')`.
   NÃO tenta de novo (serviço não oficial não tem idempotência: repetir arrisca mensagem dupla).

## Saída por "SAIR": POST /api/whatsapp/webhook?t=<segredo> (site)
- Segredo `WHATSAPP_WEBHOOK_SEGREDO` (variável/segredo do site, no painel). Ausente, ou `t`
  diferente (comparação em tempo constante), ou método ≠ POST → 404 igual a endereço inexistente
  (`NextResponse` 404 sem corpo útil). Freio por IP como o do checkout.
- Lê o corpo (até 64 KB). `lib/whatsapp-saida.js` (função pura `lerMensagemRecebida(corpo)`) aceita:
  - Z-API: `{ phone, fromMe, isGroup, text: { message } }`
  - Evolution: `{ event: 'messages.upsert', data: { key: { remoteJid, fromMe }, message: { conversation | extendedTextMessage: { text } } } }`
    (remoteJid `5511...@s.whatsapp.net`; grupo termina em `@g.us` → ignora)
  e devolve `{ telefone (só dígitos, sem 55), texto }` ou null (fromMe, grupo, sem texto).
- `pedidoDeSaida(texto)`: minúsculas, sem acento, sem pontuação nas pontas; verdadeiro para
  `sair`, `parar`, `pare`, `stop`, `cancelar`, `descadastrar`, `remover`.
- Se for pedido de saída: `SELECT DISTINCT email FROM carrinhos WHERE telefone = ? LIMIT 10`
  e `INSERT OR IGNORE INTO descadastros (email, canal) VALUES (?, 'whatsapp')` para cada um.
- Sempre responde 200 `{ ok: true }` para pedido autenticado (o serviço não fica reenviando).
- Não responde nada à pessoa nesta fase.

## Gestão (lib/gestao/recuperacao.js)
- `whatsapp` de cada pessoa (carrinho do protocolo; para "enviado" vale qualquer carrinho do e-mail):
  `{ situacao, enviado_em, previsto_em }` com `situacao`:
  - `enviado` (tem whatsapp_enviado_em) · `sem_celular` (telefone NULL)
  - `comprou` (pagou antes de qualquer WhatsApp) · `falhou` (whatsapp_falhou_em sem envio)
  - `previsto` (ainda dentro do prazo: criado_em > now−72h; `previsto_em` = criado_em + 24 h)
  - `nao_enviado` (passou do prazo sem envio)
  - `desligado` substitui `previsto`/`nao_enviado` quando o site NÃO tiver `WHATSAPP_ATIVO=sim`
    (variável do site; padrão: ausente = desligado). A rota passa `whatsappAtivo` para a lib.
- "Recuperado" passa a valer para lembrete de QUALQUER canal enviado antes de `pago_em`.
  Novo campo `recuperado_pelo_canal` ('email' | 'whatsapp'); `recuperado_pela_etapa` continua
  (etapa do e-mail; para WhatsApp = 1).
- `totais.whatsapp_enviados` (linhas de lembretes_enviados com canal 'whatsapp') e
  `totais.whatsapp_ativo` (boolean).
- `totais.emails_enviados` continua só e-mail. `taxa` = recuperados / pessoas com ao menos 1 lembrete de qualquer canal.
- CSV: coluna WhatsApp passa a mostrar `Enviado DD/MM/AAAA HH:MM`, `Sem celular`, `Previsto`,
  `Não enviado`, `Falhou`, `Comprou antes`, `Desligado`; coluna nova "Recuperado pelo canal".

## Testes (node --test)
- montarWhatsapp: 3 variações estáveis por id, nome/sem nome, link, "SAIR" sempre presente.
- enviarWhatsapp: URL, headers e corpo certos para zapi e evolution; não-2xx vira erro.
- dentroDoHorario nos limites (8h59, 9h00, 19h59, 20h00 de Brasília).
- rodada: desligado não consulta o banco; teste só para WHATSAPP_TESTE_PARA; teto; 3 por rodada;
  janela 24–72 h; bloqueios; falha não repete; erro no WhatsApp não afeta o resultado do e-mail.
- lerMensagemRecebida (Z-API, Evolution, grupo, fromMe) e pedidoDeSaida.
- gestão: situações do WhatsApp, desligado, recuperado pelo WhatsApp.

## Para ligar (no dia do número) — checklist
1. Escolher Z-API ou Evolution, conectar o número (QR Code) no painel do serviço.
2. `npx wrangler secret put` dos 3 segredos do provedor no robô; `WHATSAPP_PROVEDOR` no wrangler.jsonc.
3. `MODO_WHATSAPP = "teste"` + `WHATSAPP_TESTE_PARA` = celular do Paulo → deploy do robô → fazer um carrinho de teste e esperar 24 h (ou ajustar a data no D1 local para provar antes).
4. No painel do serviço, webhook de mensagem recebida → `https://trilhaviva.org/api/whatsapp/webhook?t=<segredo>`; cadastrar `WHATSAPP_WEBHOOK_SEGREDO` no site (painel + Promote version). Testar respondendo SAIR.
5. `MODO_WHATSAPP = "ativo"` no robô e `WHATSAPP_ATIVO = sim` no site.

## Publicação desta fase (tudo desligado)
0006 no D1 (aditiva) → site → robô. Conferir: login, /assinar, gestão, webhook sem segredo = 404.
