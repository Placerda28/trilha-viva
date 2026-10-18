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
