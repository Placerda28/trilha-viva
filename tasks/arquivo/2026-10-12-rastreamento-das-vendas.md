# Rastreamento das vendas (Meta + origem), 12/10/2026

Branch `rastreio` (saiu de main 0c2546b). Pedido do Paulo/Cowork em 12/10: 25 vendas no D1 (24/09–10/10, R$ 2.247,50) × 16 no Gerenciador de Anúncios.
A branch `whatsapp-acesso-meta` (6541f0a) ficou como estava, sem merge.

## Correções feitas e provadas (local), 12/10
- [x] 2.1 Origem: componente Origem (layout) grava o cookie tv_origem (90 dias, primeira e última) em qualquer página com utm_* ou fbclid; sem _fbc, monta fb.1.<ms>.<fbclid>. O checkout usa a UTM da /assinar ou, sem ela, a do cookie. Carrinho e metadata do MP levam fbp/fbc/ip/ua, telefone e UTM.
- [x] 2.3 Migração 0012_rastreio.sql (só colunas novas em carrinhos e compras). Aplicada SÓ no D1 local. Privacidade atualizada.
- [x] 2.4 Purchase e InitiateCheckout do servidor com ph, fn, ln, external_id, country (SHA-256) e content_ids/content_type/num_items/order_id.
- [x] 2.5 Compra grava meta_status/meta_enviado_em (ok fica gravado mesmo se uma repetição falhar); log "meta capi Purchase ok <ref>".
- [x] 2.6 Gestão > Por período: colunas Origem e Meta e "Vendas por campanha e anúncio" (compras antigas em "Sem registro").
- [x] Não feitos de propósito: 2.2 e 2.7 (ver conclusão do diagnóstico). Stripe: só ganhou o log de sucesso (vem do lib/meta.js).
- [x] Provas: 174 testes passando (13 novos); build limpo; visita local com ?utm_source=meta&utm_campaign=teste&utm_content=teste&fbclid=TESTE123abc na home, Pixel bloqueado, depois /assinar sem nada → carrinho com utm teste/teste e fbc fb.1.<ms>.TESTE123abc; gestão conferida no computador e no celular (sem rolagem lateral); custo ~0,14 ms por evento.
- [x] ATENÇÃO: o build falha na pasta "C:dev" (o Next lê "Cdev" e não acha a fonte da /opengraph-image), também na main sem as mudanças. Build feito na cópia ~/tv-build (git worktree, nome de pasta comum), onde passa.
- [x] 0012 aplicada no D1 de produção pelo Paulo em 12/10 (14 colunas conferidas). O site antigo não usa as colunas: nada muda até o deploy.
- [x] Merge em main (a54ce29) e deploy pelo Paulo de ~/tv-build em 12/10 17:13 UTC: versão 1a2b577d (100%). Conferido no ar: home 200, /assinar 200, login 400 "Informe o e-mail e a senha." (ok), frase nova na /privacidade.
- [x] Prova real (12/10, Pix R$ 1,00, outra conta): compra 61 mp_183795116626 com utm meta/teste/teste, meta_status ok às 17:33:26 UTC; carrinho com origem utm=meta/-/teste/teste e fbp. A compra 60 (sem abrir o link) entrou como direto e também com Meta ok. Falta: Purchase do servidor no Gerenciador de Eventos e a linha "meta capi Purchase ok" no Observability (Cowork).
- [ ] Depois do deploy: CPU do /api/checkout e do webhook no painel da Cloudflare.

## Diagnóstico (só leitura), fechado
- [x] D1: 25 vendas reais de R$ 89,90 entre 24/09 e 10/10 (fora os 2 testes de R$ 1,00 e `teste_corrigir_email`). Mais 2 depois (11/10 e 12/10).
- [x] Origem gravada: só 2 das 25 (uma `ig/paid` com ids da campanha, uma `ig/social/link_in_bio`). As 9 primeiras (até 29/09) não têm carrinho: a tabela só nasceu em 29/09.
- [x] Causa da origem vazia: o `CheckoutForm` só lê a UTM do endereço da própria /assinar. Quem chega por outra página e navega até /assinar perde a origem. O `fbclid` não é guardado.
- [x] Mesmo id nos dois lados: servidor `r.referencia || r.compraId`, navegador `ref` (external_reference do retorno). A referência sempre existe nas compras do nosso checkout, então o `mp_<id>` não entra.
- [x] Produção tem `META_CAPI_TOKEN` e NÃO tem `META_TEST_EVENT_CODE` (bom: com ele os eventos iriam só para "Testar eventos").
- [x] 3 das 25 compraram depois de receber lembrete (19, 29 e 51), sempre por um carrinho novo sem UTM.
- [x] Metadata no MP (chave de produção em `.env.mp.local`, fora do git): as 25 têm referência, ip e navegador. 21 têm fbp. 11 têm fbc (10 com o clique no anúncio de 0–2 h antes; 1 de 65 h, a do lembrete). 4 sem fbp nem fbc (21, 27, 32, 42). 9 compras feitas no computador, 8 abertas dentro do app do Instagram/Facebook. Pix aprovado em até 7 min.
- [x] Conclusão parcial: a hipótese "Pix e lembrete chegam sem identidade" não se confirma (as 3 do lembrete têm fbp). A diferença 25 × 16 tem cara de atribuição (14 sem clique recente em link da Meta), não de envio perdido. Falta B e C para fechar.
- [x] Cowork, 12/10. Gerenciador de Eventos, Purchase 24/09–10/10: 62 recebidos = 28 do nosso servidor + 17 do gateway da própria Meta + 17 do navegador. InitiateCheckout: 210 (75 + 67 + 68). Qualidade 7,3/10. Avisos: enviar telefone (+21%), nome/país/etc., external_id (+10,7%), fbc 66,67%, desduplicação ainda em análise. Erro ativo: dados de visitantes da UE serão bloqueados em 11 dias (site de categoria religiosa).
- [x] Cloudflare Observability (só 7 dias, 05/10–12/10): 0 linhas `meta capi`. O código só grava em caso de falha, então 0 = nenhuma recusa no período (a busca avisou que pode estar incompleta).
- [x] CONCLUSÃO: (a) não recebido ≈ 0 (servidor 28 para 27 compras no período, contando os 2 testes de R$ 1). (b) recebido e não atribuído = 9 (25 − 16). Fazer 2.1, 2.3, 2.4, 2.5 e 2.6. Não fazer 2.2 (as 4 sem cookie também não tinham no carrinho) nem 2.7 (nada a reenviar).
