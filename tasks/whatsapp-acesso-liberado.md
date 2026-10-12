# Modelo de WhatsApp "acesso_liberado" (PONTO DE PARADA 1: aprovação do Paulo)

Mensagem automática que sai quando o pagamento é confirmado, para quem tem celular na compra.
É o mesmo número dos lembretes. Ainda NÃO foi enviada à Meta.

## Para cadastrar na Meta (WhatsApp Manager > Modelos de mensagem > Criar)

- **Categoria:** Utilidade (não Marketing: é aviso de uma compra feita)
- **Nome:** `acesso_liberado`
- **Idioma:** Português (BR)
- **Corpo** (a variável {{1}} é o primeiro nome; exemplo para a Meta: "Ana"):

  > Oi {{1}}, seu pagamento foi confirmado e seu acesso à Trilha Viva está liberado. Toque no botão abaixo para criar sua senha e baixar suas 2.000 multitracks. O link vale por 7 dias e só pode ser usado uma vez.

- **Botão:** "Visitar site", tipo **dinâmico**
  - Texto do botão: `Criar minha senha`
  - URL: `https://trilhaviva.org/criar-senha?t={{1}}`
  - Exemplo para a Meta: `https://trilhaviva.org/criar-senha?t=exemplo123`

O texto do corpo tem que ficar IGUAL ao de `textoAcesso()` em `lib/whatsapp-acesso.js`. Se mudar um, mude o outro.

## Como liga (depois que a Meta aprovar)

1. Painel da Cloudflare > Worker `www` > Settings > Variables: criar `WA_ACESSO` = `ativo`.
2. Deployments > Version History > **Promote version** (sem isso a variável não vale).
3. Uma compra de teste de R$ 1,00 com celular: tem de chegar a mensagem com o botão.

Enquanto `WA_ACESSO` não existir, nada sai e a compra segue igual (o e-mail continua indo).
A pausa geral do WhatsApp na gestão também segura esta mensagem.
Custo: mensagem de Utilidade no Brasil é mais barata que a de Marketing dos lembretes.
