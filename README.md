# Trilha Viva — Multitracks Gospel

O site https://trilhaviva.org vende, em pagamento único de R$ 89,90 (Pix ou cartão), acesso vitalício a um acervo de multitracks gospel (VS) com clique, guia e canais separados.

Stack: Next.js 15 + Tailwind, publicado na Cloudflare Workers (OpenNext), com banco D1, pagamento Mercado Pago, arquivos no Backblaze B2, e-mail Resend e WhatsApp da Meta.

## Começar
```bash
npm ci
npm run dev      # http://localhost:3000
npm test
npm run build
```
Para preparar um PC do zero, veja `docs/onboarding.md`.

## Publicar
Todo commit em `main` publica o site sozinho. Trabalho novo vai numa branch e só entra em `main` com o OK do Paulo. A reserva manual e os cuidados estão em `docs/architecture.md`.

## Onde está cada coisa
| Assunto | Arquivo |
|---|---|
| Regras para agentes (Claude, Codex) | `AGENTS.md`, `CLAUDE.md` |
| Produto, público e posicionamento | `PRODUCT.md` |
| Como o site funciona e fatos críticos | `docs/architecture.md` |
| Visual (cores, fontes) | `docs/design.md` |
| PC novo | `docs/onboarding.md` |
| Testes, lint e revisão de segurança | `docs/quality.md` |
| Ferramentas e decisões do toolkit | `docs/setup.md` |
| O que está aberto agora | `tasks/todo.md` |
| Frentes concluídas (detalhe) | `tasks/arquivo/` |
| Gestão, publicidade e histórico geral | Google Drive: `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA` (`LEIA-ME.md`, `HISTORICO.md`) |
| Palco (produto irmão) | `C:\dev\trilha-viva-palco` |
