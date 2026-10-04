# WhatsApp em sequência — plano A (04/10/2026)

Branch `whatsapp-sequencia` (saiu de main 5307bea). Pedido do Paulo/Cowork em 04/10.
Regra: 1ª 3 h depois do carrinho; depois 1 por semana (contada da 1ª) até 9 no total; só 9h–20h de Brasília;
da 2ª em diante nunca no dia de um e-mail (vai para as 9h do dia seguinte). Para: compra (telefone ou e-mail),
pedido de saída, 2 últimas não entregues, 3 últimas entregues e não lidas, qualquer resposta (pausa; a gestão retoma).
Uma sequência por telefone/e-mail; nova só 60 dias depois de encerrada. Carrinho com mais de 48 h não entra.
Modelos: 1ª carrinho_lembrete; depois preço → acervo → lembrete, só APPROVED (consulta à Meta no máx. a cada 30 min).

## Estado em produção conferido (04/10, só leitura)
- [x] whatsapp_estado = ativo; modelo APPROVED (conferido 17:50 UTC). Teste para o Paulo enviado 17:50:16 UTC (14:50 Brasília), a Meta aceitou (tem id) e não houve aviso de falha.
- [x] Ligado pela gestão por paulohenrique_ls@hotmail.com em 04/10 17:51:37 UTC (14:51 Brasília), 1 min depois do teste. Os links LIGAR/NÃO LIGAR foram apagados nessa hora (já não valem).
- [x] Envios reais: Jonathas (entregue) e Guilherme Freire (lido), os dois em 04/10 ~18:00 UTC (15:00 Brasília). Freio de 10/dia até 07/10 17:51 UTC.

## Feito e provado (local)
- [x] migrations/0010_whatsapp_sequencia.sql (NÃO aplicada em produção): lembretes_enviados aceita etapa 1–9 e guarda modelo, wa_msg_id, wa_status, wa_status_em, wa_erro; carrinhos.whatsapp_encerrado_em/whatsapp_motivo; tabela whatsapp_modelos; quem já recebeu a 1ª vira "1 de 9" com a 2ª uma semana depois.
- [x] lib/whatsapp-sequencia.js: regras puras (horário, dia de e-mail, semanas, paradas, rodízio), usadas pelo robô e pela gestão.
- [x] Robô: fila única 1ªs + semanais por ordem de vez (quem passou do teto sai primeiro amanhã); teto conta todas; varredura de compra/descadastro a cada rodada; resposta/SAIR param na hora pelo webhook; status por mensagem com a hora (ex.: lido 15:02); erro da conta (cartão, token) adia para amanhã sem contar contra a pessoa, erro do número (131026 etc.) conta como não entregue; link com utm_content=semanaN.
- [x] Resumo diário: enviadas/entregues/lidas por mensagem (1ª, 2ª...), voltaram ao checkout pelo botão (por semanaN), compraram hoje depois de um WhatsApp, sequências que pararam hoje por motivo, recusas.
- [x] Checkout guarda o utm_content na origem do carrinho (utm=whatsapp/lembrete/carrinho/semanaN).
- [x] Gestão → Recuperação: coluna WhatsApp com 9 casas no padrão dos e-mails (escura = lida, meio-tom = entregue, contorno = enviada/próxima, vermelha = não entregue com o código ao tocar), "1º enviado ... · lido 15:02" e "2º previsto ..." ou "Encerrado: motivo".
- [x] Gestão → Recuperação → WhatsApp: lista de sequências ("Mensagem X de 9", próxima, motivo), botão Parar sequência (com confirmação) e Retomar (só quem respondeu); rota POST /api/gestao/whatsapp/sequencia só admin, registrada. Consultas únicas, sem uma por linha.
- [x] Privacidade: até nove lembretes, um por semana.
- [x] Provas: 147 testes (19 novos: horário, 9 semanas e fim, os 5 motivos, dia de e-mail, rodízio pulando não aprovado, > 48 h, teto empurrando para amanhã, mesmo telefone = 1 sequência e 60 dias, erro da conta x do número, migração, parar/retomar); teste de mutação (quebrar a regra do e-mail e a do "não lê" derruba 4 testes); Meta simulada (modelos aprovados/não, delivered/read/failed pelo webhook assinado); next build e build do OpenNext limpos; dry-run do robô limpo.
- [x] Telas no site montado localmente (banco local com pessoas fictícias), 1280 e 390: sem erro no console, sem rolagem lateral; cópia fictícia do Guilherme mostra "1º enviado 04/10/2026 15:00 · lido 15:02" e "2º previsto 12/10/2026 09:00".

## Decisão tomada no caminho (confirmar com o Paulo)
- A regra "nunca no dia de um e-mail" vale da 2ª em diante. A 1ª (3 h depois) cai quase sempre no dia do 1º e-mail (1 h depois); aplicar a regra a ela empurraria todas as 1ªs para o dia seguinte. Se o Paulo quiser que valha também para a 1ª, é uma linha.

## Custo
- R$ 0,32 por mensagem de marketing. Pior caso: 9 × R$ 0,32 ≈ R$ 2,90 por carrinho. As paradas (compra, sair, não entregue, não lê, respondeu) derrubam bastante.

## Falta (pontos de parada)
- [ ] OK do Paulo para aplicar a 0010 no D1 de produção (SQL no arquivo; mostrar antes).
- [ ] OK do Paulo para merge em main e deploy do site e do robô (a ordem: migração → robô → site).
- [ ] Depois do deploy: conferir na tela real (computador e celular) o Guilherme com "1º enviado 04/10 15:00 · lido" e "2º previsto 12/10"; CPU do cron no painel (Observability) nas primeiras rodadas.
- [ ] carrinho_preco e carrinho_acervo em análise na Meta: até aprovarem, a 2ª em diante sai com o carrinho_lembrete (o robô troca sozinho quando aprovar).

---

# WhatsApp pela API oficial da Meta (02/10/2026)

Branch `recuperacao-whatsapp`. Plano: tasks/recuperacao-whatsapp.md. Passo a passo do Paulo: tasks/whatsapp-passo-a-passo-paulo.md.
Decisões do Paulo (02/10): API oficial da Meta (não Z-API), UMA mensagem 3 h depois do carrinho, celular opcional. Substitui a versão não oficial (desligada, nunca enviou nada).
Codex indisponível (a conta do ChatGPT recusou gpt-6.1-sol, gpt-5.4 e spark; ~/.codex/config.toml aponta para gpt-6.1-sol): backend feito pelo Claude.
- [x] 0008 escrita (whatsapp_msg_id, whatsapp_status, tabela whatsapp_mensagens) — NÃO aplicada em produção (ponto de parada 1)
- [x] lib/whatsapp-meta.js (modelo, texto livre, assinatura X-Hub-Signature-256, telefone com DDD 55 preservado)
- [x] Robô: envio 3–48 h, 9h–20h, teto 30/dia, WA_MODO=teste filtra o celular de teste, uma por telefone/e-mail, erro não repete; /whatsapp: verificação GET, POST assinado (401 se falso), SAIR/botão → descadastro + confirmação, outras → tabela + e-mail ao suporte, status sem regredir; e-mail e WhatsApp independentes na rodada
- [x] Checkout com celular opcional (vazio/inválido → NULL); link do botão só com o código do carrinho
- [x] Gestão: coluna WhatsApp com status da Meta; sub-aba WhatsApp (totais, custo estimado, conversas, resposta só na janela de 24 h conferida no servidor, registro "respondeu no WhatsApp")
- [x] Privacidade: um lembrete pelo WhatsApp, "Não quero receber" ou SAIR
- [x] `npm test` 102/102; build limpo
- [x] Prova LOCAL: webhook GET certo 200 com o desafio, errado 404, raiz 404; assinatura falsa 401; mensagem comum gravada uma vez (repetida não duplica); botão "Não quero receber" descadastrou o e-mail certo; checkout com celular inválido seguiu para o pagamento e gravou telefone NULL; telas 1280/390 sem erro (sub-aba marcada, totais no celular)
- [x] 0008 APLICADA em produção em 02/10 (Paulo liberou). 17 carrinhos, 13 compras, R$ 811,60 intactos.
- [x] Merge em main (c00a07d), site 9c943d76 (com .env.local; vars WA_PHONE_NUMBER_ID e WA_GRAPH_VERSION no wrangler.jsonc, keep_vars mantido), robô bbe757e9 (WA_MODO=teste, número de teste 1361467643717151, celular de teste 27996253839).
  - Provas 1 e 2 NO AR: checkout abre o Mercado Pago sem telefone, com telefone inválido e com válido (e-mail do Paulo, que já tem compra: nenhum lembrete sai); só o válido gravou 27996253839. Gestão WhatsApp e responder sem login: 404. Webhook do robô 404 até os segredos existirem.
- [x] Paulo: Etapa A (app, número de teste, conta 1605027684651104, modelo em análise, usuário do sistema Trilhavivarobo)
- [x] Segredos (03/10, 00h28–01h42 UTC): robô WA_TOKEN, WA_APP_SECRET, WA_VERIFY_TOKEN (Secret Change, valem na hora; webhook sem assinatura passou a dar 401); site WA_TOKEN pelo painel (o secret put do terminal não gravou), versão e9087870 a 100%, ADMIN_MASTER/EMAIL_FROM/WA_* preservados, site e checkout normais.
  - [ ] Paulo: confirmar que o 1º token (colado no chat em 02/10) foi revogado.
- [x] Etapa B (03/10): webhook verificado pela Meta, campo messages assinado (v26.0). Robô e site passaram para WA_GRAPH_VERSION=v26.0 (robô efe0dc48).
- [x] App da Meta publicado (03/10). Privacidade ganhou "WhatsApp" e "#exclusao-de-dados" para a Meta.
- [x] WhatsApp OBRIGATÓRIO no checkout, como o e-mail (pedido do Paulo, 03/10; site 9ca826ce). No ar: vazio e inválido → 400 "Informe seu WhatsApp com DDD.", válido abre o Mercado Pago.
- [ ] Modelo carrinho_lembrete aprovado → provas 4 a 6 com o celular do Paulo
- [x] Webhook provado em 03/10 09:42 pelo botão "Teste" do painel (gestão + e-mail do suporte OK); linha de teste apagada do D1.
- [x] 03/10: webhook ignora outro phone_number_id e não grava número estrangeiro (f304706); robô 3122c099.
- [x] 03/10: número de teste da Meta abandonado (hello_world para 5527996253839 voltou failed, erro 130497 "restricted from messaging users in this country"); conta de teste 1605027684651104 bateu no limite de números.
- [x] 03/10: número real +55 27 99291-2872 ("Trilha Viva", Conectado) numa WABA nova 2270775880440864, phone_number_id 1463806263472529. Trilhavivarobo com controle total na WABA nova; webhooks assinados; carrinho_lembrete recriado (em análise), hello_world ativo (Cowork/Paulo pelo painel).
- [x] 03/10: IDs novos no site e no robô (603e21b), WA_MODO segue teste. Site www 15792e58, robô 26728038. Smoke: home/privacidade 200, gestão 404 deslogado, webhook sem assinatura 401, segredos WA_* presentes.
- [x] Prova 3 com o número real (03/10): "oi" de 5527996253839 às 15:56 → webhook 200, D1 (whatsapp_mensagens id 2), gestão e e-mail do suporte OK; resposta pela gestão às 15:57 (id 3) chegou no celular; Meta mandou 3 avisos de status (15:57:04/05/12). Status de resposta manual não é guardado (só o do lembrete, em carrinhos); totais da gestão contam só lembretes — mantido.
- [ ] Teste do SAIR — só com OK do Paulo (descadastra os e-mails ligados ao telefone)
- [ ] Paulo: cartão na Meta (Etapa 2 → informações de pagamento) — sem isso o lembrete não sai
- [ ] Teste completo do lembrete com cartão + modelo aprovado (recuar data do carrinho só com autorização): mensagem, botão Finalizar compra → /assinar preenchido, botão Não quero receber
- [ ] Ligar de verdade (WA_MODO=ativo, WHATSAPP_ATIVO=sim) só depois do lembrete e do SAIR aprovados
- [ ] Recomendado: verificação da empresa na Meta (evita 130497, aumenta limite)
- [ ] Coluna WhatsApp em Clientes (branch clientes-whatsapp): telefone do carrinho mais recente do mesmo e-mail (pago primeiro), na mesma consulta; link wa.me; planilha com coluna WhatsApp; 106 testes, build limpo; 8 de 18 clientes têm número em produção. Falta: OK do Paulo → merge/deploy → conferir na tela e na planilha
- [ ] carrinho_lembrete aprovado na WABA nova → teste completo do lembrete (recuar data do carrinho só com autorização)
- [x] 03/10: cliente Rafael Cunha (id 19, compra 30, Pix R$ 89,90): e-mail "rafacunha46@gmail.comr" → "rafacunha46@gmail.com" no cliente e no carrinho (SQL em produção + SELECT). Sem conta de senha; não havia outro cliente com o e-mail certo. A linha de tentativa de login (histórico) ficou como estava.
- [ ] Reenviar o acesso do Rafael: gestão → Clientes → Rafael → "Corrigir e-mail" → "Só reenviar o acesso para rafacunha46@gmail.com"; conferir no Resend que entregou.
- [x] 03/10: botão "Corrigir e-mail" + "Reenviar acesso" na aba Clientes (lib/gestao/corrigir-email.js, rotas /api/gestao/clientes/email e /acesso). Troca cliente, carrinhos e descadastro numa transação; compras/sessões seguem pelo id. Quem tem senha: troca também na Supabase (antes). Recusa e-mail de outro cliente, da equipe ou do master. Reenvio: criar senha (7 dias) ou redefinir (24 h) se já tem senha. Registro com antes/depois. 127 testes (7 novos), build limpo.
- [ ] SE as vendas caírem: tornar o WhatsApp OPCIONAL no checkout (decisão do Paulo em 03/10: fica obrigatório por enquanto).
  - O que muda: desfazer o commit 0707985 ("WhatsApp obrigatorio no checkout") — 3 arquivos: a tela do checkout (components/CheckoutForm.jsx: tira a obrigatoriedade e o aviso "Informe seu WhatsApp com DDD."), a API (app/api/checkout/route.js: aceita sem telefone, mas recusa número inválido se for preenchido) e a frase da política de privacidade.
  - Precisa de deploy do site (o robô não muda). Banco não muda.
  - Tempo: cerca de 30 a 40 min com testes, build, deploy e conferência no ar.
  - Efeito: quem não preencher o WhatsApp não recebe o lembrete por WhatsApp (o e-mail continua).
- [ ] Ligar sem deploy (branch whatsapp-ligar-automatico, abd2091) — substitui o "ligar de verdade" manual (WA_MODO/WHATSAPP_ATIVO):
  - estado no banco (migração 0009: whatsapp_estado + carrinhos.whatsapp_erro): aguardando_modelo → teste_enviado → ativo | pausado. WA_MODO vira trava geral.
  - robô confere o modelo a cada 30 min; recusado → e-mail com motivo (1 vez por motivo); aprovado → teste para o Paulo (9h–20h, no máx. 1 a cada 6 h; erro → e-mail explicando) → e-mail com LIGAR / NÃO LIGAR (HMAC WA_LINK_SEGREDO, uso único, 72 h; GET só mostra botão, POST muda).
  - teste não entregue avisado pelo webhook (failed) → volta a aguardar + e-mail. Ligado: teto 10/dia nos 3 primeiros dias, resumo diário depois das 20h, carrinhos só dentro de 48 h.
  - gestão → Recuperação → WhatsApp: estado + Ligar / Pausar / Retomar (só admin, registrado). "Desligado" da aba Pessoas vem do estado; WHATSAPP_ATIVO não é mais usado.
  - provas: 117 testes (13 novos), build limpo, simulação no wrangler dev local (GET 200 / link falso 410 / POST liga / reuso 410).
  - [x] 03/10: migração 0009 em produção (SELECT: estado aguardando_modelo, coluna whatsapp_erro, 30 carrinhos intactos); WA_LINK_SEGREDO gerado e gravado direto no robô.
  - [x] 03/10: publicado com a coluna WhatsApp em Clientes. Site www 7355a902; robô 2b71dcfb (WA_MODO=ativo). main 1b34eb1. 120 testes, build limpo.
  - [x] Prova WA_MODO=ativo + aguardando_modelo: teste automático (só a consulta do modelo) + produção: consulta às 19:40 (modo teste) e 20:10 UTC (modo ativo) = PENDING; 0 enviados, 0 reservas, nenhuma saída nova.
  - [x] Smoke: home/privacidade 200; gestão e rotas novas 404 sem login; webhook sem assinatura 401; link falso 410; checkout recusa sem/inválido e abre o Mercado Pago com número válido.
  - [ ] Paulo/Cowork: conferir /gestao/clientes (coluna WhatsApp), a planilha e Recuperação → WhatsApp ("Aguardando aprovação da Meta").
  - [ ] Quando a Meta aprovar: teste chega no celular do Paulo + e-mail com LIGAR → conferir e tocar em LIGAR.
- [ ] Futuro: mensagens do Direct do Instagram e do Messenger da Página não chegam (são outros canais); só quem cai no WhatsApp aparece na gestão.
- [ ] Prova 7: CPU do /api/checkout no painel Observability
- [ ] Pontos de parada 4 e 5: migrar o número real e WA_MODO=ativo

---

# WhatsApp semanal — até 8 mensagens, publicado DESLIGADO (02/10/2026)

Branch `whatsapp-semanal`. Contrato: tasks/whatsapp-semanal.md (muda tasks/whatsapp.md).
Decisões do Paulo: 1ª mensagem ~1 h depois do carrinho (junto do 1º e-mail), depois uma por semana, no máximo 8 (~2 meses); para se comprar, responder SAIR ou tocar no link de sair (o mesmo descadastro assinado do e-mail). Serviço (Z-API ou Evolution) ainda não contratado.
- [x] (C) 0007: lembretes_enviados recriada com etapa 1–8 (dados preservados: 9 lembretes de e-mail), carrinhos.whatsapp_etapa e proximo_whatsapp_em. APLICADA em produção em 02/10.
- [x] (C) Robô: seguimentos antes das 1ªs; 3 por rodada somando tudo; teto 20/dia; 9h–20h; textos por etapa (1 com 3 variações, 2–7 girando F1/F2/F3, 8 a última); rodapé "responda SAIR ou toque aqui: <link>"
- [x] (C) Gestão: N de 8 enviadas, próxima, parou/concluído; CSV com "Próximo WhatsApp em"
- [x] (F) Tela e privacidade (até oito mensagens, formas de sair)
- [x] Revisão/prova local, 3 correções: janela da 1ª mensagem 1–48 h (pedido do Paulo durante o trabalho do Codex); WhatsApp independente do status do e-mail (antes, uma falha no e-mail marcava 'ignorado' e a pessoa ficava sem WhatsApp); modo teste busca só o celular de teste (antes, carrinhos reais ocupavam as 3 vagas e o teste não saía)
- [x] `npm test` 102/102; build limpo; prova local com Evolution falsa: 2ª mensagem com texto F1, link de compra carrinho-wa-2 e link de sair assinado; próxima em +7 dias; mesmo celular não recebe duas vezes
- [x] Publicado: site 0068ee56 (com .env.local), robô a9ac3bfc (MODO_WHATSAPP=desligado). No ar: home/assinar 200, login 400, checkout recusa celular inválido, webhook sem segredo 404, gestão sem login 404, privacidade nova.
- [ ] Paulo: contratar o serviço (Z-API recomendado) e mandar as chaves → checklist "Para ligar" em tasks/whatsapp.md

---

# WhatsApp na recuperação — preparado e DESLIGADO (02/10/2026)

Branch `whatsapp`. Contrato e checklist para ligar: tasks/whatsapp.md. Commits 7062814 (plano),
77961ab (tela), 5a1815e (backend, Codex + ajustes da revisão).
Decisões do Paulo: serviço não oficial (Z-API ou Evolution, escolha no dia do número), UMA mensagem ~24 h depois do carrinho, tudo pronto e desligado.
- [x] (C) 0006 (aditiva: carrinhos.whatsapp_falhou_em + índice por telefone)
- [x] (C) Robô: passo do WhatsApp depois do e-mail, isolado; MODO_WHATSAPP=desligado não consulta nada; janela 24–72 h; 9h–20h de Brasília; teto 20/dia, 3 por rodada; 3 variações de texto; falha não repete
- [x] (C) POST /api/whatsapp/webhook?t=<segredo>: "SAIR/PARAR/..." descadastra os e-mails daquele celular (Z-API e Evolution); sem segredo = 404
- [x] (C) Gestão: situação do WhatsApp (enviado, previsto, sem celular, comprou, falhou, não enviado, desligado), recuperado por qualquer canal
- [x] (F) Tela: coluna WhatsApp, "Comprou após o WhatsApp", total de mensagens
- [x] Revisão: DDD 55 preservado ao ler o número; freio do webhook 8 → 120/min (todas as respostas vêm do mesmo IP do serviço)
- [x] `npm test` 96/96; build limpo
- [x] Prova LOCAL: 0006 roda; gestão mostra "Desligado"/"Sem celular"; webhook sem segredo, com segredo errado e GET = 404; "Sair" (formato Z-API) e "PARAR" (formato Evolution) descadastraram os e-mails certos; "oi, quero comprar" não; robô em modo teste contra uma Evolution falsa: 1 mensagem só para o celular de teste (corpo, número 55..., primeiro nome e link conferidos), o outro carrinho só no log; segunda rodada não repetiu
- [x] 0006 APLICADA no D1 de produção em 02/10 (Paulo liberou a regra).
- [x] Merge em main (b1ca473), push, site publicado (f45fe055, com .env.local) e robô (9c4bbb16, MODO_WHATSAPP=desligado). Conferido no ar: home e /assinar 200, login 400, checkout recusa celular inválido, webhook sem segredo / GET = 404 igual a inexistente, gestão sem login 404.
- [ ] No dia do número: checklist "Para ligar" em tasks/whatsapp.md

---

# Recuperação v2 — 4 e-mails, celular, aba Recuperação (02/10/2026)

Branch `recuperacao-v2`. Contrato: tasks/recuperacao-v2.md. Commits 145c6e9 (plano),
9d253b0 (telas, Claude), 281689a (backend, Codex + ajustes da revisão).
- [x] (C) migrations/0005_recuperacao_v2.sql (aditiva: tabela lembretes_enviados + 4 colunas em carrinhos; quem já recebeu o 1º e-mail entra na sequência com o 2º em +7 dias)
- [x] (C) Robô: e-mails 1 (1 h), 2 (+7 d), 3 (+15 d), 4 (+30 d), encerramento (+30 d); para se comprou ou descadastrou; teto conta todos; falha adia 1 dia
- [x] (C) Celular no checkout (só dígitos, sem 55); vazio é aceito no servidor de propósito (páginas antigas abertas na hora da publicação), o formulário exige
- [x] (C) GET /api/gestao/recuperacao e /csv (uma linha por pessoa; quem pagou antes do lembrete fica fora de "Todos")
- [x] (F) Aba Recuperação (totais, filtros, busca, planilha, 4 casas de e-mail, WhatsApp "em breve", link wa.me), campo Celular (WhatsApp) com máscara, privacidade com os 4 lembretes
- [x] Revisão linha a linha do diff do Codex: 3 ajustes (celular vazio aceito, comprou-na-hora fora da lista, regex sem barra invertida)
- [x] `npm test` 82/82; `npm run build` limpo
- [x] Prova LOCAL (preview da Cloudflare + D1 local): 0005 roda sobre o banco local; 6 situações certas; filtros, busca por celular, filtro inválido 400; sem login 404 igual a endereço inexistente; CSV ok; checkout: celular inválido 400, válido grava 11987650000, sem campo grava NULL (a abertura do MP falha só no local: token de exemplo no .dev.vars); robô com chave falsa do Resend: falha desfaz a reserva e adia 1 dia; etapa 4 vencida → finalizado 'sequencia'; descadastrado → finalizado 'descadastro'; fotos 1280/390 conferidas, sem erro de página
- [x] 0005 APLICADA no D1 de produção em 02/10 (Paulo liberou a permissão). Conferido: 7 lembretes migrados; 11 clientes, 11 compras, R$ 631,80 pagos intactos.
- [x] Merge em main (cbe4216), push, site publicado (versão 865067e9, build com .env.local). Conferido no ar: home e /assinar 200, login 400 "Informe o e-mail e a senha.", campo Celular no /assinar, checkout recusa celular inválido, /api/gestao/recuperacao sem login 404 igual a inexistente, privacidade nova.
  - Tropeço: o build saía com código 127 sem mensagem porque servidores de teste locais (wrangler/workerd) seguiam abertos travando .open-next. Encerrar os processos de teste antes de publicar.
- [x] Robô publicado (versão 94e58bc4, cron */10, MODO=ativo, segredos LEMBRETE_SEGREDO e RESEND_API_KEY presentes).
- [ ] Primeiros e-mails 2 de verdade: a partir de 06/10 (as 7 pessoas do 1º e-mail de 29/09 a 01/10)

---

# Menu de gestão — plano e andamento (início: 24/09/2026)

Branch: `gestao`. Nada vai para `main` sem o OK do Paulo, fase por fase.
Legenda: [ ] a fazer · [x] feito e provado · (C) Codex/backend · (F) Claude/frontend

## Passo 0 — preparação
- [x] Pasta local fora do Drive/OneDrive, remoto `Placerda28/trilha-viva`
- [x] Branch `gestao` criada
- [x] Leitura do código (checkout, webhooks, sessão, acervo, download, cupom de teste)
- [x] Esquema real do D1 lido (só leitura)
- [x] `CLAUDE.md` e `AGENTS.md` na raiz (regra do idioma)

### O que a leitura mostrou (e muda o plano original)
1. A sessão NÃO é da Supabase. É o cookie `tv_sessao`, conferido no D1 (`lib/sessao.js` → `clienteAtual()`). A Supabase só confere a senha. Então `papel()` parte de `clienteAtual()`: é validado no servidor e é o mesmo usado no acervo.
2. A chave de servidor da Supabase já existe com o nome `SUPABASE_SECRET_KEY` (não `SUPABASE_SERVICE_ROLE_KEY`). A Equipe reaproveita essa.
3. A conta do Paulo (paulohenrique_ls@hotmail.com) já existe: cliente id 3, com senha e com compra. Não precisa criar nada para a Fase 1.
4. O D1 não guarda Pix/cartão nem cupom. Precisa de uma coluna nova (cache da forma de pagamento).
5. Os webhooks (MP e Stripe) NÃO tratam reembolso/chargeback. Fica para a Fase 4.
6. Já existe um cupom de teste por variável (`CUPOM_TESTE`, `lib/cupom-teste.js`) e o campo "Tenho um cupom" no `CheckoutForm`. A Fase 2 troca esse mecanismo pela tabela `cupons`.
7. Não há ferramenta de testes no projeto. Os testes usam o `node --test` que já vem no Node, em funções puras (sem banco), sem instalar nada.
8. Hoje o D1 tem 6 clientes, 6 compras pagas (R$ 361,10 no total) e 39 downloads.

## Fase 1 — acesso + Clientes + Clientes por período

Decisão de arquitetura (24/09): /gestao e /api/gestao NÃO têm rota no sistema de arquivos. O middleware.js confere o papel e só para admin reescreve para /interno/gestao e /api/interno/gestao (que conferem de novo). Assim, para qualquer outro visitante, é literalmente um endereço inexistente. Motivo: notFound() dentro da rota gerava um 404 diferente do normal (corpo vazio / documento de erro).
Risco conhecido e pequeno: o Next grava os endereços do middleware (/gestao, /api/gestao) num script do sistema antigo de páginas (main-*.js) que nenhuma página carrega; só é baixável sabendo o nome do arquivo. A segurança não depende disso.
Para a Fase 3: a consulta à tabela equipe entra em lib/gestao/sessao.js (adminPeloToken), para valer no middleware e nas rotas ao mesmo tempo.
Segredos/variáveis: `ADMIN_MASTER=paulohenrique_ls@hotmail.com` no painel + "Promote version".
Migração `migrations/0001_gestao_fase1.sql`: APLICADA no D1 de produção em 24/09 pelo Paulo (depois de ver o SQL). Conferido: coluna e índice existem; 6 clientes, 6 compras, R$ 361,10 intactos.
- [x] (C) `lib/gestao/permissao.js` — `papel()` → 'master' | 'membro' | null; `naoEncontrado()` (404)
- [x] (C) Migração: `compras.forma_pagamento` + índice por data
- [x] (C) Forma de pagamento: gravar na compra nova (MP `payment_type_id`, Stripe = cartão) e preencher as antigas aos poucos, com cache
- [x] (C) `GET /api/gestao/clientes` (busca + paginação) e `GET /api/gestao/clientes/csv`
- [x] (C) `GET /api/gestao/periodo` (totais + série dia/semana/mês) e `GET /api/gestao/periodo/csv`
- [x] (C) Testes `node --test` das funções puras (datas de Brasília, agrupamento, CSV, decisão de papel)
- [x] (F) `app/interno/gestao/layout.js` — confere o papel de novo (`notFound()`), noindex
- [x] (F) Tela Clientes (busca, paginação, CSV) — celular primeiro
- [x] (F) Tela Clientes por período (atalhos, totais, gráfico, CSV)
- [x] (F) Link "Gestão" no acervo, só renderizado para admin; Header esconde os botões de compra via `data-cta-compra` (sem citar /gestao)
- [x] Revisão do diff do Codex (feita linha a linha)
- [x] `/codex:adversarial-review --base main` (24/09, 14h08): APROVADO, sem achado material. Antes dele, o teste de ataque manual achou o 200 com cabeçalho RSC nos endereços internos (corrigido no commit ca8e0b5).
- [x] Prova LOCAL (wrangler dev + D1 local com dados inventados), 24/09:
  - 92 comparações (sem cookie, cliente comum, bloqueado, sessão falsa × GET/POST/PUT/DELETE × 4 rotas + /api/gestao + 3 telas): 0 diferenças em relação a um endereço inexistente (status, cabeçalhos e corpo; só o ETag muda, como muda entre dois endereços inexistentes quaisquer).
  - master: telas 200, JSON 200, CSVs 200 text/csv; cliente comum não recebe nenhuma menção a "gestao" no /acervo, master recebe o link.
  - acesso direto ao endereço interno (/interno/gestao, /api/interno/gestao) sem permissão: 404, nenhum dado.
  - totais do período = SELECT direto (6 compras, 5 clientes, R$ 437,50; Pix 1, cartão 2, sem info 2); compra das 23h59 de Brasília no dia certo; busca por "100%" escapada; fórmula neutralizada na planilha.
  - fotos das telas em 1280 px e 390 px conferidas.
- [x] Prova em PRODUÇÃO (24/09, versão f9c188d9 publicada às 14h44 BRT): sem login, 12 comparações com endereço inexistente, 0 diferenças; home, /assinar, /musicas, /entrar normais; robots e sitemap sem /gestao. Paulo entrou, viu o menu e as duas telas ("está ótimo").
- [x] Ajuste pedido pelo Paulo: compra de teste manual de paulohls28@gmail.com (id 2, cs_teste_manual_1, cupom 100%) passou de R$ 89,90 para R$ 0,00. Faturamento total: R$ 271,20.
- [x] `npm run build` limpo (e `opennextjs-cloudflare build` limpo)
- [x] CPU em produção (GraphQL workersInvocationsAdaptive, o site todo, por hora): 0 erros antes e depois; mediana 9,6 ms na hora em que o Paulo usou a gestão (10,2 ms e 5,5 ms nas horas anteriores). Não deu para separar por rota: o wrangler tail não alcança tail.developers.workers.dev daqui (DNS) e o login do wrangler não tem permissão na API de Observability. Para ver por rota: painel → Workers → www → Observability, filtrar por caminho.
  - Observação fora do escopo: o p99 do site já passava de 150 ms antes da gestão (inícios a frio).
- [x] Merge em main com OK do Paulo (commit 83c863c, 24/09)

## Fase 2 — Cupons
Contrato: tasks/fase2-cupons.md. Commits dcdacab (backend, Codex) e 08fe0d0 (telas).
- [x] (C) migrations/0002_cupons.sql: tabelas cupons e cupom_reservas + compras.cupom
- [x] 0002 APLICADA no D1 de produção em 24/09 pelo Paulo (depois de ver o SQL). Conferido: 2 tabelas, 2 índices, coluna compras.cupom; 6 clientes, 6 compras, R$ 271,20 intactos.
- [x] (C) Validação no servidor em /api/checkout e /api/cupom: validade, limite, ativo, sem diferenciar maiúscula, preço final ≥ R$ 1,00
- [x] (C) Limite à prova de corrida: reserva atômica (35 min) + preferência e Pix vencendo em 30 min
- [x] (C) Uso contado só quando a compra é gravada (webhook aprovado ou /api/conta/criar), uma vez só
- [x] (C) Rotas da gestão: listar, criar (mesma origem), desativar
- [x] (F) Tela Cupons (prévia do preço, estados, usos e "pagando agora", copiar link, desativar com confirmação); CheckoutForm sem mudança (contrato mantido)
- [x] lib/cupom-teste.js aposentado. Depois da publicação: apagar a variável CUPOM_TESTE do painel.
- [x] Prova LOCAL (24/09): 39 testes; criação 201, repetido 409, 6 inválidos 400 com o campo certo, outro site e cliente comum 404 sem gravar; /api/cupom: 30% → R$ 62,93, R$ 10 → R$ 79,90, 100% → R$ 1,00, minúsculas/espaços ok; inexistente, esgotado, vaga ocupada por quem está pagando, desativado e vencido recusados com a mesma mensagem; reservas vencidas liberam; checkout que falha devolve a vaga; esgotado recusado no checkout; 56 comparações de não admin nas rotas de cupom com 0 diferenças; fotos 1280/390 conferidas.
- [x] /codex:adversarial-review focada em dinheiro: 3 achados (vaga vencendo com cartão em análise; falha na limpeza da vaga barrando o e-mail de acesso; link passando da validade do cupom), corrigidos em f26fe32 com 3 testes novos (42). Limitação aceita: desativar não cancela links já abertos no MP (máx. 30 min).
- [x] Segunda revisão do Codex: achou que o prazo de 30 min podia recusar o Pix (MP exige Pix ≥ 30 min a partir de quando é gerado), que 3 h não bastam para cartão em análise (até 2 dias úteis), que aviso atrasado reativava vaga vencida e que o link podia passar segundos da validade. Tudo corrigido (43 testes).
  - Achado anterior à gestão, NÃO corrigido aqui: se o e-mail de acesso falhar depois de a compra ser gravada, o aviso repetido do MP não tenta de novo. Quem pagou ainda entra pela tela de sucesso ou por "Esqueci minha senha". Vai para a Fase 4 (registrar se o e-mail saiu e reenviar).
- [x] Publicado em 24/09 (merge 4a4d35a, versão acfb3d7b). Sem login: rotas de cupom idênticas a endereço inexistente (0 diferenças).
- [x] Prova em produção (24/09, 16h48 BRT): Paulo criou TESTE1REAL (R$ 88,90 de desconto, limite 1) e pagou R$ 1,00 no Pix com outra conta (trilhaviva.suporte@gmail.com). No D1: compra mp_179706542831, pix, cupom TESTE1REAL, usos 1/1, reserva limpa, senha criada. Depois disso, /api/cupom e /api/checkout recusam o cupom (esgotado).
- [ ] Desativar → checkout recusa: provado no local; em produção é opcional (TESTE1REAL já está esgotado).
- [ ] Paulo: apagar a variável CUPOM_TESTE no painel (o código já não lê).
- [ ] Paulo: confirmar a compra de R$ 1,00 de kaylan.nasc2@gmail.com (24/09 10h35 BRT, mp_179645402809, antes da publicação dos cupons, sem cupom registrado): só o cupom de teste antigo permitia esse valor.

## Fase 3 — Equipe + registro de ações
Paulo autorizou fazer direto (24/09). Contrato: tasks/fase3-equipe.md. Commits 737f3f3 (backend, Codex) e 0219298 (telas).
- [x] (C) migrations/0003_equipe.sql: tabelas equipe e registro. APLICADA no D1 de produção em 24/09 (7 clientes, 7 compras, R$ 272,20, 1 cupom intactos).
- [x] (C) Papel com membro na mesma consulta única; master só por ADMIN_MASTER; removido/bloqueado perde acesso na próxima requisição
- [x] (C) Adicionar membro via Supabase Admin (SUPABASE_SECRET_KEY); conta existente mantém a senha; troca obrigatória no 1º acesso; remover; liberar/tirar acervo (desligado por padrão)
- [x] (C) Registro: cupom criado/desativado, membro adicionado/removido, acervo liberado/retirado, senha trocada
- [x] (C) temCompra aceita membro ativo com libera_acervo
- [x] (F) Tela Equipe (só master), Registro (todos), "Crie a sua senha" para quem está com a provisória, aviso de gestão no acervo para membro sem compra
- [x] Prova LOCAL (24/09): 59 testes; e-mail do master, e-mail inválido e senha curta recusados; repetido 409; membro vê Clientes/Cupons/Registro e recebe 404 na Equipe (rota e tela, sem aba no menu) e ao tentar adicionar; acervo desligado até liberar; com senha provisória só vê "Crie a sua senha" e as rotas de dados dão 404; removido perde tudo na hora; reativado volta com acervo desligado; registro anota cada ação e nenhuma senha; membro criando cupom aparece no registro; 48 comparações de quem é de fora nas rotas novas com 0 diferenças; fotos conferidas.
- [ ] Não testável no local (sem Supabase): criar conta nova de membro e a troca de senha de verdade → prova em produção com o Paulo
- [x] /codex:adversarial-review da Fase 3: sessões abertas com a senha provisória sobreviviam à troca; falha no meio do cadastro podia dispensar a troca; publicar antes da 0003 quebraria o acervo. Os dois primeiros corrigidos (60 testes; gravação única conferida no D1 local), o terceiro já estava resolvido (0003 aplicada antes).
- [ ] Publicar e provar em produção: Paulo adiciona um membro com um e-mail dele, entra com a provisória, troca, vê a gestão sem Equipe; removido perde o acesso

## Fase 4 — Visão geral, Downloads, ações no cliente (reembolso ADIADO)
- [ ] (C) Visão geral (hoje/7d/30d/mês + gráfico), músicas mais baixadas, clientes que batem a cota
- [ ] (C) Ações: reenviar e-mail de acesso, bloquear/liberar, zerar a cota do dia
- [ ] (C) Entrega do acesso idempotente: gravar quando o e-mail de criar senha saiu (ex.: compras.acesso_enviado_em) e, se um aviso repetido do MP achar compra paga sem e-mail enviado, tentar de novo (achado da revisão da Fase 2)
- [ ] ADIADO por decisão do Paulo (24/09/2026): "não vamos mexer com reembolso por agora". Webhook refunded/charged_back → bloquear e marcar "reembolsada" fica fora até ele pedir. Hoje o aviso do MP só trata pagamento aprovado; reembolso feito no painel do MP NÃO bloqueia o acesso (bloqueio manual pela gestão, quando existir).
- [ ] (F) Telas correspondentes
- [ ] (adiado junto com o reembolso)

---

# Trilha Viva — ajustes de 05/09/2026

Registro do que foi pedido, o que foi feito, o que foi provado e o que ficou
esperando. Nada aqui é marcado como pronto sem evidência.

Foram duas rodadas no mesmo dia, com a mesma estrutura de cinco etapas. Na
primeira, a etapa 1 travou; na segunda, saiu por outro caminho.

---

# Etapa 1 — shadcn: button, dialog e card — FEITO

## O `shadcn init` não roda aqui, e não deveria rodar mesmo

Duas razões independentes, e as duas continuam valendo:

**O ambiente não alcança o registro.**

```
$ npx shadcn@latest init -d -y
Request to https://ui.shadcn.com/init?... failed, reason: Request was cancelled.

$ curl https://ui.shadcn.com/init
curl: (56) CONNECT tunnel failed, response 403
```

O proxy libera o npm (`registry.npmjs.org` → 200) e bloqueia `ui.shadcn.com`. O
CLI baixa dali tanto o payload do `init` quanto o código de cada componente. A VM
ligada à pasta do OneDrive também não tem rede.

**E, mesmo com rede, o `init` conflitaria com o Tailwind atual** — o caso em que
você mandou parar e avisar:

| O que o `shadcn init` faz | Conflito |
| --- | --- |
| Escreve `@layer base` em `globals.css` com `--background`, `--foreground`, `--primary`, `--muted`, `--accent`… | Cria um **segundo sistema de cor** ao lado de `ink` / `paper` / `mist` / `signal` |
| Injeta `theme.extend.colors` mapeando para `hsl(var(--...))` | Colide com o token `accent` |
| Adiciona `* { @apply border-border }` e estilos de `body` | Sobrescreve o `body` que define o off-white |
| Liga `darkMode: 'class'` | Muda o comportamento global de tema |

## O caminho que funcionou: o fonte canônico, direto do GitHub

`github.com` é alcançável e `shadcn-ui/ui` é público. Puxei os três arquivos do
repositório — **a mesma origem que o registry serve**.

```
apps/www/registry/new-york/ui/{button,dialog,card}.tsx
  @ refs/tags/shadcn-ui@0.9.4
```

**Por que essa tag e não o `main`:** o `main` hoje só tem `apps/v4`, escrito para
Tailwind 4 — usa `@container/card-header`, `shadow-xs` e `has-data-[slot=...]`,
que não existem no 3.4. A tag 0.9.4 fixa `tailwindcss 3.4.6` no próprio
`package.json`, praticamente o nosso 3.4.17.

### O que mudou, e por quê

| Mudança | Motivo |
| --- | --- |
| `.tsx` → `.jsx` | O projeto é JavaScript, sem TypeScript |
| `@radix-ui/react-dialog` / `react-slot` → pacote unificado `radix-ui` | Você pediu `radix-ui`. Mesmos primitivos, um pacote só |
| `lucide-react` → SVG inline | O site já usa SVG inline no mesmo traço 1.8 (`Header.jsx`, `ui.jsx`). Não vale uma dependência por um X |
| `@/lib/utils` → `@/lib/cn` | Você pediu `lib/cn.js`; `lib/utils.js` não existe aqui |
| **Sem a variante `destructive`** | Sua decisão. A paleta não tem tom de alerta e o site não tem ação destrutiva. Nenhum token foi inventado |
| Card **sem sombra**, `rounded-lg` no lugar de `rounded-xl` + `shadow` | Ver abaixo, na etapa 2 |
| Botão com as medidas do site | `.btn-signal` é `px-7 py-4 text-[15px] leading-none` = 48px. Daí `h-12` no `default`, e raio de 4px como todo botão daqui |
| Variante extra `onink` | Para botão dentro de painel escuro, que o site já tem (`.btn-onink`). Sem ela, o `outline` sumiria contra o `bg-ink` |

### Mapa de tokens — nenhum token novo

| shadcn | Trilha Viva |
| --- | --- |
| `bg-primary` / `text-primary-foreground` | `bg-signal-deep` / `text-white` |
| `bg-secondary` / `text-secondary-foreground` | `bg-mist` / `text-ink` |
| `bg-accent` / `text-accent-foreground` | `bg-mist` / `text-ink` |
| `border-input` | `border-ink/25` (botão), `border-line` (superfícies) |
| `bg-background` / `bg-card` | `bg-paper` / `bg-white` |
| `text-card-foreground` | `text-ink` |
| `text-muted-foreground` | `text-ink-muted` |
| `ring-ring` / `ring-offset-background` | `ring-ink` / `ring-offset-paper` |
| overlay `bg-black/80` | `bg-ink/60` |

Nenhum `--background`, `--primary` ou `--accent`. Nenhum segundo sistema de cor.

### Arquivos e dependências

```
lib/cn.js                 novo
components/ui/button.jsx  novo
components/ui/card.jsx    novo
components/ui/dialog.jsx  novo
package.json              +5 pacotes
tailwind.config.js        +1 linha
```

`radix-ui@1.6.7` (peer aceita React 19), `class-variance-authority@0.7.1`,
`clsx@2.1.1`, `tailwind-merge@^2.6.1` e `tailwindcss-animate@1.0.7` (devDep,
junto do tailwindcss).

**`tailwind-merge` na linha 2, não na 3:** a 3.x é escrita para Tailwind 4 e pode
fundir classes errado no 3.4.

### A única alteração no tailwind.config.js

```diff
-  plugins: [],
+  plugins: [require('tailwindcss-animate')],
```

Você liberou essa linha. Nada de `darkMode`, nada de cor, nada no `body` —
confirmado por `git diff`, que mostra só ela mais o comentário.

### Onde os componentes são usados: em lugar nenhum, de propósito

O site não tem diálogo nem card hoje, e o botão já é a classe `.btn-signal`.
Trocar as classes por `<Button>` nas 16 páginas seria refactor grande, sem ganho
visual, mexendo inclusive no formulário de checkout — que é o caminho do
dinheiro. Eles ficam como biblioteca pronta e provada; a adoção é decisão
separada. Candidatos naturais para quando a hora chegar: o `dialog` para a prévia
de uma música no acervo, e o `card` para os blocos de ferramentas em `/como-usar`.

---

# Etapa 2 — Construção de UI — FEITO

**`frontend-design`** foi a diretriz nas duas rodadas, e mudou decisões concretas:

- Na rodada 1, é a razão de o visual anterior (creme + serifada + terracota +
  rótulo em caixa alta acima de cada seção) ter sido trocado — aquilo é
  literalmente o padrão que uma IA produz por default.
- Na rodada 2, a skill lista "conteúdo picado em cards arredondados idênticos,
  todos com a mesma sombra cinza" como um dos tells de página gerada por IA — e
  isso é literalmente o default do card do shadcn (`rounded-xl border shadow`).
  Daí o card ter saído **sem sombra**, com o raio do `.panel` (10px). Este
  sistema não tem sombra em lugar nenhum: quem separa superfície é a borda `line`
  e a troca de fundo.

**`magic21` (21st.dev):** busca usada como referência de componentes de áudio
(WaveformPlayer, Waveform) e de composição. A **geração** segue travada pelo
limite diário do plano gratuito (`generation_limit_reached`). Para liberar:
21st.dev/pricing.

---

# Etapa 3 — Animação — FEITA À MÃO

**A skill `emil-design-eng` não existe nesta conta**, nas duas rodadas. Procurei
de novo depois de você dizer que tinha instalado — ver a seção "Os dois
destravamentos" no fim. Não inventei substituto: decidi à mão e registrei os
valores, que é o que a skill entregaria.

Só anima o que entra, sai ou marca tempo:

| Onde | O quê | Valores |
| --- | --- | --- |
| Overlay do dialog | Só opacidade | `fade-in-0` / `fade-out-0`, `duration-150` |
| Caixa do dialog | Opacidade + escala | `zoom-in-95` → 100%, `duration-150` |
| Ponto do canal "clique" no painel de sessão | Piscada em degraus, imitando metrônomo | `1.9s`, `steps(1, end)`, opacidade `0.18 → 1 → 0.18` |
| Botões e links | Só troca de cor | `150ms`, `transition-colors` |
| Tudo | Respeita `prefers-reduced-motion: reduce` | animação e transição caem para `0.001ms` |

Nada de entrada em fade-and-slide por seção, que é o default genérico. A regra de
`prefers-reduced-motion` é global, então vale para os componentes novos de graça.

---

# Etapa 4 — Polimento — FEITO À MÃO

**A skill `web-design-guidelines` também não existe nesta conta.** Mesma
situação. Auditoria à mão, com números medidos e não estimados.

## Correções aplicadas na rodada 1 (site inteiro)

| Achado | Correção |
| --- | --- |
| Foco de teclado invisível nas linhas do setlist, nos links de texto e no rodapé | Regra global `:focus-visible` com contorno de 2px e `outline-offset`, e variante clara dentro dos painéis escuros |
| Anel de foco dos botões desenhado sobre branco puro, num fundo off-white | `focus-visible:ring-offset-paper` |
| Filtros de categoria do acervo não anunciavam qual está ativo | `aria-pressed` nos botões |
| Ocre/ardósia como **texto** sobre fundo claro ficava em ~4:1 | Etiquetas viraram a classe `.chip` (fundo `signal-deep` + texto branco, ~6:1); botões usam `signal-deep` |
| Taupe `#7F7265` da paleta anterior no corpo de texto ficava no limite | Token `ink-muted` passou a ser um degrau mais escuro da mesma família |

Já estavam certos antes: `lang="pt-BR"`, link "pular para o conteúdo", `alt` em
todas as imagens, `aria-hidden` no que é decorativo, `aria-label` na busca, FAQ em
`<details>/<summary>`, um `h1` por página, alvo de toque das linhas do setlist em
~52px.

## Correção aplicada na rodada 2 (componentes novos)

O botão de fechar do dialog media **26×26px** no padrão do shadcn — passa
raspando no mínimo da WCAG 2.2 (24px) e é apertado para o dedo. Aumentei a área
clicável para **40×40** sem mexer no tamanho do ícone (18px). Medido no render
real, antes e depois.

## Contraste, medido variante por variante

| Elemento | Rácio | AA (4.5) |
| --- | ---: | --- |
| button `default` (branco sobre `signal-deep`) | 6.49 | OK |
| button `default` hover (branco sobre `ink`) | 11.11 | OK |
| button `outline` / `ghost` / `link` (`ink` sobre `paper`) | 10.53 | OK |
| button `secondary` (`ink` sobre `mist`) | 8.06 | OK |
| button `secondary` hover (`ink` sobre `mist-deep`) | 6.99 | OK |
| button `onink` (branco sobre `ink`) | 11.11 | OK |
| card / dialog — título | 11.11 | OK |
| card / dialog — descrição (`ink-muted` sobre branco) | 5.53 | OK |
| dialog — botão de fechar | 5.53 | OK |

**Pior caso: 5.53.** Nenhuma variante abaixo de AA.

## Alvos de toque, medidos no navegador

| Alvo | Tamanho | |
| --- | --- | --- |
| button `sm` | 40px | acima do mínimo |
| button `default` | 48px | confortável |
| button `lg` | 56px | confortável |
| button `icon` | 48×48px | confortável |
| dialog fechar | 40×40px | corrigido de 26px |

## Teclado, testado de verdade no dialog

```
OK  gatilho recebe foco
OK  dialog abre com Enter
OK  foco entra no dialog
OK  aria-labelledby e aria-describedby apontam para titulo e descricao
OK  foco continua preso apos 5 Tab
OK  Esc fecha
OK  foco volta ao gatilho
```

---

# Etapa 5 — Semgrep — FEITO

## Instalação e regras

```
$ semgrep --version
1.176.1
```

`semgrep.dev` está bloqueado pelo proxy (403), então `--config=auto` e os pacotes
`p/javascript` não baixam. Solução: clonei o repositório oficial de regras
(`github.com/semgrep/semgrep-rules`, que é alcançável) e rodei com as regras
locais. **O comando é idêntico nas três execuções** — é o que torna a comparação
honesta:

```
semgrep scan --metrics=off \
  --config=<semgrep-rules>/javascript \
  --config=<semgrep-rules>/typescript \
  --exclude=node_modules --exclude=.next \
  app components lib scripts
```

## Antes e depois

| Regra | Rodada 1 antes | Rodada 1 depois | Rodada 2 depois |
| --- | ---: | ---: | ---: |
| `html-in-template-string` | 1 | 1 | 1 |
| `jsx-not-internationalized` | 143 | 143 | 144 |
| `missing-template-string-indicator` | 4 | 4 | 4 |
| `react-dangerouslysetinnerhtml` | 3 | 3 | 3 |
| `react-props-spreading` | 0 | 0 | 13 |
| **Total** | **151** | **151** | **165** |

**O número não cai, e isso é o resultado certo.** As regras que sobram são
sintáticas, não de fluxo de dados: marcam o *formato* do código, não a origem do
dado. O que mudou foi a exposição real:

- **Achados com risco real sem mitigação: antes 4, depois 0.**
- Comportamento alterado: **nenhum**.

Zerar o contador só seria possível suprimindo alerta — a gambiarra que você pediu
para evitar.

## Cada achado, explicado

### 1. `react-dangerouslysetinnerhtml` — MÉDIA — 3 ocorrências — CORRIGIDO

`app/artistas/[slug]/page.js:45`, `app/blog/[slug]/page.js:61`,
`app/musicas/[slug]/page.js:86`

Causa: o bloco JSON-LD é injetado com `dangerouslySetInnerHTML` e carrega
`song.title`, `artist.name` e `post.title`. `JSON.stringify` **não escapa `<`**,
então um título contendo `</script>` fecharia a tag e o resto do texto viraria
HTML executável na página. Hoje o catálogo é nosso, mas ele vai ser regenerado a
partir das pastas do Drive — ou seja, de nomes de arquivo que não controlamos.

Correção: `lib/safe.js` → `ldJson()`, que serializa e converte os caracteres
perigosos em escapes. O parser de JSON lê esses escapes como os caracteres
originais, então **o dado que chega ao Google e ao navegador é idêntico** — só
não pode mais escapar da tag.

**Regra de escopo, para manter o impacto mínimo:** todo JSON-LD que carrega dado
de catálogo ou de post usa `ldJson`. São cinco arquivos — os três marcados pelo
Semgrep mais `app/musicas/page.js` e `app/blog/page.js`. Os outros cinco
(`layout`, `page`, `faq`, `como-usar`, `artistas`) montam o LD só com constantes
nossas e seguem no `JSON.stringify`. Quando o catálogo real vier do Drive,
qualquer LD novo que toque nele entra nessa regra.

Prova com entrada hostil:

```
entrada:  { name: 'A Bênção </script><img src=x onerror=alert(1)>' }
saída contém "</script>"?  false
JSON.parse(saída).name === entrada.name?  true
```

### 2. `html-in-template-string` — BAIXA — 1 ocorrência — CORRIGIDO

`app/api/webhook/route.js:9`

Causa: `emailHtml()` monta o e-mail de liberação interpolando `nome` e `url`
direto no HTML. O `nome` vem do checkout da Stripe, ou seja, é digitado pelo
comprador: `<img src=x onerror=...>` no campo de nome entraria cru no e-mail.

Correção: `escapeHtml(nome)` e `safeUrl(url)`. O `safeUrl` só aceita `http:` e
`https:` — se `DRIVE_URL` for preenchida errado um dia, um `javascript:` vira
string vazia em vez de link clicável.

```
escapeHtml('<b>Paulo</b>')            -> '&lt;b&gt;Paulo&lt;/b&gt;'
safeUrl('https://drive.google.com/x') -> 'https://drive.google.com/x'
safeUrl('javascript:alert(1)')        -> ''
```

### 3. `react-props-spreading` — INFO — 13 ocorrências — NÃO CORRIGIDO, de propósito

`components/ui/button.jsx:55`, `card.jsx:20,26,34,44,50,54`,
`dialog.jsx:32,50,68,75,85,95`

Causa: o `{...props}` no fim de cada componente. A regra avisa que espalhar props
pode passar atributo inválido para o DOM, ou deixar alguém injetar atributo
inesperado.

**Não corrigi, e o motivo é a sua própria regra.** Esse `{...props}` *é* a API do
componente — é o que faz `<Button type="submit">` e `<Card id="x">` funcionarem.
Tirar não é corrigir: é quebrar. Seria alterar comportamento, exatamente o que
você mandou não fazer. E o risco que a regra descreve depende de quem chama ser
não confiável; aqui todo chamador é código nosso.

### 4. `missing-template-string-indicator` — INFO — 4 ocorrências — FALSO POSITIVO

`app/layout.js:90` (×2), `app/api/checkout/route.js:82` (×2)

São `{search_term_string}` no `urlTemplate` do schema.org e
`{CHECKOUT_SESSION_ID}` no `success_url` da Stripe. Os dois **têm que ser
literais** — quem substitui é o Google e é a Stripe. Colocar `$` na frente
quebraria as duas integrações.

### 5. `jsx-not-internationalized` — INFO — 144 ocorrências — RUÍDO

A regra quer que todo texto passe por uma biblioteca de i18n; o site é monolíngue
em pt-BR e não tem plano de tradução. "Corrigir" significaria instalar i18n e
reescrever todas as páginas — mudança enorme, sem ganho. A 144ª é a palavra
"Fechar" no rótulo de leitor de tela do dialog.

## Resumo honesto

- Achados com risco real: **2 tipos, 4 ocorrências**. Todos mitigados.
- Achados com risco real sem mitigação: **0**.
- Ruído que permanece: 161 (144 de i18n + 13 de props-spreading + 4 falsos
  positivos).

Se quiser o contador limpo, o caminho correto é anotar com
`// nosemgrep: <regra>` e a justificativa ao lado — é o fluxo previsto pela
ferramenta para achado revisado. Me fala que eu faço.

## Uma coisa que apareceu de lado

O `npm audit` acusa duas vulnerabilidades — 1 moderada e 1 alta — **as duas no
`postcss` 8.4.49**, que já estava lá antes e não tem relação com os pacotes
novos. Não mexi porque subir o postcss é mudança de build, fora do escopo. Se
quiser, trato numa próxima com o build validado antes e depois.

---

# Os dois destravamentos que não chegaram

Você reportou o MCP do shadcn conectado e as duas skills instaladas em
`~/.claude/skills`. **Verifiquei os dois antes de começar a rodada 2 e nenhum
chegou até esta sessão.** Não é teimosia — é escopo diferente, e o registro fica
aqui porque isso vai se repetir.

| O que era esperado | O que eu encontrei |
| --- | --- |
| MCP do shadcn conectado | Não existe nesta sessão. Duas buscas no catálogo de ferramentas, um refresh dos 12 servidores conectados, e o que o seu desktop anuncia: `localMcpServers` = `magic21`, `github`. Só isso. O registro de conectores também não tem shadcn |
| Skills em `~/.claude/skills` | Esta sessão roda na nuvem e lê as skills **sincronizadas da sua conta** — são 11. `frontend-design` está lá; `emil-design-eng` e `web-design-guidelines` não. O `~/.claude/skills` da sua máquina é do Claude Code local e não atravessa para cá. Detalhe que reforça: a listagem da sua home nem mostra uma pasta `.claude` (mostra `.claude-mem`, `.codex`, `.gemini`) |

Para as skills valerem aqui, elas precisam estar nas skills da **conta**, não na
pasta local da máquina.

---

# Como o código chega ao GitHub

O `git push` deste ambiente é **recusado pelo proxy** («not in this session's
authorized repository set»). Os commits vão pelo **conector do GitHub**, e a
conferência é sempre a mesma: comparar o `git hash-object` local com o blob sha
que o GitHub devolve.

Duas armadilhas desse caminho, já vividas:

**1. Binário não passa.** Cada foto vive em `assets/` partida em pedaços base64 e
é remontada em `public/img` por `scripts/decode-assets.mjs`, que roda no
`prebuild`. Um envio em bloco já corrompeu um caractere em cada arquivo e as duas
fotos chegaram quebradas ao site. Por isso o `manifest.json` guarda o `sha256` de
cada imagem e o script **derruba o build** se algum pedaço não bater.

**2. Sequências de escape são normalizadas — e isso derrubou o build.** O
`lib/safe.js` **não compilava no repositório** desde o commit que o criou:

```
SyntaxError: Invalid regular expression: missing /
```

Os separadores U+2028 e U+2029 estavam dentro de literais de regex escritos como
sequência de escape, e o caminho de envio converte a sequência no caractere cru.
Os dois são terminadores de linha em JavaScript, e um literal de regex não pode
atravessar linha. **Consequência: todo build da Cloudflare desde aquele commit
falhou, e o site no ar seguia servindo a versão anterior.** O build local passava
porque a cópia local estava certa — o estrago só existia no repositório.

Correção: em vez de reenviar o mesmo código com escape (tentei duas vezes, e nas
duas o caractere chegou cru), troquei a forma de escrever os dois caracteres.
Agora são constantes montadas com `String.fromCharCode(0x2028)` e `(0x2029)`, e a
substituição usa `split`/`join` no lugar da regex. Não há caractere invisível no
arquivo e não há nada para o caminho de envio corromper.

**Lição, agora passo fixo:** conferir o blob sha de **todo** arquivo enviado, não
só dos que acabei de mexer. Foi exatamente essa conferência que achou o problema.

## Uma coisa que eu tentei e não consegui entregar

O filtro de acentos do `CatalogBrowser` guarda dois caracteres combinantes
**crus** dentro de um literal de regex — o intervalo U+0300–U+036F. São
invisíveis em qualquer editor, e some um deles numa cópia desatenta e a busca do
acervo para de achar "Bênção".

Tentei trocá-los por escapes três vezes; o caminho de envio desfez as três.
Desisti em vez de contornar com truque de código, e **deixei o arquivo
funcionando exatamente como estava** — verificado com
`norm('A Bênção Ação') === 'a bencao acao'`.

Fica anotado para fazer na sua máquina, onde o envio não passa por esse caminho:
trocar os dois caracteres crus por `/[̀-ͯ]/g` em
`components/CatalogBrowser.jsx`. Uma linha, mesmo intervalo, mesmo comportamento.

---

# Situação final

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | button / dialog / card | **Feito.** Fonte canônico do `shadcn-ui/ui`, sem rodar o `init`, sem segundo sistema de cor |
| 2 | UI com frontend-design + magic21 | **Feito.** A skill mudou o desenho do card (geração do magic21 segue travada pelo plano grátis) |
| 3 | Animação | **Feito à mão.** `emil-design-eng` não existe nesta conta; valores registrados acima |
| 4 | Polimento | **Feito à mão.** `web-design-guidelines` não existe nesta conta; contraste, alvo de toque e teclado medidos, 6 correções aplicadas |
| 5 | Semgrep | **Feito.** Antes/depois nas duas rodadas, cada achado explicado |

Provas: `next build` passando com as **245 páginas** (a página de demonstração
usada para os screenshots foi apagada antes do commit), screenshot dos
componentes e do dialog aberto, os sete testes de teclado, os rácios de contraste
e os alvos medidos no navegador, e as 10 páginas com JSON-LD respondendo 200 com
todos os blocos parseando.

---

# Recuperação de carrinho por e-mail (início: 29/09/2026)

Branch: `recuperacao`. Contrato: tasks/recuperacao.md.
Legenda: [ ] a fazer · [x] feito e provado · (C) Codex/backend · (F) Claude/frontend

## Passo 0
- [x] main atualizada, branch `recuperacao` criada
- [x] Leitura: checkout, CheckoutForm, mercadopago, webhook MP, clientes, email, origem, site, wrangler, gestão, privacidade, MetaPixel
- [x] Esquema do D1 lido (só leitura): nenhuma tabela de carrinho; datas em TEXT UTC
- [x] Remetente real: EMAIL_FROM = "Trilha Viva <acesso@trilhaviva.org>" (não contato@)
- [x] Resend grátis: 100/dia (dia UTC) e 3.000/mês; Cc/Bcc CONTAM como e-mail a mais → teto 40 lembretes/dia e 1.100/mês
- [x] batida-supabase: publicado na Cloudflare (scheduled + fetch), código fora do repositório
- [x] Paulo aprovou (29/09): acesso@ com reply_to contato@; link com ?r= (e-mail fora da URL por causa do Pixel); tetos 40/1.100; datas em texto

## Tarefas
- [x] (C) migrations/0004_carrinhos.sql (commit 89bd534), aplicada e conferida só no D1 LOCAL
- [x] PARADA 1: SQL aplicado no D1 de produção pelo Paulo (29/09)
- [x] (C) checkout (nome obrigatório, grava carrinho), GET /api/carrinho, webhook marca pago (89bd534). Revisado pelo Claude; ajuste: nome longo é cortado em 80, não recusado (b242ca6). 63 testes
- [x] (F) formulário (nome + e-mail nos dois cards, aviso, ?r=, utm) e /privacidade (23715bd). Build limpo, /assinar segue estático
- [x] (C) robô recuperacao-carrinho, e-mail, /api/descadastrar (a2db9f2). Codex rodou depois do /codex:setup; revisado pelo Claude. 76 testes, build e dry-run do robô limpos. → PARADA 2 feita (29/09): LEMBRETE_SEGREDO no site e no robô, RESEND_API_KEY no robô
  - Atenção para as provas: TESTE_PARA (conta do Paulo) já tem compra paga, então no modo teste o carrinho dele vira 'ignorado' pela regra (a). Decidir: outro e-mail de teste sem compra, ou exceção só no modo teste
- [x] (C) GET /api/gestao/carrinhos (a2db9f2) · [ ] (F) aba Carrinhos
- [ ] Provas 1 a 7 do pedido
- [x] PARADA 3 e 4 (29/09): merge em main, site e robô publicados, robô em MODO=ativo
  - O deploy local quebrou o login (faltava .env.local com NEXT_PUBLIC_SUPABASE_*). Corrigido e republicado (versão 83b47fbb)
- [ ] Paulo: teste real do lembrete com um e-mail sem compra
