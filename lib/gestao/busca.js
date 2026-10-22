import { escaparLike } from './clientes.js'

const LIMITE = 8

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

// Termo da busca de pessoa: mínimo de 3 letras. O celular entra pelos dígitos
// (sem o 55), como na busca de leads.
export function termoBusca(valor) {
  const q = String(valor || '').trim().toLowerCase().slice(0, 80)
  if (q.length < 3) return null
  let digitos = q.replace(/\D/g, '')
  if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2)
  return { like: `%${escaparLike(q)}%`, celular: digitos.length >= 3 ? `%${digitos}%` : null }
}

export function situacaoDoCliente(linha) {
  if (Number(linha.bloqueado)) return 'bloqueado'
  return linha.supabase_id ? 'ativo' : 'sem_senha'
}

// Procura em clientes, carrinhos e leads de uma vez (um db.batch()) e devolve no
// máximo 8 resultados no total, na ordem clientes, carrinhos, leads.
export async function buscarPessoas(db, valor) {
  const termo = termoBusca(valor)
  if (!termo) return { clientes: [], carrinhos: [], leads: [] }
  const { like, celular } = termo
  const porCelular = (coluna) => (celular ? ` OR ${coluna} LIKE ?` : '')
  const extra = celular ? [celular] : []

  const [clientes, carrinhos, leads] = await db.batch([
    db.prepare(`
      SELECT c.id, c.nome, c.email, c.bloqueado, c.supabase_id,
             EXISTS (SELECT 1 FROM compras t WHERE t.cliente_id = c.id AND t.teste = 1 LIMIT 1) AS teste
        FROM clientes c
       WHERE LOWER(COALESCE(c.nome, '')) LIKE ? ESCAPE '\\'
          OR LOWER(c.email) LIKE ? ESCAPE '\\'
          ${celular ? 'OR c.email IN (SELECT k.email FROM carrinhos k WHERE k.telefone LIKE ?)' : ''}
       ORDER BY c.criado_em DESC, c.id DESC
       LIMIT ${LIMITE}`).bind(like, like, ...extra),
    db.prepare(`
      SELECT email, nome, status FROM (
        SELECT k.email, k.nome, k.status, k.criado_em,
               ROW_NUMBER() OVER (PARTITION BY k.email ORDER BY k.criado_em DESC, k.id DESC) AS ordem
          FROM carrinhos_reais k
         WHERE k.email IN (
           SELECT m.email FROM carrinhos_reais m
            WHERE LOWER(COALESCE(m.nome, '')) LIKE ? ESCAPE '\\'
               OR m.email LIKE ? ESCAPE '\\'${porCelular('m.telefone')}
         )
      )
       WHERE ordem = 1
       ORDER BY criado_em DESC
       LIMIT ${LIMITE}`).bind(like, like, ...extra),
    db.prepare(`
      SELECT email, nome, comprou FROM leads
       WHERE LOWER(nome) LIKE ? ESCAPE '\\'
          OR LOWER(email) LIKE ? ESCAPE '\\'${porCelular('whatsapp')}
       ORDER BY criado_em DESC, id DESC
       LIMIT ${LIMITE}`).bind(like, like, ...extra),
  ])

  let sobra = LIMITE
  const cortar = (lista) => {
    const parte = lista.slice(0, sobra)
    sobra -= parte.length
    return parte
  }
  return {
    clientes: cortar(linhas(clientes).map((c) => ({
      id: Number(c.id),
      nome: c.nome || null,
      email: c.email,
      situacao: situacaoDoCliente(c),
      teste: Boolean(Number(c.teste)),
    }))),
    carrinhos: cortar(linhas(carrinhos).map((c) => ({
      email: c.email,
      nome: c.nome || null,
      situacao: c.status,
    }))),
    leads: cortar(linhas(leads).map((l) => ({
      email: l.email,
      nome: l.nome,
      comprou: Boolean(Number(l.comprou)),
    }))),
  }
}
