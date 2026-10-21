import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularDatas } from '../../scripts/gerar-lastmod.mjs'

test('data acompanha a última alteração da linha, sem mudar por commits alheios', () => {
  const atual = ['musica', 'Título', 'Artista', 3, 10]
  const velha = ['musica', 'Título', 'Artista', 3, 9]
  const versoes = [
    { data: '2026-09-01', linhas: [atual] },
    { data: '2026-09-02', linhas: [velha] },
    { data: '2026-09-03', linhas: [atual] },
    { data: '2026-09-04', linhas: [atual] },
  ]
  assert.deepEqual(calcularDatas([atual], versoes, {}, '2026-10-21'), { musica: '2026-09-03' })
  assert.deepEqual(calcularDatas([atual], [{ data: '2026-09-02', linhas: [velha] }], { musica: '2026-09-02' }, '2026-10-21'), { musica: '2026-10-21' })
})

test('música sem histórico recebe hoje uma vez; reintrodução recebe nova data', () => {
  const linha = ['nova', 'Título', 'Artista']
  assert.deepEqual(calcularDatas([linha], [], {}, '2026-10-21'), { nova: '2026-10-21' })
  assert.deepEqual(calcularDatas([linha], [], { nova: '2026-10-20' }, '2026-10-21'), { nova: '2026-10-20' })
  assert.deepEqual(calcularDatas([linha], [
    { data: '2026-09-01', linhas: [linha] },
    { data: '2026-09-02', linhas: [] },
    { data: '2026-09-03', linhas: [linha] },
  ], {}, '2026-10-21'), { nova: '2026-09-03' })
})
