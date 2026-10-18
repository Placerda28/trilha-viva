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
