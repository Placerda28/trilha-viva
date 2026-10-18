# Autopreenchimento no formulário de compra (06/10/2026)

Branch: `autopreenchimento`. Só navegador: nada muda no servidor, no `/api/checkout`, no D1 ou no Mercado Pago.

## O que o pedido supunha e não existe no código
- Sugestão "Você quis dizer…?" do e-mail: não existe em nenhuma branch. Não foi criada (seria elemento novo na tela). Fica para decisão do Paulo.
- Confirmação "O acesso será enviado para…": não existe. Nada a preservar.
- `?nome=`, `?email=`, `?tel=`: de propósito não existem (decisão de 29/09, Pixel da Meta manda a URL para a Meta). A "URL" da prioridade é o carrinho do lembrete (`?r=`).

## Feito
- [x] Campos antes: nome `name="nome"` autocomplete=name; e-mail ok; WhatsApp `name="telefone"` autocomplete=tel-national e **maxLength 16** (o "+55 27 99999-8888" do preenchimento automático tem 17 caracteres: o navegador cortava o último dígito e o número virava outro, com 10 dígitos, aceito como válido)
- [x] Campos agora: `name/email/tel`, autocomplete `name/email/tel`, `autocapitalize` words/off, `spellcheck=false` no e-mail, sem maxLength no WhatsApp; dentro de `<form>` com `<label for>`
- [x] Máscara (lib/checkout-campos.js) aceita +55, espaços, parênteses e 0 de discagem; mostra (27) 99999-8888
- [x] Envio lê também o formulário quando o estado do React está vazio (preenchimento sem evento)
- [x] `tv_checkout` no localStorage ao clicar em comprar com dados válidos; ao voltar preenche; prioridade carrinho do lembrete > guardado > vazio; nunca apaga o digitado
- [x] "Não é você? Limpar" (limpa os dois formulários do /assinar); chave apagada na /sucesso com compra aprovada; tudo em try/catch
- [x] Frase nova na /privacidade
- [x] Provas: 156 testes (`npm test`, 9 novos em tests/checkout), build limpo, 17 verificações em navegador real (Chromium, 390 px) no build local
  - Com armazenamento bloqueado, o único erro na página vem do `fbevents.js` da Meta (em todas as páginas, já antes desta mudança); o formulário envia normal
- [x] Prévia publicada sem promover: versão 48052974, https://autopreenchimento-www.trilha-viva.workers.dev/assinar (produção segue 100% na cc02dc28). Mesmas 17 verificações de navegador passaram na prévia
- [x] Paulo testou no celular (06/10): funcionou
- [x] OK do Paulo. Merge em main (41482ca), site publicado: versão e51ceaab (100%, com .env.local; envio caiu várias vezes por rede, uma tentativa completou). Conferido no ar: home 200, login 400 "Informe o e-mail e a senha.", as 17 verificações de navegador em trilhaviva.org, e compra real até o Mercado Pago (máscara (27) 99625-3839, /api/checkout 200, abriu www.mercadopago.com.br, dados lembrados na volta; e-mail do Paulo, que já tem compra: nenhum lembrete sai)
