# WhatsApp acesso_liberado e CPU do checkout, 12/10/2026 (noite)

Branch `acesso-liberado-robo` (saiu de main 6ea1123), sem merge.
- [x] Modelo `acesso_liberado` enviado à Meta pelo Paulo (WABA 2270775880440864). Só o robô tem a WA_TOKEN, então ele acompanha: workers/recuperacao-carrinho/acesso-liberado.js (1 consulta a cada 30 min, status em whatsapp_modelos, e-mail ao suporte quando aprova ou recusa, motivo junto no status; aprovado → UM teste ao WA_TESTE_PARA com link de criar senha de 72 h de compra de teste). 210 testes passando.
- [x] Robô publicado da branch: versão 00636709. Status às 20:51 UTC: PENDING.
- [ ] Quando APPROVED: WA_ACESSO=ativo no www (`printf 'ativo' | npx wrangler secret put WA_ACESSO`, publica na hora) e conferir o teste no celular do Paulo.
- [ ] Merge desta branch em main (OK do Paulo). Até lá, NÃO publicar o robô a partir da main (perderia a conferência).

## CPU do /api/checkout, mesmas condições (prévias, produção intocada)
- Prévias: antes = d5d3ffb (código da c78ca839) versão 36711db5 / cpu-antes; depois = main 6ea1123 versão 502e0396 / cpu-depois. Medição pela GraphQL de análise por versão (wrangler tail não pega prévia).
- Rodada 1 (só checkout, 18 cada): antes p50 9,8 / p90 23,5 / máx 27,8 ms; depois p50 15,0 / p90 22,8 / máx 23,2 ms.
- Rodada 2 (ordem invertida): antes p50 11,0 / p90 21,0 / máx 34,3 ms; depois p50 9,7 / p90 19,4 / máx 21,2 ms.
- Conclusão: mesma faixa; a diferença troca de lado entre rodadas (ruído). Nenhuma correção.
- Efeito colateral: os checkouts criaram 89 carrinhos de paulohenrique_ls@hotmail.com; os 42 do código antigo nasceram teste = 0 e foram marcados teste = 1. O código antigo também mandou ~42 InitiateCheckout à Meta (não dá para desfazer).
- Webhook ASSINADO: só mede com compra real.
