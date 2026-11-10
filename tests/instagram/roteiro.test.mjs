import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROTEIRO, CODIGOS_SITUACAO, CAMPANHAS, campanhaVigente } from '../../lib/instagram-ia/roteiro.js'
import { montarPrompt } from '../../lib/instagram-ia/prompt.js'

const normalizar = (s) => s.replace(/\r\n/g, '\n').trim()

test('docs/instagram-roteiro.md tem o mesmo roteiro do roteiro.js (entre os marcadores)', () => {
  const md = readFileSync('docs/instagram-roteiro.md', 'utf8')
  const m = md.match(/<!-- ROTEIRO:INICIO -->\n([\s\S]*?)\n<!-- ROTEIRO:FIM -->/)
  assert.ok(m, 'marcadores ROTEIRO:INICIO e ROTEIRO:FIM não encontrados')
  assert.equal(normalizar(m[1]), normalizar(ROTEIRO))
  for (const c of CAMPANHAS) assert.ok(md.includes(c.nome) && md.includes(c.inicio) && md.includes(c.fim))
})

test('todas as situações existem no roteiro, e o roteiro é de tamanho seguro', () => {
  for (const codigo of CODIGOS_SITUACAO) assert.ok(ROTEIRO.includes('### ' + codigo), codigo)
  assert.ok(ROTEIRO.length < 40000, `roteiro com ${ROTEIRO.length} caracteres`)
  assert.doesNotMatch(ROTEIRO, /[`\\]/, 'sem crase nem barra invertida no roteiro')
  assert.ok(ROTEIRO.includes('A CONFIRMAR PELO PAULO'))
})

test('campanha só vale dentro das datas (dia de Brasília)', () => {
  assert.equal(campanhaVigente(new Date('2026-11-10T12:00:00Z')), null)
  assert.equal(campanhaVigente(new Date('2026-11-26T02:59:00Z')), null) // ainda 25/11 em Brasília
  assert.equal(campanhaVigente(new Date('2026-11-26T03:00:00Z')).codigo, 'black-friday-2026')
  assert.equal(campanhaVigente(new Date('2026-11-28T02:59:00Z')).codigo, 'black-friday-2026')
  assert.equal(campanhaVigente(new Date('2026-11-28T03:00:00Z')), null)
})

test('prompt: roteiro inteiro, busca e campanha só quando vigente; cupom pendente exige humano', () => {
  const busca = { itens: [], tipo: 'nenhum' }
  const msgs = [{ direcao: 'entrada', texto: 'oi' }]
  const sem = montarPrompt({ mensagens: msgs, busca, campanha: null })
  const textoSem = sem.sistema.map((b) => b.texto).join('\n')
  assert.ok(textoSem.includes(ROTEIRO))
  assert.ok(textoSem.includes('RESULTADO DA BUSCA NO ACERVO'))
  assert.doesNotMatch(textoSem, /CAMPANHA VIGENTE:/)
  const com = montarPrompt({ mensagens: msgs, busca, campanha: CAMPANHAS[0] })
  const textoCom = com.sistema.map((b) => b.texto).join('\n')
  assert.match(textoCom, /CAMPANHA VIGENTE: Black Friday 2026.*R\$ 79,90/)
  assert.match(textoCom, /NÃO cite cupom/)
  assert.equal(sem.sistema[0].cache, true)
})

test('casos-roteiro.json: pelo menos 25 casos, bem formados, com tentativas de enganar a IA', () => {
  const { casos } = JSON.parse(readFileSync('tests/instagram/casos-roteiro.json', 'utf8'))
  assert.ok(casos.length >= 25)
  const ids = new Set()
  for (const c of casos) {
    assert.ok(!ids.has(c.id), 'id repetido ' + c.id)
    ids.add(c.id)
    assert.ok(CODIGOS_SITUACAO.includes(c.situacao_esperada), c.id)
    assert.equal(typeof c.precisa_humano, 'boolean')
    assert.ok(c.mensagem && Array.isArray(c.deve_conter) && Array.isArray(c.nao_pode_conter))
  }
  assert.ok(casos.filter((c) => c.tipo === 'injecao').length >= 4)
  for (const codigo of CODIGOS_SITUACAO) assert.ok(casos.some((c) => c.situacao_esperada === codigo), 'sem caso para ' + codigo)
})

test('script de avaliação roda com IA falsa e gera o relatório', () => {
  const saida = join(mkdtempSync(join(tmpdir(), 'ig-ia-')), 'relatorio.md')
  const r = spawnSync(process.execPath, ['--no-warnings', 'scripts/instagram-ia-avaliar.mjs', '--falso', '--modelos', 'modelo-falso', '--saida', saida], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(existsSync(saida))
  const texto = readFileSync(saida, 'utf8')
  assert.match(texto, /## modelo-falso/)
  assert.match(texto, /Situação certa: \d+ de \d+/)
  assert.match(texto, /### inj-cupom/)
})
