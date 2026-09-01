// As fotos ficam versionadas em base64 (assets/*.b64) e são escritas em
// public/img antes do build. Assim o repositório continua sendo só texto.
import fs from 'node:fs'
import path from 'node:path'

const from = 'assets'
const to = path.join('public', 'img')

if (!fs.existsSync(from)) process.exit(0)
fs.mkdirSync(to, { recursive: true })

for (const file of fs.readdirSync(from)) {
  if (!file.endsWith('.b64')) continue
  const name = file.replace(/\.b64$/, '')
  const target = path.join(to, name)
  const data = Buffer.from(fs.readFileSync(path.join(from, file), 'utf8').trim(), 'base64')
  fs.writeFileSync(target, data)
  console.log(`asset: ${target} (${data.length} bytes)`)
}
