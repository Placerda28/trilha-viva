# Robô de conversão dos leads da VS grátis (início 05/11/2026)

Branch `leads-robo` (C:\dev\tv-afiliados), base `main` c1dccef.

## Como estava em 05/11
- Robô de e-mail já existia (`workers/recuperacao-carrinho/leads.js`, desde 22/10):
  - e-mail 1 sai na hora;
  - e-mails 2, 3 e 4 saem em +2, +4 e +7 dias.
- Banco em produção: 12 leads, 1 compra (8,33%). 5 leads tinham completado os 4 e-mails, 4 estavam no 3º, 2 no começo e 1 tinha se descadastrado.
- Leads não recebiam nada pelo WhatsApp.

## Decisões do Paulo (05/11)
- **WhatsApp**:
  - msg 1 sai 5 min depois do pedido da VS;
  - msg 2, 3 e 4 saem em +3, +5 e +7 dias (contados do pedido);
  - depois o WhatsApp para.
- **E-mail** segue o mesmo padrão (na hora, +3, +5, +7). Depois vem **1 e-mail por mês durante 4 meses** (+30, +60, +90, +120 dias depois do 7º dia) e o e-mail para.
- **Fim do processo**: depois do último envio, o lead fica marcado como **processo encerrado**, com **convertido sim/não**.
  - O processo também encerra antes se o lead comprar, se descadastrar ou se a Gestão parar.
- **Oferta**: preço normal (R$ 89,90), sem cupom.
- **Leads que já existem** e não compraram nem se descadastraram:
  - assim que a atualização for publicada, recebem a msg 1 de WhatsApp e seguem o fluxo a partir daí;
  - no e-mail, continuam de onde estão (quem já recebeu os 4 entra na fase mensal). Confirmar com o Paulo.
- **Gestão > Leads VS grátis**:
  - etapa de cada lead (e-mail e WhatsApp, próximo envio, encerrado, convertido);
  - funil de conversão;
  - botões "parar" e "enviar agora".

## Pendências do Paulo
- Aprovar os textos dos 4 modelos de WhatsApp. Depois disso, eles são cadastrados na Meta (categoria Marketing) e aguardam a aprovação dela.
- Confirmar se o consentimento do formulário da VS grátis cobre receber oferta por WhatsApp.
- Custo estimado: ~R$ 0,35 a 0,60 por mensagem de marketing, ou seja, até ~R$ 2,40 por lead (4 mensagens).

## Fases
- [x] 1. (05/11, na branch, sem commit; falta o Paulo aplicar a 0023 no D1 remoto) Backend: sequência de WhatsApp para leads, novo cronograma de e-mail com fase mensal, estado encerrado/convertido, rotas da Gestão (etapa, funil, parar, enviar agora) e testes.
- [ ] 2. Telas da Gestão > Leads VS grátis.
- [ ] 3. Modelos de WhatsApp aprovados na Meta.
- [ ] 4. Publicação (migração, site, robô) e prova com um lead de teste.
