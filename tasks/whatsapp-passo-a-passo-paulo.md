# WhatsApp da Trilha Viva — o que o Paulo precisa fazer (e o Claude não consegue)

> **Andamento (02/10):** Etapa A feita pelo Paulo. Número de teste 1361467643717151, conta 1605027684651104, celular de teste 27 99625-3839 cadastrado, modelo carrinho_lembrete em análise, usuário do sistema "Trilhavivarobo" criado. Falta colar os segredos (A6). Na Etapa C, o número real entra na MESMA conta (1605027684651104).

São coisas que exigem o seu login na Meta, o seu celular ou um segredo que não pode passar pelo chat.
Faça na ordem. Em cada etapa está escrito **o que me mandar no chat** e **o que NUNCA mandar**.

Tempo estimado: Etapa A ~40 min (mais a espera da aprovação do modelo, de minutos a 1 dia).
A Etapa B leva 5 min e é feita depois que eu avisar. A Etapa C fica para o fim, depois de tudo provado.

---

## Etapa A — agora (com o número de TESTE da Meta; o seu WhatsApp continua funcionando normal)

### A1. Criar o app de desenvolvedor
1. Entre em **https://developers.facebook.com** com o mesmo Facebook que administra a Trilha Viva no Meta Business
   (o mesmo do Pixel). Se pedir, aceite virar desenvolvedor (confirma celular/e-mail).
2. Clique em **Meus apps** → **Criar app**.
3. Nome do app: `Trilha Viva Recuperacao`. E-mail de contato: `trilhaviva.suporte@gmail.com`.
4. Caso de uso: escolha **"Conectar-se com clientes pelo WhatsApp"**
   (se não aparecer: **Outro** → tipo **Empresa**).
5. Portfólio empresarial: escolha o da **Trilha Viva** (o mesmo do Pixel). Conclua.

### A2. Pegar o número de teste e cadastrar o seu celular
1. Dentro do app, menu da esquerda: **WhatsApp → Configuração da API** (em inglês, *API Setup*).
2. A Meta já mostra um **número de teste** em "De" (*From*). Não precisa fazer nada com ele.
3. Em **"Para"** (*To*) → **Gerenciar lista de números** → adicione o **seu celular** → digite o código
   que chega no seu WhatsApp. (Dá para cadastrar até 5 números; cadastre só o seu por enquanto.)
4. Clique em **Enviar mensagem** (o "hello_world" de exemplo) e confira que chegou no seu celular.
5. Na mesma tela, copie dois números:
   - **Identificação do número de telefone** (*Phone number ID*)
   - **Identificação da conta do WhatsApp Business** (*WhatsApp Business Account ID*)

> **Me mande no chat:** os dois IDs acima e o seu celular cadastrado (com DDD). Eles não são senha.
> **Não use** o "token de acesso temporário" dessa tela: ele vence em 24 h. O definitivo vem no A4.

### A3. Criar o modelo de mensagem `carrinho_lembrete`
1. Entre em **https://business.facebook.com/wa/manage/message-templates** (WhatsApp Manager → Modelos de mensagem).
   No topo, confira que está na **conta do WhatsApp do app de teste** (a do A2).
2. **Criar modelo**.
   - Categoria: **Marketing** → tipo **Padrão / Personalizado** (*Default / Custom*).
   - Nome: `carrinho_lembrete` (exatamente assim, minúsculo, com sublinhado).
   - Idioma: **Português (BR)**.
3. **Corpo** (copie e cole; o `{{1}}` é o lugar do nome):
   ```
   Oi, {{1}}! Seu acesso à Trilha Viva ficou pela metade. 🎶
   São 2.000 multitracks gospel por R$ 89,90, pagamento único e acesso vitalício.
   O preço de lançamento ainda está de pé — Pix ou cartão, acesso na hora.
   ```
   Exemplo para a variável `{{1}}`: `Paulo`
4. **Botões** → adicione dois:
   - **Visitar site** (*Visit website*) → texto do botão: `Finalizar compra` → tipo de URL: **Dinâmica** →
     URL: `https://trilhaviva.org/assinar?{{1}}` → exemplo: `r=exemplo&utm_source=whatsapp`
   - **Resposta rápida** (*Quick reply*) → texto: `Não quero receber`
5. **Enviar para análise.** A aprovação costuma sair em minutos (às vezes até 1 dia). O status aparece na lista.

> **Me avise no chat** quando estiver **Aprovado** (ou cole o motivo, se recusarem).

### A4. Criar o usuário do sistema e o token permanente
1. Entre em **https://business.facebook.com/settings** (Configurações do negócio).
2. **Usuários → Usuários do sistema → Adicionar**. Nome: `robo-trilha-viva`. Função: **Administrador**.
3. Com ele selecionado: **Atribuir ativos**:
   - **Apps** → `Trilha Viva Recuperacao` → **Controle total**.
   - **Contas do WhatsApp** → a conta do A2 → **Controle total**.
4. **Gerar novo token**:
   - App: `Trilha Viva Recuperacao`
   - Validade: **Nunca**
   - Permissões: marque **whatsapp_business_messaging** e **whatsapp_business_management**
   - **Gerar** → **copie o token** (começa com `EAA...`). Ele aparece **uma vez só**.
     Guarde num lugar seguro (gerenciador de senhas) até o A6.

> **NUNCA cole o token no chat.** Ele vai direto para a Cloudflare no A6.

### A5. Pegar a "Chave secreta do app" e inventar a "frase de verificação"
1. Em **developers.facebook.com** → seu app → **Configurações do app → Básico** →
   **Chave secreta do aplicativo** (*App secret*) → **Mostrar** → copie.
2. Invente uma **frase de verificação** sem espaços, só letras e números, com uns 30 caracteres
   (ex.: digite qualquer sequência). Ela será usada duas vezes: no A6 e na Etapa B.

> **NUNCA cole** a chave secreta nem a frase no chat.

### A6. Colar os segredos na Cloudflare (pelo terminal do Windows)
Abra o **PowerShell** (menu Iniciar → "PowerShell"). Copie e rode um bloco de cada vez.
Em cada `secret put`, o terminal pergunta *"Enter a secret value"*: **cole o valor e aperte Enter**
(nada aparece enquanto cola; é normal).

**Robô** (envia as mensagens e recebe as respostas):
```powershell
cd "$HOME\C*dev\trilha-viva\workers\recuperacao-carrinho"
npx wrangler secret put WA_TOKEN
npx wrangler secret put WA_APP_SECRET
npx wrangler secret put WA_VERIFY_TOKEN
```
(1º cole o token do A4; 2º a chave secreta do A5; 3º a frase do A5.)

**Site** (para você responder clientes pela gestão):
```powershell
cd "$HOME\C*dev\trilha-viva"
npx wrangler secret put WA_TOKEN
```
(cole o mesmo token do A4.)

> Se aparecer *"Success! Uploaded secret ..."* em cada um, deu certo. **Me avise no chat: "segredos colados".**
> Se o `cd` reclamar de pasta, me mande a mensagem de erro (sem segredo nenhum nela).

### A7. Forma de pagamento (para quando sair do teste)
O número de teste é gratuito. Para o número real (Etapa C), a Meta cobra cerca de R$ 0,32 por mensagem:
**WhatsApp Manager → Configurações / Faturamento e pagamento** → adicione um cartão. Pode deixar para a Etapa C.

---

## Etapa B — depois que eu avisar "robô publicado com o webhook" (5 min)

1. **developers.facebook.com** → seu app → **WhatsApp → Configuração** (*Configuration*) → **Webhook** → **Editar**.
2. **URL de retorno** (*Callback URL*): `https://recuperacao-carrinho.trilha-viva.workers.dev/whatsapp`
3. **Token de verificação** (*Verify token*): a **mesma frase** do A5.
4. **Verificar e salvar.** Se der erro, me avise (sem colar a frase).
5. Logo abaixo, em **Campos do webhook** (*Webhook fields*): clique em **Assinar** (*Subscribe*) na linha **messages**.

> **Me avise no chat: "webhook salvo".** Aí eu faço as provas com você: você recebe a mensagem de teste,
> toca no botão, responde "teste" e eu confiro que chegou no e-mail e na gestão.

---

## Etapa C — só no fim, depois de todas as provas com o número de teste

⚠️ **Depois disto, o aplicativo WhatsApp Business para de funcionar no seu número.** As conversas
dele não vão para a API. A partir daí, você lê e responde clientes pela **gestão do site** (aba Recuperação → WhatsApp)
e pelo e-mail `trilhaviva.suporte@gmail.com`.

1. **Exporte as conversas importantes** no celular: abra a conversa → ⋮ → **Mais → Exportar conversa** → mande para o seu e-mail ou Drive.
2. No celular: **WhatsApp Business → Configurações → Conta → Apagar minha conta**. Espere uns 5 minutos.
3. **WhatsApp Manager → Números de telefone → Adicionar número**:
   - Nome de exibição: `Trilha Viva` (a Meta analisa o nome; leva de minutos a dias).
   - Categoria: Educação ou Entretenimento.
   - Digite o seu número e confirme com o **código por SMS ou ligação**.
   - Crie o **PIN de 6 dígitos** que ela pedir e guarde.
4. Recrie o modelo `carrinho_lembrete` (A3) **nesta conta**, se ela não for a mesma do teste, e espere aprovar.
5. Cadastre a forma de pagamento (A7).
6. **Me mande no chat** o novo *Phone number ID* (e o novo *WhatsApp Business Account ID*, se mudou).
   Eu troco no robô e refazemos a prova com o número real.
7. Só depois de você receber e aprovar a mensagem pelo número real: me diga **"pode ligar"** e eu passo para `ativo`.

---

## Resumo do que vai para o chat e do que não vai
| Pode mandar no chat | Nunca mande no chat |
|---|---|
| Phone number ID, WhatsApp Business Account ID | Token (`EAA...`) |
| Seu celular de teste | Chave secreta do app |
| "Modelo aprovado", "segredos colados", "webhook salvo" | Frase de verificação |
| Mensagens de erro (confira que não têm segredo) | PIN de 6 dígitos |
