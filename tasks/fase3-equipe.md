# Fase 3 — Equipe e registro de ações: contrato entre backend (Codex) e frontend (Claude)

O Paulo autorizou fazer direto (24/09/2026). Regra de ouro: ninguém vira master
mexendo em dados. Master = só a variável ADMIN_MASTER. A tabela `equipe` só
cria "membro".

## Banco (migrations/0003_equipe.sql)
- `equipe`: id, email TEXT NOT NULL UNIQUE (minúsculas), criado_por TEXT NOT NULL,
  criado_em, ativo INTEGER NOT NULL DEFAULT 1, libera_acervo INTEGER NOT NULL DEFAULT 0,
  precisa_trocar_senha INTEGER NOT NULL DEFAULT 1, removido_por, removido_em.
  CHECKs de 0/1 nas três colunas de sim/não.
- `registro`: id, criado_em, quem TEXT NOT NULL (e-mail), acao TEXT NOT NULL,
  alvo TEXT, detalhe TEXT (JSON curto). Índice por criado_em.

## Papel (lib/gestao/sessao.js — a regra única, usada pelo middleware e pelas rotas)
- UMA consulta: sessão válida → cliente (não bloqueado) → LEFT JOIN equipe
  (mesmo e-mail, ativo = 1).
- master: e-mail = ADMIN_MASTER (como hoje). Se o e-mail do master estiver na
  tabela equipe, continua master (a tabela nunca rebaixa nem promove o master).
- membro: linha ativa em `equipe`.
- adminPeloToken devolve { papel, cliente:{id,email,nome}, precisa_trocar_senha:bool }.
  (precisa_trocar_senha é sempre false para o master.)
- Removido (ativo = 0) perde o acesso na PRÓXIMA requisição (não há cache).

## Troca de senha obrigatória
- Enquanto precisa_trocar_senha = 1, o membro só pode usar POST /api/gestao/senha.
  Todas as outras rotas /api/gestao/* respondem naoEncontrado para ele.
  (soAdmin recusa quem precisa trocar a senha; a rota de senha usa um wrapper que aceita.)
- A tela /gestao, para esse membro, mostra só o formulário de nova senha (o layout decide).

## Rotas (todas atrás do middleware; escrita exige mesmaOrigem, senão naoEncontrado)
Só master (soMaster; membro e resto → naoEncontrado):
- GET  /api/gestao/equipe → { ok, itens:[{ id, email, nome, ativo, libera_acervo,
  precisa_trocar_senha, criado_por, criado_em (ISO), removido_por, removido_em }] }
  (ativos primeiro, depois mais novos; LIMIT 200)
- POST /api/gestao/equipe { email, senha } → 201 { ok, membro, conta_existente }
  - e-mail válido e diferente do ADMIN_MASTER (senão 400 campo 'email');
  - senha provisória: 10 a 200 caracteres (400 campo 'senha'); nunca é gravada no D1
    nem aparece em log;
  - cria/acha a linha em `clientes` (o login do site exige) e a conta na Supabase
    (lib/senhas.js criarConta, com SUPABASE_SECRET_KEY); guarda supabase_id;
  - se a conta da Supabase JÁ existir (a pessoa já é cliente), NÃO troca a senha dela:
    conta_existente = true e precisa_trocar_senha = 0 (ela entra com a senha que já usa);
  - já é membro ativo → 409 campo 'email'; foi removido antes → reativa
    (ativo = 1, libera_acervo = 0, e a regra da senha acima vale de novo).
- POST /api/gestao/equipe/remover { id } → { ok, membro } (ativo = 0, removido_por/em)
- POST /api/gestao/equipe/acervo { id, libera: true|false } → { ok, membro }
Qualquer admin (master ou membro), inclusive quem precisa trocar a senha:
- POST /api/gestao/senha { nova } → { ok } | 400 { ok:false, erro, campo:'nova' }
  - só para membro (master troca pela recuperação normal): master → naoEncontrado;
  - 10 a 200 caracteres; troca na Supabase (trocarSenha com o supabase_id do cliente);
  - depois grava precisa_trocar_senha = 0.
Qualquer admin que já trocou a senha:
- GET /api/gestao/registro?pagina= → { ok, pagina, por_pagina:50, total, itens:[{ id,
  quando (ISO UTC), quem, acao, alvo, detalhe (objeto ou null) }] }, mais novo primeiro.

## Registro de ações (gravar sem nunca derrubar a ação principal: erro no registro = log)
cupom_criado (alvo = código), cupom_desativado, membro_adicionado (alvo = e-mail,
detalhe { conta_existente }), membro_removido, acervo_liberado, acervo_retirado,
senha_trocada (alvo = e-mail do próprio membro). cliente_bloqueado entra quando existir a
ação de bloquear (Fase 4).

## Acervo para membro
- temCompra(clienteId) em lib/sessao.js passa a aceitar também: membro ativo com
  libera_acervo = 1. Mudança mínima, uma consulta só. O resto do download não muda.

## Telas (frontend)
- Aba "Equipe" só para master; aba "Registro" para todos da gestão.
- O layout recebe papel e precisa_trocar_senha de adminAtual().
