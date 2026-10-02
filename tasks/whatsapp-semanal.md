# WhatsApp semanal — até 8 mensagens (muda tasks/whatsapp.md)

Branch: `whatsapp-semanal` (saiu de `main` em 02/10/2026). Pedido do Paulo em 02/10.
Continua tudo DESLIGADO (`MODO_WHATSAPP = "desligado"`): o Paulo tem o número mas ainda
não contratou o serviço (Z-API ou Evolution). Tudo o que tasks/whatsapp.md diz continua
valendo, EXCETO o que este arquivo muda.

## Decisões do Paulo (02/10)
- 1ª mensagem ~24 h depois do carrinho (como já está), depois UMA POR SEMANA, no máximo
  **8 mensagens** no total (~2 meses). Para antes se comprar, se responder SAIR ou se tocar
  no link de sair.
- Toda mensagem termina com "responda SAIR" E um link de sair com um toque (o mesmo
  descadastro assinado do e-mail).

## Divisão
- **Codex:** `migrations/0007_whatsapp_semanal.sql`, `workers/recuperacao-carrinho/whatsapp.js`,
  `workers/recuperacao-carrinho/index.js`, `lib/gestao/recuperacao.js`, testes em `tests/recuperacao/`.
- **Claude:** `components/gestao/Recuperacao.jsx`, `app/privacidade/page.js`, revisão, prova, publicação.

## Banco — migrations/0007_whatsapp_semanal.sql
A tabela `lembretes_enviados` tem `CHECK (etapa BETWEEN 1 AND 4)`; o WhatsApp precisa de 1 a 8.
SQLite não altera CHECK: recria a tabela (tem ~15 linhas; o D1 roda o arquivo de uma vez e
volta ao estado anterior se falhar).
```sql
CREATE TABLE lembretes_enviados_novo (
  carrinho_id TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 8),
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (carrinho_id, canal, etapa)
);
INSERT INTO lembretes_enviados_novo (carrinho_id, canal, etapa, enviado_em)
  SELECT carrinho_id, canal, etapa, enviado_em FROM lembretes_enviados;
DROP TABLE lembretes_enviados;
ALTER TABLE lembretes_enviados_novo RENAME TO lembretes_enviados;
CREATE INDEX IF NOT EXISTS idx_lembretes_enviado_em ON lembretes_enviados (enviado_em);

ALTER TABLE carrinhos ADD COLUMN whatsapp_etapa INTEGER NOT NULL DEFAULT 0;  -- quantas mensagens já saíram (0 a 8)
ALTER TABLE carrinhos ADD COLUMN proximo_whatsapp_em TEXT;                   -- quando sai a próxima
CREATE INDEX IF NOT EXISTS idx_carrinhos_proximo_whatsapp ON carrinhos (proximo_whatsapp_em);
```
- Compatível com o robô e o site atuais (o e-mail continua usando etapas 1 a 4).
- `whatsapp_enviado_em` continua sendo a data da 1ª mensagem.

## Robô
- **1ª mensagem:** igual a hoje (janela 24–72 h, bloqueios, reserva atômica de
  `lembretes_enviados` etapa 1). No sucesso, também: `whatsapp_etapa = 1`,
  `proximo_whatsapp_em = datetime('now', '+7 days')`.
- **Seguimento** (novo): carrinhos com `whatsapp_etapa BETWEEN 1 AND 7`,
  `proximo_whatsapp_em <= now`, `status IN ('aberto','lembrado')`, `telefone IS NOT NULL`.
  Antes de cada um: compra paga do e-mail ou descadastro do e-mail → `proximo_whatsapp_em = NULL`
  (para de vez; não envia). Senão reserva atômica da etapa N+1 (mesmo teto do dia, PK impede
  duplicata, o UPDATE confere `whatsapp_etapa = N`), envia, e no sucesso
  `whatsapp_etapa = N+1` e `proximo_whatsapp_em = +7 days` (ou NULL se N+1 = 8).
  Falha → apaga a reserva e `proximo_whatsapp_em = NULL` (para; serviço não oficial não tem
  idempotência, então não repete). Registrar a falha em `whatsapp_falhou_em` só se ainda NULL.
- Ordem na rodada: seguimentos primeiro, depois 1ªs mensagens. O limite de **3 por rodada**,
  o teto **WHATSAPP_TETO_DIA** (20) e o horário **9h–20h de Brasília** valem para a soma.
- Modo teste: só o `WHATSAPP_TESTE_PARA`, nas duas partes; os outros só no log, sem mexer na linha.
- Quem saiu por SAIR/link: o descadastro já bloqueia (checado antes de cada envio).

## Textos (montarWhatsapp(carrinho, env, etapa))
`{nome}` = primeiro nome, como hoje (sem nome: a saudação sem o nome).
`{link}` = `SITE_URL/assinar?r=<id>&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho-wa-<etapa>`
`{sair}` = o mesmo link de descadastro do e-mail: `SITE_URL/api/descadastrar?e=<email>&t=<assinarDescadastro(email, LEMBRETE_SEGREDO)>`.
Rodapé de TODAS as mensagens: `\n\nPara não receber mais, responda SAIR ou toque aqui: {sair}`
(substitui os rodapés "responda SAIR" de hoje).
- **Etapa 1:** as 3 variações de hoje (escolha estável pelo id), sem o rodapé antigo.
- **Etapas 2 a 7:** gira pelas 3 abaixo na ordem (etapa 2 → F1, 3 → F2, 4 → F3, 5 → F1, 6 → F2, 7 → F3):
  - F1: `Oi, {nome}! Aqui é da Trilha Viva de novo. Seu acesso às mais de 2.000 multitracks gospel continua esperando: clique, guia e cada instrumento no seu canal, para o ensaio e para o culto. Para concluir: {link}`
  - F2: `Olá, {nome}! Uma dica rápida da Trilha Viva: com multitrack, a banda ensaia com a mesma referência e o culto fica mais seguro. O acervo completo sai por R$ 89,90, pagamento único. Para garantir o seu: {link}`
  - F3: `Oi, {nome}, tudo bem? Passando para saber se ficou alguma dúvida sobre a Trilha Viva. É só responder esta mensagem. Se quiser concluir agora, com Pix ou cartão: {link}`
- **Etapa 8 (última):** `Oi, {nome}! Esta é a última mensagem da Trilha Viva sobre o seu acesso que ficou pela metade. Se ainda fizer sentido para o seu ministério, o acervo continua por R$ 89,90: {link}`
- Sem nome: "Oi!" / "Olá!" / "Oi, tudo bem?" no lugar da saudação com nome.

## Gestão (lib/gestao/recuperacao.js)
`whatsapp` de cada pessoa passa a ser:
`{ situacao, enviados: [{ etapa, enviado_em }], proximo_em, proxima_etapa, previsto_em }`
- `enviados`: lembretes_enviados canal 'whatsapp' do carrinho do protocolo (ou do carrinho que recebeu).
- `situacao`: `andamento` (≥1 enviada e `proximo_whatsapp_em` preenchido), `concluido` (8 enviadas),
  `parado` (≥1 enviada, sem próxima, < 8: comprou, saiu ou falhou), mais as que já existem
  (`sem_celular`, `comprou`, `falhou`, `previsto`, `nao_enviado`, `desligado`).
  O antigo `enviado` deixa de existir (vira andamento/concluido/parado). `desligado` continua
  substituindo `previsto`/`nao_enviado` quando o site não tem `WHATSAPP_ATIVO=sim`.
- `recuperado_pela_etapa` continua; para WhatsApp passa a ser a etapa da mensagem.
- CSV: coluna WhatsApp = `N de 8 enviadas` + situação; coluna nova "Próximo WhatsApp em".

## Testes
- textos por etapa (1 com variações, 2–7 girando, 8 a última), rodapé com SAIR e link de sair em todas.
- sequência 1→…→8 com +7 dias, para em 8; compra/descadastro no meio para; falha para sem repetir;
  limite 3 por rodada somando seguimento + 1ª; teto do dia; horário; modo teste.
- migração 0007 local: dados de lembretes_enviados preservados; etapa 8 aceita; etapa 9 recusada.
- gestão: andamento/concluido/parado, CSV.
