// ESLint do site. Começou em modo medição (18/10/2026); em 19/10 as regras do
// Next e do eslint:recommended chegaram a zero e passaram a valer com o nível
// padrão delas (erro). Só as duas regras abaixo com violações antigas ficam em
// aviso. O build não roda o lint (next.config.mjs: eslint.ignoreDuringBuilds),
// então o deploy da Cloudflare não depende dele. Contagem em docs/quality.md.
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

const config = [
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
      // Em aviso: 11 arquivos ainda passam de 350 linhas (plano em docs/quality.md).
      'quality/max-lines': ['warn', { max: 350 }],
      // Em aviso: o site não tem um módulo de log; nos Workers, console.* é o log.
      'quality/no-direct-console': ['warn', { logger: 'um módulo de log do projeto' }],
      // Componentes de tela não falam direto com o D1; quem consulta é lib/ ou a rota.
      'quality/no-direct-data-access': ['error', {
        modules: ['@/lib/d1', '@/lib/d1.js'],
        bindings: ['getDB', 'getEnv', 'umaLinha', 'executar'],
        layers: ['/components/'],
      }],
    },
  },
  {
    // Um Worker da Cloudflare se declara com `export default { fetch, scheduled }`.
    files: ['workers/**'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
]

export default config
