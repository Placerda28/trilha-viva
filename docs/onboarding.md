# Preparar um PC novo

O caminho para abrir o Trilha Viva em outro computador, do zero.

## 1. Programas
- **Git** e **GitHub CLI** (`gh auth login` com a conta `Placerda28`).
- **Node 24** pelo `fnm`. Depois de instalar, ponha `fnm env` no perfil do terminal: sem isso, aparece "The current Node.js path is not on your PATH" e o `npm` pode falhar.
- **Google Drive para computador**, para que o Drive apareça como `G:\Meu Drive`. A gestão e o `HISTORICO.md` ficam lá.
- **Claude Code** e/ou **Codex CLI**. As ferramentas do toolkit estão em `docs/setup.md`.

## 2. Código
```bash
git clone https://github.com/Placerda28/trilha-viva.git C:/dev/trilha-viva
cd C:/dev/trilha-viva
npm ci
```
Use uma pasta de nome simples (sem caractere especial), como `C:\dev\...`. Uma pasta com ":" no nome já quebrou o build.

O `package-lock.json` deste repositório **não é versionado** (fica fora pelo `.git/info/exclude` local). Num PC novo, o `npm ci` não roda sem ele: use `npm install` ou copie o lock de um PC que funciona.

## 3. Variáveis (segredos)
- Copie `.env.example` para `.env.local` (`npm run dev` e `npm run build`) e `.dev.vars.example` para `.dev.vars` (`npm run preview`).
- Os valores vêm do painel da Cloudflare (Worker `www`, em Settings → Variables and secrets) ou do Paulo. **Nunca do repositório.**
- Atenção: os dois `.example` estão desatualizados. Ainda falam de Stripe e Drive e não listam Mercado Pago, B2, Supabase, Meta e WhatsApp. Use a lista do painel como fonte. Essa pendência está registrada em `docs/setup.md`.

## 4. Conferir
```bash
npm test        # testes passando
npm run build   # build termina sem erro
npm run dev     # http://localhost:3000
```

## 5. Contexto
Abra o Claude Code ou o Codex na pasta do projeto. O `AGENTS.md` leva aos documentos e ao Drive. Leia o `HISTORICO.md` do Drive para saber o que foi feito por último e o `tasks/todo.md` para saber o que está aberto.
