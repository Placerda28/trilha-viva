# Instagram da Trilha Viva — o que o Paulo precisa fazer na Meta (Etapa 0)

> Escrito em 10/11/2026 a partir da documentação oficial da Meta (developers.facebook.com). A Meta muda nomes de menu com frequência. Onde a documentação não deixa claro, está escrito **A CONFERIR NA TELA**: faça do jeito que a tela mostrar e me avise o que viu.

Mesmo estilo do passo a passo do WhatsApp: em cada etapa está o que me mandar no chat e o que **nunca** mandar.

**Caminho usado:** Instagram Messaging pela Plataforma Messenger, com **login do Facebook** e uma **Página do Facebook ligada ao Instagram**. Usamos o **mesmo app da Meta do WhatsApp** (`Trilha Viva Recuperacao`).

Tempo estimado: 40 a 60 min. A revisão do app (passo 9) leva dias.

---

## 1. Confirmar qual é o perfil
Qual é o Instagram da Trilha Viva: `@trilhavivamultitracks` ou `@_trilhaviva`?

> **Me mande no chat:** o @ certo. Todo o resto abaixo é feito com esse perfil.

## 2. Ligar a conta profissional a uma Página do Facebook
1. No app do Instagram (celular), entre no perfil certo. Vá em **Configurações** → **Tipo de conta e ferramentas** → confirme que é **Conta profissional** (comercial ou criador de conteúdo). Se for conta pessoal, troque para profissional. **A CONFERIR NA TELA** (o nome do menu muda).
2. Ainda no Instagram: **Editar perfil** → **Página** (ou **Links** → **Página**) → **Conectar uma Página existente**. Escolha a Página da Trilha Viva. **A CONFERIR NA TELA.**
3. Confira que essa Página está no portfólio empresarial **Trilha Viva**: em **https://business.facebook.com/settings** → **Contas** → **Páginas**. Se não estiver, **Adicionar** → **Adicionar uma Página**.
4. A conta do Facebook que você usa precisa poder **gerenciar mensagens** dessa Página (ter controle total sobre ela). Isso é exigência da Meta.
5. A Meta pede **autenticação em dois fatores** ligada na conta do Instagram/Facebook. Sem ela o envio dá erro 10/2534077.

> **Me mande no chat:** o nome da Página. Não é segredo.

## 3. Permitir acesso às mensagens no app do Instagram
No celular, no perfil da Trilha Viva:
**Configurações** → **Mensagens e respostas a stories** → **Controles de mensagens** → **Ferramentas conectadas** → ligue **Permitir acesso às mensagens**.
(Nome em inglês: *Messages and story replies > Message controls > Connected Tools > Allow Access to Messages*. **A CONFERIR NA TELA**: antigamente ficava em *Privacidade → Mensagens → Ferramentas conectadas*.)

Sem essa chave ligada, o app não recebe nem envia mensagens.

## 4. Adicionar o produto de mensagens do Instagram ao app
1. Entre em **https://developers.facebook.com** → **Meus apps** → `Trilha Viva Recuperacao`.
2. No menu da esquerda procure **Messenger** → **Configurações do Instagram** (*Messenger → Instagram settings*). Se não aparecer, clique em **Adicionar produto** (ou **Casos de uso** → **Adicionar caso de uso**) e adicione **Messenger** / **Instagram**. **A CONFERIR NA TELA**: a Meta está trocando "produtos" por "casos de uso" e libera a tela nova aos poucos.
3. Se a tela pedir um tipo de login, escolha **Login do Facebook** (não o "Login do Instagram").

## 5. Configurar o webhook (a Meta avisa o site quando chega mensagem)
Na tela do passo 4 (Messenger → Configurações do Instagram), na parte **Webhooks** (ou **Configurar webhooks**):
1. **URL de retorno** (*Callback URL*): `https://recuperacao-carrinho.trilha-viva.workers.dev/instagram`
2. **Token de verificação** (*Verify token*): uma frase nova, só letras e números, uns 30 caracteres, **diferente** da frase do WhatsApp. Ela é a variável `IG_VERIFY_TOKEN`. Guarde no gerenciador de senhas.
3. **Verificar e salvar.** Isso só funciona **depois** que eu avisar "robô publicado com a rota /instagram". Se der erro antes, é normal.
4. Em **Campos do webhook**, no objeto **Instagram**, clique em **Assinar** (*Subscribe*) em **messages**. Se aparecerem, assine também: `message_reactions`, `messaging_seen`, `messaging_postbacks`, `messaging_referral`. A Fase 1 só grava texto, mas é inofensivo. O campo de edição de mensagem (`message_edit`) pode aparecer na lista: **A CONFERIR NA TELA** (assinar não é obrigatório).
5. **Importante:** a Meta só manda avisos de webhook se o app estiver em modo **Ativo/Publicado** (*Live*). Veja no topo da página do app o interruptor **Modo do app**. O app do WhatsApp já pode estar publicado: **A CONFERIR NA TELA**. Se estiver em "Desenvolvimento", publique (é preciso ter política de privacidade e ícone; o site já tem `/privacidade`).

> **Me avise no chat:** "webhook salvo". **Nunca mande** a frase do `IG_VERIFY_TOKEN`.

## 6. Inscrever a Página no app (`subscribed_apps`)
Na documentação oficial, a inscrição é uma chamada `POST /{PAGE_ID}/subscribed_apps` com o token da Página, e a resposta certa é `{"success": true}`. O **painel de Configurações do Instagram (passo 4) pode fazer isso sozinho** ao conectar a Página e gerar o token (ferramenta "Gerar token" / "Adicionar conta"). **A CONFERIR NA TELA**: depois de conectar a Página no painel, veja se aparece "Página inscrita"/"Assinado".

Se **não** aparecer, eu faço a chamada para você depois que o passo 7 estiver pronto (precisa do token, que não pode passar pelo chat):

```
POST https://graph.facebook.com/{versão}/{IG_PAGE_ID}/subscribed_apps
     ?subscribed_fields=messages,message_reactions,messaging_seen
     (com o token da Página)
```

Para essa chamada o token precisa de `pages_manage_metadata` e `pages_messaging`. Rodamos juntos no PowerShell; você cola o token só no terminal.

## 7. Gerar o token permanente (usuário do sistema)
Você já tem o usuário do sistema `robo-trilha-viva` / `Trilhavivarobo` do WhatsApp. Vamos reusar.

1. **https://business.facebook.com/settings** → **Usuários → Usuários do sistema** → selecione o usuário.
2. **Atribuir ativos**:
   - **Apps** → `Trilha Viva Recuperacao` → **Controle total** (já feito no WhatsApp).
   - **Páginas** → a Página da Trilha Viva → **Controle total** (gerenciar mensagens incluído).
   - **Contas do Instagram** → o perfil da Trilha Viva → **Controle total**. **A CONFERIR NA TELA** (pode ser necessário em **Contas → Contas do Instagram** ligar o perfil ao portfólio antes).
3. **Gerar novo token** → app `Trilha Viva Recuperacao` → validade **Nunca** → marque as permissões:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_manage_metadata`
   - `pages_show_list`
   - `pages_messaging`
   - `pages_read_engagement` (a Meta pede para ler o nome e @ de quem escreve)
   - `business_management`

   Se alguma não aparecer na lista: **A CONFERIR NA TELA**. Algumas só aparecem quando o produto do passo 4 já foi adicionado.
4. Copie o token (começa com `EAA...`). Ele aparece uma vez só.

⚠️ **Pegadinha da documentação:** o envio de mensagem pede um **token de Página** ("Page access token"), não o token do usuário do sistema direto. A Meta diz que, quando o token do usuário é de longa duração (o do usuário do sistema "Nunca" é), o token da Página que sai dele **não vence**. Quem tira o token da Página sou eu, com uma chamada `GET /{IG_PAGE_ID}?fields=access_token` feita no seu terminal. O `IG_TOKEN` que vai para a Cloudflare será esse token da Página. **A CONFERIR NA TELA**: se o token do usuário do sistema já funcionar direto no envio, usamos ele mesmo; eu testo antes.

> **NUNCA cole o token no chat.** Ele vai direto para a Cloudflare (passo 8).

## 8. Achar os números `IG_PAGE_ID` e `IG_ACCOUNT_ID` (não são segredo)
- **IG_PAGE_ID** (número da Página do Facebook): na Página, **Configurações → Transparência da Página** ou **Sobre → Identificação da Página**; ou em **business.facebook.com/settings → Contas → Páginas** (o número aparece ao selecionar a Página). Também aparece no campo `id` da chamada `GET /me/accounts`.
- **IG_ACCOUNT_ID** (número da conta profissional do Instagram, começa com `1784...`): em **business.facebook.com/settings → Contas → Contas do Instagram** (ao selecionar a conta), ou na tela **Messenger → Configurações do Instagram** do app. **A CONFERIR NA TELA**: a documentação não explica onde fica no painel. Se não achar, eu descubro com `GET /{IG_PAGE_ID}?fields=instagram_business_account` quando tivermos o token.

> **Me mande no chat:** os dois números. Não são senha.

Colar os segredos (PowerShell, um bloco de cada vez; cole o valor e aperte Enter, nada aparece enquanto cola):
```powershell
cd "$HOME\C*dev\tv-instagram\workers\recuperacao-carrinho"
npx wrangler secret put IG_TOKEN
npx wrangler secret put IG_VERIFY_TOKEN
```
```powershell
cd "$HOME\C*dev\tv-instagram"
npx wrangler secret put IG_TOKEN
```
(`IG_TOKEN` = token do passo 7; `IG_VERIFY_TOKEN` = frase do passo 5.) A assinatura do aviso usa a **Chave secreta do app** que já está no robô como `WA_APP_SECRET`; como é o mesmo app, não precisa de nada novo.

> **Me avise no chat: "segredos do Instagram colados".** Só publico depois do seu OK.

## 9. Conta pessoal como testadora (para testar antes da revisão)
Enquanto o app não tem **Acesso Avançado**, ele só conversa com quem tem **função** no app. Faça assim:
1. **developers.facebook.com** → seu app → **Funções do app** → **Funções** → **Adicionar pessoas** → **Testadores** (*Testers*) (ou **Desenvolvedores**). Procure pela sua conta pessoal do Facebook. **A CONFERIR NA TELA** (o menu pode estar em "Funções do app → Funções").
2. Entre no Facebook com essa conta pessoal → **Configurações → Aplicativos e sites** (ou **Convites de função de app**) → **Aceitar** o convite. Link direto: **https://developers.facebook.com/settings/developer/requests/**. **A CONFERIR NA TELA.**
3. Para testar, use o Instagram dessa conta pessoal (o perfil que você vincular ao Facebook testador) e mande uma mensagem direta para o perfil da Trilha Viva.

⚠️ O Instagram pessoal que vai mandar a mensagem de teste precisa estar **ligado à conta do Facebook que é testadora**. **A CONFERIR NA TELA**: a Meta não detalha isso; se a mensagem não chegar, me avise.

## 10. Revisão do app (App Review) — Acesso Avançado em `instagram_manage_messages`
Sem ela só você e os testadores recebem resposta. Como a Trilha Viva usa o app **só para o próprio negócio**, a Meta indica o guia "Apps For Your Own Business".

Caminho: **developers.facebook.com** → app → **Revisão do app** → **Solicitações** (*App Review → Requests*) → **Solicitar permissões ou recursos**. Peça:
- `instagram_manage_messages`
- `business_management` (a Meta diz que é dependência de `instagram_manage_messages`; avisar isso no texto)
- `pages_manage_metadata` e `pages_show_list`, se a tela exigir (**A CONFERIR NA TELA**)
- `pages_messaging` e `pages_read_engagement`, se a tela exigir

O que a Meta pede para `instagram_manage_messages` (documentação oficial):
1. **Dizer o tipo do app:** automático, caixa de entrada própria (*custom inbox*) ou os dois. O nosso é **caixa de entrada própria** (Gestão), escolha **Agente humano** (*Live Agent*) como experiência principal.
2. **Explicar como iniciar uma conversa** (mandar uma mensagem para o perfil da Trilha Viva).
3. **Informar o @ do perfil.**
4. **Vídeo de tela** mostrando: como começar a conversa; como o app processa a mensagem (a mensagem chegando na aba Instagram da Gestão); como trata mensagens "não enviadas"/apagadas. Para `business_management`, mostrar um administrador entrando pelo login do Facebook e escolhendo a Página/perfil.
5. Em **Verificação**, plataforma **Site** com `https://trilhaviva.org`, e deixar **Credenciais** em branco.
6. Provavelmente também: **verificação do negócio** e **uso de dados** (*Data Use Checkup*). A página oficial de revisão não confirma isso: **A CONFERIR NA TELA.**

Eu preparo o roteiro do vídeo e os textos de justificativa em português e inglês quando chegar a hora (depois de a aba Instagram da Gestão estar pronta, porque o vídeo mostra ela).

---

## Resumo do que vai para o chat e do que não vai
| Pode mandar no chat | Nunca mande no chat |
|---|---|
| O @ do perfil e o nome da Página | Token (`EAA...`) |
| IG_PAGE_ID e IG_ACCOUNT_ID | Chave secreta do app |
| "webhook salvo", "segredos do Instagram colados" | Frase do `IG_VERIFY_TOKEN` |
| Mensagens de erro (sem segredo nelas) | Senhas e códigos de verificação |

## Fontes oficiais usadas
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/get-started
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks
- https://developers.facebook.com/documentation/instagram-platform/webhooks/setup.md
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-your-own-business.md
- https://developers.facebook.com/docs/messenger-platform/error-codes
