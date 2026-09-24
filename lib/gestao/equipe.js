const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizarEmailEquipe(valor) {
  return String(valor || '').trim().toLowerCase()
}

function invalido(campo, erro) {
  return { ok: false, campo, erro }
}

export function validarNovoMembro(dados, adminMaster) {
  const email = normalizarEmailEquipe(dados?.email)
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return invalido('email', 'Informe um e-mail válido.')
  }
  if (email === normalizarEmailEquipe(adminMaster)) {
    return invalido('email', 'O administrador master não pode ser adicionado como membro.')
  }

  const senha = typeof dados?.senha === 'string' ? dados.senha : ''
  if (senha.length < 10 || senha.length > 200) {
    return invalido('senha', 'A senha provisória deve ter de 10 a 200 caracteres.')
  }
  return { ok: true, dados: { email, senha } }
}

export function validarNovaSenha(valor) {
  const senha = typeof valor === 'string' ? valor : ''
  return senha.length >= 10 && senha.length <= 200
    ? { ok: true, senha }
    : invalido('nova', 'A nova senha deve ter de 10 a 200 caracteres.')
}

function resultados(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function isoUtc(valor) {
  if (!valor) return null
  const achado = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor))
  return achado ? `${achado[1]}T${achado[2]}Z` : null
}

export function membroDaLinha(linha) {
  if (!linha) return null
  return {
    id: Number(linha.id),
    email: linha.email,
    nome: linha.nome || null,
    ativo: Boolean(Number(linha.ativo)),
    libera_acervo: Boolean(Number(linha.libera_acervo)),
    precisa_trocar_senha: Boolean(Number(linha.precisa_trocar_senha)),
    criado_por: linha.criado_por,
    criado_em: isoUtc(linha.criado_em),
    removido_por: linha.removido_por || null,
    removido_em: isoUtc(linha.removido_em),
  }
}

const CAMPOS_MEMBRO = `
  e.id,
  e.email,
  c.nome,
  e.ativo,
  e.libera_acervo,
  e.precisa_trocar_senha,
  e.criado_por,
  e.criado_em,
  e.removido_por,
  e.removido_em`

export async function listarEquipe(db) {
  const resultado = await db.prepare(`
    SELECT ${CAMPOS_MEMBRO}
      FROM equipe e
      LEFT JOIN clientes c ON c.email = e.email
     ORDER BY e.ativo DESC, e.criado_em DESC, e.id DESC
     LIMIT 200`).all()
  return resultados(resultado).map(membroDaLinha)
}

export async function buscarMembroPorId(db, id) {
  const linha = await db.prepare(`
    SELECT ${CAMPOS_MEMBRO}
      FROM equipe e
      LEFT JOIN clientes c ON c.email = e.email
     WHERE e.id = ?
     LIMIT 1`).bind(id).first()
  return membroDaLinha(linha)
}

async function buscarMembroPorEmail(db, email) {
  return db.prepare('SELECT id, ativo FROM equipe WHERE email = ? LIMIT 1')
    .bind(email)
    .first()
}

async function buscarClientePorEmail(db, email) {
  return db.prepare('SELECT id, email, nome, supabase_id FROM clientes WHERE email = ? LIMIT 1')
    .bind(email)
    .first()
}

// A senha só é entregue à Supabase. Nenhuma instrução D1 recebe esse
// valor, inclusive quando um membro removido está sendo reativado.
export async function adicionarMembro(db, {
  email,
  senha,
  criadoPor,
  criarConta,
  acharPorEmail,
}) {
  const anterior = await buscarMembroPorEmail(db, email)
  if (anterior && Number(anterior.ativo) === 1) return { ok: false, conflito: true }

  let cliente = await buscarClientePorEmail(db, email)
  let supabaseId = cliente?.supabase_id || null
  let contaExistente = Boolean(supabaseId)
  // A troca obrigatória só é dispensada quando o nosso banco JÁ tinha o id
  // da Supabase desta pessoa antes deste cadastro (ou seja: é um cliente que
  // criou a própria senha). Se a Supabase disser "já existe" sem o nosso banco
  // saber, pode ser sobra de uma tentativa anterior que caiu no meio, criada
  // com a senha provisória: nesse caso a troca continua obrigatória.
  const jaVinculadaAntes = Boolean(cliente?.supabase_id)

  if (!supabaseId) {
    const criada = await criarConta({ email, senha, nome: cliente?.nome || undefined })
    if (criada?.ok && criada.id) {
      supabaseId = criada.id
    } else if (criada?.jaExiste) {
      const achada = await acharPorEmail(email)
      supabaseId = achada?.id || null
      contaExistente = Boolean(supabaseId)
    }
    if (!supabaseId) return { ok: false, contaIndisponivel: true }
  }

  const precisaTrocar = jaVinculadaAntes ? 0 : 1
  const gravacoes = []
  if (!cliente) {
    gravacoes.push(db.prepare('INSERT INTO clientes (email, supabase_id) VALUES (?, ?)').bind(email, supabaseId))
  } else if (!cliente.supabase_id) {
    gravacoes.push(db.prepare('UPDATE clientes SET supabase_id = ? WHERE id = ?').bind(supabaseId, cliente.id))
  }
  gravacoes.push(
    db.prepare(`
    INSERT INTO equipe
      (email, criado_por, ativo, libera_acervo, precisa_trocar_senha)
    VALUES (?, ?, 1, 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      criado_por = excluded.criado_por,
      criado_em = datetime('now'),
      ativo = 1,
      libera_acervo = 0,
      precisa_trocar_senha = excluded.precisa_trocar_senha,
      removido_por = NULL,
      removido_em = NULL`).bind(email, criadoPor, precisaTrocar)
  )

  // O vínculo com a Supabase e a linha da equipe entram JUNTOS (batch do D1
  // é uma transação: ou tudo entra, ou nada). Assim uma falha no meio nunca
  // deixa o vínculo gravado sem a equipe, o que numa nova tentativa faria a
  // conta criada com a senha provisória parecer "já existente" e dispensar a
  // troca obrigatória.
  if (typeof db.batch === "function") {
    await db.batch(gravacoes)
  } else {
    for (const g of gravacoes) await g.run()
  }

  const linha = await db.prepare(`
    SELECT ${CAMPOS_MEMBRO}
      FROM equipe e
      LEFT JOIN clientes c ON c.email = e.email
     WHERE e.email = ?
     LIMIT 1`).bind(email).first()
  return { ok: true, membro: membroDaLinha(linha), conta_existente: contaExistente }
}

export async function removerMembro(db, id, removidoPor) {
  const resultado = await db.prepare(`
    UPDATE equipe
       SET ativo = 0,
           libera_acervo = 0,
           removido_por = ?,
           removido_em = datetime('now')
     WHERE id = ? AND ativo = 1`)
    .bind(removidoPor, id)
    .run()
  if (!resultado?.meta?.changes) return null
  return buscarMembroPorId(db, id)
}

export async function alterarAcervoMembro(db, id, libera) {
  const resultado = await db.prepare(`
    UPDATE equipe
       SET libera_acervo = ?
     WHERE id = ? AND ativo = 1`)
    .bind(libera ? 1 : 0, id)
    .run()
  if (!resultado?.meta?.changes) return null
  return buscarMembroPorId(db, id)
}

export async function supabaseIdDoCliente(db, clienteId) {
  const linha = await db.prepare('SELECT supabase_id FROM clientes WHERE id = ? LIMIT 1')
    .bind(clienteId)
    .first()
  return linha?.supabase_id || null
}

export async function concluirTrocaSenha(db, email) {
  const resultado = await db.prepare(`
    UPDATE equipe
       SET precisa_trocar_senha = 0
     WHERE email = ? AND ativo = 1`)
    .bind(normalizarEmailEquipe(email))
    .run()
  return Boolean(resultado?.meta?.changes)
}
