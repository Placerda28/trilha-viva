// Reconstrói as imagens binárias a partir dos pedaços base64 versionados em assets/.
// Roda no `prebuild`, antes do `next build`.
//
// Cada imagem é gravada em assets/ como uma sequência de pedaços:
//   assets/<nome>.b64.00, .01, .02 ...
// e o manifesto assets/manifest.json guarda o sha256 dos bytes finais.
// Se um pedaço chegar corrompido ao repositório, o sha256 não bate e o build
// falha aqui — em vez de publicar uma imagem quebrada.

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(root, 'assets')
const outDir = join(root, 'public', 'img')

mkdirSync(outDir, { recursive: true })

const manifest = JSON.parse(readFileSync(join(assetsDir, 'manifest.json'), 'utf8'))
const files = readdirSync(assetsDir)

let failed = false

for (const [name, meta] of Object.entries(manifest)) {
  const parts = files
    .filter((f) => f.startsWith(`${name}.b64.`))
    .sort((a, b) => a.localeCompare(b))

  if (parts.length !== meta.parts) {
    console.error(`[assets] ${name}: esperava ${meta.parts} pedaços, encontrei ${parts.length}`)
    failed = true
    continue
  }

  const b64 = parts
    .map((p) => readFileSync(join(assetsDir, p), 'utf8').replace(/\s+/g, ''))
    .join('')

  const bytes = Buffer.from(b64, 'base64')
  const sha = createHash('sha256').update(bytes).digest('hex')

  if (bytes.length !== meta.bytes || sha !== meta.sha256) {
    console.error(
      `[assets] ${name}: integridade falhou\n` +
        `         esperado ${meta.bytes} bytes / ${meta.sha256}\n` +
        `         obtido   ${bytes.length} bytes / ${sha}`
    )
    failed = true
    continue
  }

  writeFileSync(join(outDir, name), bytes)
  console.log(`[assets] ${name} ok (${bytes.length} bytes)`)
}

if (failed) {
  console.error('[assets] build interrompido: algum asset está corrompido no repositório.')
  process.exit(1)
}