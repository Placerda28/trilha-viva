// ESLint em MODO MEDIÇÃO (18/10/2026): tudo em "warn", nada trava.
// O build não roda o lint (next.config.mjs: eslint.ignoreDuringBuilds), então
// o deploy da Cloudflare não muda. A contagem por regra fica em docs/quality.md;
// regra que chegar a zero aviso pode virar "error".
//
// As regras quality/* vêm do Vibe Coding Toolkit (revisão de66fe3), copiadas sem
// alteração em eslint-rules/. Conferir com: npm run lint:verify
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import quality from './eslint-rules/index.cjs'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
})

// Rebaixa qualquer regra "error" para "warn": nesta fase só se mede.
const emAviso = (configs) => configs.map((c) => c.rules ? {
  ...c,
  rules: Object.fromEntries(Object.entries(c.rules).map(([nome, valor]) => {
    const [nivel, ...opcoes] = Array.isArray(valor) ? valor : [valor]
    return [nome, nivel === 'error' || nivel === 2 ? ['warn', ...opcoes] : valor]
  })),
} : c)

export default emAviso([
  {
    ignores: [
      '.next/', '.open-next/', '.wrangler/', 'node_modules/', 'public/img/',
      'graphify-out/', '.tmp-sql/', '.superpowers/', '.claude/', '.agents/',
      // Arquivos gerados a partir da planilha do acervo: não se editam à mão.
      'lib/catalog.js', 'lib/catalog-dados-*.js',
      'eslint-rules/',
    ],
  },
  // Sem isto o ESLint só lê .js/.mjs/.cjs e os componentes .jsx ficam de fora.
  { files: ['**/*.{js,jsx,mjs,cjs}'] },
  ...compat.config({ extends: ['eslint:recommended', 'next'] }),
  {
    plugins: { quality },
    rules: {
      'quality/max-lines': ['warn', { max: 350 }],
      // O site não tem um módulo de log: nos Workers, console.* é o log. A regra
      // mede quantas chamadas existem caso um dia se crie esse módulo.
      'quality/no-direct-console': ['warn', { logger: 'um módulo de log do projeto' }],
    },
  },
]).concat({
  // Fora do emAviso de propósito: medida com zero violação em 18/10, já entra como
  // "error". Componentes de tela não falam direto com o D1; quem consulta é lib/ ou a rota.
  rules: {
    'quality/no-direct-data-access': ['error', {
      modules: ['@/lib/d1', '@/lib/d1.js'],
      bindings: ['getDB', 'getEnv', 'umaLinha', 'executar'],
      layers: ['/components/'],
    }],
  },
})
