import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import {
  adicionarMembro,
  alterarAcervoMembro,
  concluirTrocaSenha,
  listarEquipe,
  removerMembro,
  validarNovaSenha,
  validarNovoMembro,
} from '../../lib/gestao/equipe.js'
import { consultarRegistro, gravarRegistro } from '../../lib/gestao/registro.js'

const moduloHeaders = 'data:text/javascript,' + encodeURIComponent(`
  export async function cookies() { return { get() { return null } } }
`)
const moduloD1 = 'data:text/javascript,' + encodeURIComponent(`
  export function getDB() { return null }
  export async function umaLinha(db, sql, ...valores) {
    if (!db) return null
    return (await db.prepare(sql).bind(...valores).first()) || null
  }
  export async function executar(db, sql, ...valores) {
    if (!db) return null
    return db.prepare(sql).bind(...valores).run()
  }
`)

registerHooks({
  resolve(especificador, contexto, proximo) {
    if (especificador === 'next/headers') {
      return { shortCircuit: true, url: moduloHeaders }
    }
    if (especificador === '@/lib/d1') {
      return { shortCircuit: true, url: moduloD1 }
    }
    if (especificador.startsWith('@/')) {
      return {
        shortCircuit: true,
        url: pathToFileURL(resolve(especificador.slice(2) + '.js')).href,
      }
    }
    return proximo(especificador, contexto)
  },
})

const { temCompra } = await import('../../lib/sessao.js')

class D1Local {
  constructor(banco) {
    this.banco = banco
  }

  prepare(sql) {
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novosValores) {
        valores = novosValores
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        const resultado = preparada.run(...valores)
        return {
          meta: {
            changes: Number(resultado.changes || 0),
            last_row_id: Number(resultado.lastInsertRowid || 0),
          },
        }
      },
    }
  }
}

function bancoEquipe() {
  const banco = new DatabaseSync(':memory:')
  banco.exec(readFileSync('migrations/0000_esquema_atual.sql', 'utf8'))
  banco.exec(readFileSync('migrations/0003_equipe.sql', 'utf8'))
  return { banco, d1: new D1Local(banco) }
}

test('valida e-mail, senha e impede adicionar o e-mail do master', () => {
  const base = { email: ' pessoa@EXAMPLE.com ', senha: 'senha-segura' }
  assert.deepEqual(validarNovoMembro(base, 'master@example.com'), {
    ok: true,
    dados: { email: 'pessoa@example.com', senha: 'senha-segura' },
  })
  assert.equal(validarNovoMembro({ ...base, email: 'sem-arroba' }, 'master@example.com').campo, 'email')
  assert.equal(validarNovoMembro({ ...base, senha: 'curta' }, 'master@example.com').campo, 'senha')
  assert.equal(validarNovoMembro({ ...base, senha: 'x'.repeat(201) }, 'master@example.com').campo, 'senha')
  assert.equal(
    validarNovoMembro({ ...base, email: ' MASTER@EXAMPLE.COM ' }, 'master@example.com').campo,
    'email'
  )
  assert.equal(validarNovaSenha('x'.repeat(10)).ok, true)
  assert.equal(validarNovaSenha('x'.repeat(9)).campo, 'nova')
})

test('adiciona, remove e reativa sem guardar a senha no D1', async () => {
  const { banco, d1 } = bancoEquipe()
  let senhaRecebida = null
  const primeira = await adicionarMembro(d1, {
    email: 'nova@example.com',
    senha: 'provisoria-123',
    criadoPor: 'master@example.com',
    criarConta: async ({ senha }) => {
      senhaRecebida = senha
      return { ok: true, id: 'sup_nova' }
    },
    acharPorEmail: async () => null,
  })

  assert.equal(primeira.ok, true)
  assert.equal(primeira.conta_existente, false)
  assert.equal(primeira.membro.ativo, true)
  assert.equal(primeira.membro.libera_acervo, false)
  assert.equal(primeira.membro.precisa_trocar_senha, true)
  assert.equal(senhaRecebida, 'provisoria-123')
  assert.equal(
    banco.prepare("SELECT senha_hash FROM clientes WHERE email = 'nova@example.com'").get().senha_hash,
    null
  )

  const comAcervo = await alterarAcervoMembro(d1, primeira.membro.id, true)
  assert.equal(comAcervo.libera_acervo, true)
  const removido = await removerMembro(d1, primeira.membro.id, 'master@example.com')
  assert.equal(removido.ativo, false)
  assert.equal(removido.libera_acervo, false)

  const reativado = await adicionarMembro(d1, {
    email: 'nova@example.com',
    senha: 'outra-provisoria',
    criadoPor: 'master@example.com',
    criarConta: async () => {
      throw new Error('não deve trocar nem recriar uma conta existente')
    },
    acharPorEmail: async () => null,
  })
  assert.equal(reativado.ok, true)
  assert.equal(reativado.conta_existente, true)
  assert.equal(reativado.membro.ativo, true)
  assert.equal(reativado.membro.libera_acervo, false)
  assert.equal(reativado.membro.precisa_trocar_senha, false)

  const repetido = await adicionarMembro(d1, {
    email: 'nova@example.com',
    senha: 'nao-importa-123',
    criadoPor: 'master@example.com',
    criarConta: async () => ({ ok: true, id: 'outro' }),
    acharPorEmail: async () => null,
  })
  assert.equal(repetido.conflito, true)
  assert.equal((await listarEquipe(d1)).length, 1)
})

test('cliente com conta Supabase existente mantém a senha que já usa', async () => {
  const { banco, d1 } = bancoEquipe()
  banco.prepare(`
    INSERT INTO clientes (email, nome, supabase_id)
    VALUES ('cliente@example.com', 'Cliente', 'sup_existente')`).run()

  const resultado = await adicionarMembro(d1, {
    email: 'cliente@example.com',
    senha: 'provisoria-ignorada',
    criadoPor: 'master@example.com',
    criarConta: async () => {
      throw new Error('não deve criar nem trocar a conta existente')
    },
    acharPorEmail: async () => null,
  })
  assert.equal(resultado.conta_existente, true)
  assert.equal(resultado.membro.precisa_trocar_senha, false)
  assert.equal(
    banco.prepare("SELECT supabase_id FROM clientes WHERE email = 'cliente@example.com'").get().supabase_id,
    'sup_existente'
  )
})

test('conta encontrada na Supabase é ligada ao cliente sem usar a senha provisória, mas com troca obrigatória', async () => {
  const { banco, d1 } = bancoEquipe()
  banco.prepare("INSERT INTO clientes (email) VALUES ('antiga@example.com')").run()
  const resultado = await adicionarMembro(d1, {
    email: 'antiga@example.com',
    senha: 'provisoria-ignorada',
    criadoPor: 'master@example.com',
    criarConta: async () => ({ ok: false, jaExiste: true }),
    acharPorEmail: async () => ({ id: 'sup_antiga' }),
  })
  assert.equal(resultado.conta_existente, true)
  // O nosso banco não conhecia a conta: pode ser sobra de cadastro que caiu no
  // meio, criada com a senha provisória. Por segurança, a troca fica obrigatória.
  assert.equal(resultado.membro.precisa_trocar_senha, true)
  assert.equal(
    banco.prepare("SELECT supabase_id FROM clientes WHERE email = 'antiga@example.com'").get().supabase_id,
    'sup_antiga'
  )
})

test('conclusão da troca de senha limpa a obrigação somente do membro ativo', async () => {
  const { banco, d1 } = bancoEquipe()
  banco.exec(`
    INSERT INTO clientes (email, supabase_id) VALUES ('troca@example.com', 'sup_troca');
    INSERT INTO equipe (email, criado_por) VALUES ('troca@example.com', 'master@example.com');
  `)
  assert.equal(await concluirTrocaSenha(d1, 'TROCA@EXAMPLE.COM'), true)
  assert.equal(banco.prepare("SELECT precisa_trocar_senha AS troca FROM equipe").get().troca, 0)
  banco.prepare("UPDATE equipe SET ativo = 0, precisa_trocar_senha = 1").run()
  assert.equal(await concluirTrocaSenha(d1, 'troca@example.com'), false)
})

test('temCompra aceita compra paga ou membro ativo com acervo liberado', async () => {
  const { banco, d1 } = bancoEquipe()
  banco.exec(`
    INSERT INTO clientes (id, email, nome) VALUES (1, 'membro@example.com', 'Membro');
    INSERT INTO equipe (email, criado_por, libera_acervo)
    VALUES ('membro@example.com', 'master@example.com', 0);
  `)

  assert.equal(await temCompra(1, d1), false)
  banco.prepare('UPDATE equipe SET libera_acervo = 1').run()
  assert.equal(await temCompra(1, d1), true)
  banco.prepare('UPDATE equipe SET ativo = 0').run()
  assert.equal(await temCompra(1, d1), false)
  banco.prepare('UPDATE equipe SET ativo = 1, libera_acervo = 0').run()
  assert.equal(await temCompra(1, d1), false)
  banco.prepare("INSERT INTO compras (cliente_id, stripe_session_id) VALUES (1, 'paga_1')").run()
  assert.equal(await temCompra(1, d1), true)
})

test('membro bloqueado não recebe acervo pela equipe', async () => {
  const { banco, d1 } = bancoEquipe()
  banco.exec(`
    INSERT INTO clientes (id, email, bloqueado) VALUES (2, 'bloqueado@example.com', 1);
    INSERT INTO equipe (email, criado_por, libera_acervo)
    VALUES ('bloqueado@example.com', 'master@example.com', 1);
  `)
  assert.equal(await temCompra(2, d1), false)
})

test('registro grava JSON e sua falha nunca derruba a ação principal', async () => {
  const { d1 } = bancoEquipe()
  assert.equal(await gravarRegistro(d1, {
    quem: 'MASTER@EXAMPLE.COM',
    acao: 'membro_adicionado',
    alvo: 'nova@example.com',
    detalhe: { conta_existente: true },
  }), true)
  const pagina = await consultarRegistro(d1, 1)
  assert.equal(pagina.total, 1)
  assert.deepEqual(pagina.itens[0].detalhe, { conta_existente: true })
  assert.equal(pagina.itens[0].quem, 'master@example.com')

  const erroOriginal = console.error
  console.error = () => {}
  try {
    const bancoQuebrado = { prepare() { throw new Error('D1 fora do ar') } }
    assert.equal(await gravarRegistro(bancoQuebrado, {
      quem: 'master@example.com',
      acao: 'cupom_criado',
      alvo: 'TESTE',
    }), false)
  } finally {
    console.error = erroOriginal
  }
})

test('conta da Supabase sem vínculo no nosso banco continua obrigada a trocar a senha', async () => {
  const { d1 } = bancoEquipe()
  const resultado = await adicionarMembro(d1, {
    email: 'sobra@example.com',
    senha: 'provisoria-123',
    criadoPor: 'master@example.com',
    criarConta: async () => ({ ok: false, jaExiste: true }),
    acharPorEmail: async () => ({ id: 'sb-sobra' }),
  })
  assert.equal(resultado.ok, true)
  assert.equal(resultado.membro.precisa_trocar_senha, true)
})
