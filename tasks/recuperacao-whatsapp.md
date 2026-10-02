# Recuperação por WhatsApp — API oficial da Meta (substitui tasks/whatsapp.md e tasks/whatsapp-semanal.md)

Branch: `recuperacao-whatsapp` (saiu de `main` em 02/10/2026). Roteiro do Paulo colado em 02/10,
com as escolhas dele no mesmo dia: **API oficial da Meta (Cloud API), uma mensagem 3 h depois do
carrinho, celular opcional**. O que estava no ar (Z-API/Evolution, semanal até 8) estava DESLIGADO
e nunca enviou nada; é substituído.

## Decisões (não reabrir)
- WhatsApp Cloud API direto: `POST https://graph.facebook.com/<WA_GRAPH_VERSION>/<WA_PHONE_NUMBER_ID>/messages`.
- Modelo `carrinho_lembrete`, categoria MARKETING, pt_BR. ≈ R$ 0,32 por mensagem entregue.
- E-mail com 1 h (já existe); WhatsApp com **3 h**, só se ainda não pagou. **Uma por telefone, para sempre.**
- Desenvolvimento e testes com o **número de teste da Meta**. O número real do Paulo só no fim
  (o app do WhatsApp Business para de funcionar nele depois da migração).
- Respostas dos clientes não podem se perder: vão para a tabela, para o e-mail de suporte e para a gestão.

## Onde este plano difere do roteiro (e por quê)
1. **Link do botão leva só o código do carrinho**, não e-mail/nome/telefone:
   `https://trilhaviva.org/assinar?{{1}}` com `{{1}}` = `r=<id>&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho`.
   O Pixel da Meta manda o endereço da página para a Meta e a privacidade promete o contrário
   (decisão de 29/09). O `/assinar` já preenche nome, e-mail e celular a partir do `r=`.
   Por isso também **não** há preenchimento por `?tel=`/`?email=`/`?nome=`.
2. **Telefone gravado como hoje** (DDD + número, sem o 55, ex.: `27999998888`); o `55` é posto na
   hora de enviar. Já há 7 carrinhos gravados assim; mudar o formato exigiria converter os dados.
3. **Horário de envio 9h–20h de Brasília** (não está no roteiro): mensagem de venda às 3 da manhã
   gera bloqueio e denúncia, que derrubam a qualidade do número na Meta. Carrinho da noite recebe de manhã
   (a janela de 3 h a 48 h cobre isso).
4. A aba do roteiro chamada "Carrinhos" é a aba **Recuperação** que já existe.

## Divisão
- **Codex (backend):** migração 0008, robô (`workers/recuperacao-carrinho/`), webhook no robô,
  rota de resposta e de leitura da gestão, `lib/carrinhos.js` + `/api/checkout` (celular opcional),
  remoção do código Z-API/Evolution, testes.
- **Claude:** campo opcional no formulário, sub-aba WhatsApp na Recuperação, privacidade,
  texto do modelo e o passo a passo para o Paulo, revisão linha a linha, provas, publicação.

## Banco — migrations/0008_whatsapp_meta.sql (PONTO DE PARADA 1: mostrar ao Paulo antes de aplicar)
```sql
ALTER TABLE carrinhos ADD COLUMN whatsapp_msg_id TEXT;   -- id da mensagem na Meta (wamid)
ALTER TABLE carrinhos ADD COLUMN whatsapp_status TEXT;   -- sent | delivered | read | failed
CREATE INDEX IF NOT EXISTS idx_carrinhos_whatsapp_msg ON carrinhos (whatsapp_msg_id);

CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_msg_id TEXT UNIQUE,                       -- id da Meta (evita gravar duas vezes o mesmo aviso)
  telefone TEXT NOT NULL,                      -- DDD + número, sem 55
  nome_perfil TEXT,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  enviado_por TEXT                             -- e-mail de quem respondeu pela gestão (saída)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_telefone ON whatsapp_mensagens (telefone, criado_em);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_criado ON whatsapp_mensagens (criado_em);
```
- Aditiva. Colunas antigas da versão não oficial (`whatsapp_etapa`, `proximo_whatsapp_em`,
  `whatsapp_falhou_em`) ficam sem uso; `whatsapp_falhou_em` é reaproveitada como "não reenviar".
- Descadastro por WhatsApp continua em `descadastros` (chave = e-mail, `canal = 'whatsapp'`),
  achando os e-mails pelo telefone nos carrinhos (como já faz). Bloqueia os dois canais.

## Checkout (Codex) e formulário (Claude)
- Celular **opcional**: vazio ou inválido → grava NULL e a compra segue (hoje inválido dá 400).
- Formulário: campo "WhatsApp (opcional)" com máscara, `inputmode="tel"`; inválido → aviso discreto,
  não trava o botão (envia vazio). Texto abaixo do botão: "Usamos seu e-mail e WhatsApp para enviar
  o acesso e, se a compra não for concluída, um lembrete. Você pode cancelar a qualquer momento."

## Robô — envio (Codex)
Bloco independente do e-mail (try/catch próprio), mesmo cron de 10 min.
- Candidatos (até 20 por rodada; no modo teste a busca filtra o celular de teste): `telefone` preenchido,
  `whatsapp_enviado_em` e `whatsapp_falhou_em` vazios, `status <> 'pago'`, `criado_em` entre 3 h e 48 h.
- Só envia se: e-mail sem compra paga; telefone nunca recebeu (nenhum carrinho com esse telefone e
  `whatsapp_enviado_em`); e-mail não está em `descadastros` (qualquer canal).
- Reserva atômica antes de enviar (linha em `lembretes_enviados` canal 'whatsapp' etapa 1 com o teto
  do dia no próprio INSERT), como hoje.
- Envio do modelo: `{ messaging_product:'whatsapp', to:'55'+telefone, type:'template',
  template:{ name: WA_TEMPLATE, language:{ code:'pt_BR' }, components:[
  { type:'body', parameters:[{ type:'text', text: primeiroNome || 'tudo bem' }] },
  { type:'button', sub_type:'url', index:'0', parameters:[{ type:'text', text: 'r=<id>&utm_...' }] } ] } }`.
- 200 com `messages[0].id` → `whatsapp_enviado_em = agora`, `whatsapp_msg_id`, `whatsapp_status = 'sent'`.
  Erro → log com o código da Meta, `whatsapp_falhou_em = agora`, apaga a reserva, **não tenta de novo**.
- `WA_MODO = teste` (padrão) só para `WA_TESTE_PARA`; `ativo` só com OK do Paulo. `WA_TETO_DIA = 30`.
- Variáveis: `WA_MODO`, `WA_TESTE_PARA`, `WA_TETO_DIA`, `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`,
  `WA_GRAPH_VERSION`, `WA_TEMPLATE = carrinho_lembrete`. Segredos: `WA_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`.

## Robô — webhook das respostas (Codex), no `fetch` do Worker `recuperacao-carrinho`
- `GET` com `hub.mode=subscribe` e `hub.verify_token` igual a `WA_VERIFY_TOKEN` → devolve `hub.challenge`.
  Qualquer outra coisa → 404.
- `POST` confere `X-Hub-Signature-256` (HMAC-SHA256 do corpo cru com `WA_APP_SECRET`, comparação
  em tempo constante). Não bateu → 401 sem gravar nada. Bateu → processa e responde 200.
- Mensagem recebida:
  - botão "Não quero receber" ou texto SAIR/PARAR/CANCELAR/PARE/STOP → `descadastros` (canal
    'whatsapp') para os e-mails daquele telefone + resposta livre "Pronto, você não vai mais receber
    lembretes." (grava como saída em `whatsapp_mensagens`).
  - qualquer outra → grava (entrada) e encaminha por e-mail para `trilhaviva.suporte@gmail.com`
    via Resend, assunto `WhatsApp de <nome> (<telefone>)` (nome passa por escapeHtml no HTML).
    Não conta no teto de lembretes de e-mail.
  - `wa_msg_id` único: aviso repetido da Meta não grava nem encaminha duas vezes.
- Status (`sent`/`delivered`/`read`/`failed`) → atualiza `carrinhos.whatsapp_status` pelo `whatsapp_msg_id`
  (não volta de `read` para `delivered`).

## Gestão (Codex: rotas; Claude: tela)
- `GET /api/gestao/whatsapp`: conversas (uma por telefone, mais recente em cima, com as mensagens),
  e se a janela de 24 h está aberta (última ENTRADA há menos de 24 h); totais: enviados, entregues,
  lidos, recuperados (pagou depois do WhatsApp) e custo estimado (enviados × 0,32, constante).
- `POST /api/gestao/whatsapp/responder` (mesma origem, admin): texto livre até 1.000 caracteres, só se
  a janela de 24 h estiver aberta (conferido no servidor); envia pela API, grava como saída com
  `enviado_por`, registra no Registro da gestão. Site precisa de `WA_TOKEN` e `WA_PHONE_NUMBER_ID`
  (segredo/variável no painel do site).
- Tela: sub-aba **WhatsApp** dentro de Recuperação (lista, caixa Responder, aviso "Janela de 24 h
  fechada — o cliente precisa escrever de novo", totais). 404 para quem não é admin, como as outras.
- Coluna WhatsApp da lista: enviado / entregue / lido / falhou / sem celular / previsto (3 h) / desligado.

## Privacidade (Claude)
O WhatsApp informado pode receber **um** lembrete se a compra não for concluída; para cancelar,
tocar em "Não quero receber" ou responder SAIR (encerra os lembretes nos dois canais).

## O que sai
- `workers/recuperacao-carrinho/whatsapp.js` (Z-API/Evolution e textos semanais) → reescrito para a Meta.
- `app/api/whatsapp/webhook/route.js` e `lib/whatsapp-saida.js` (formato Z-API/Evolution, no site) → removidos;
  o webhook passa a morar no robô.
- Seguimento semanal (etapas 2–8) → removido.

## Provas (não avança sem provar a anterior)
1. Build limpo; checkout abre o Mercado Pago com e sem telefone e com telefone inválido (no ar, com um
   e-mail de teste, sem pagar).
2. Checkout com telefone → `carrinhos.telefone` gravado (DDD + número).
3. Webhook: verificação da Meta aprovada no painel; POST com assinatura falsa → 401.
4. `WA_MODO=teste` com o número de teste da Meta, carrinho recuado 4 h → o Paulo recebe; o botão abre o
   `/assinar` preenchido.
5. Rodar de novo → não reenvia; telefone de quem comprou → não envia; "Não quero receber" → descadastro + confirmação.
6. Paulo responde "teste" → chega no suporte@ e na sub-aba; resposta pela gestão chega no celular dele.
7. CPU do `/api/checkout` antes e depois (painel Observability; o wrangler tail não alcança daqui).

## Pontos de parada
1. SQL da 0008 antes de aplicar. 2. Segredos/variáveis (guia do usuário do sistema e token permanente;
o token nunca no chat). 3. Merge em `main`. 4. Migrar o número real (passo a passo antes). 5. `WA_MODO=ativo`.
