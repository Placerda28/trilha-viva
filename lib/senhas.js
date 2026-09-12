// Guarda e confere senhas usando a Supabase.
//
// Por que não fazer isso aqui dentro: guardar senha com segurança exige
// embaralhá-la de um jeito propositalmente lento (é o que impede alguém que
// roube o banco de descobrir as senhas). Esse trabalho leva de 70 a 200 ms de
// processamento, e o plano gratuito dos Cloudflare Workers dá 10 ms por visita.
// Não cabe. Então a conta de senha vive na Supabase, que faz esse trabalho no
// servidor dela, e o site só recebe "confere" ou "não confere".
//
// A Supabase NÃO controla quem entra no acervo. Ela só responde se a senha
// está certa. A sessão, a compra e a permissão são nossas, no banco D1.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function segredo() {
  return process.env.SUPABASE_SECRET_KEY
}

export function senhasConfiguradas() {
  return Boolean(BASE && PUBLICA && segredo())
}

async function chamar(caminho, { metodo = 'POST', corpo, chave, autorizacao } = {}) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      apikey: chave,
      Authorization: 'Bearer ' + (autorizacao || chave),
      'Content-Type': 'application/json',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  let dados = null
  try {
    dados = await res.json()
  } catch {
    dados = null
  }
  return { ok: res.ok, status: res.status, dados }
}

// Cria a conta de senha. Só é chamado depois de a Stripe confirmar o pagamento,
// por isso o e-mail já entra confirmado: quem pagou provou o endereço no
// checkout, e mandar outro e-mail de confirmação só atrapalharia.
export async function criarConta({ email, senha, nome }) {
  const r = await chamar('/auth/v1/admin/users', {
    corpo: {
      email,
      password: senha,
      email_confirm: true,
      user_metadata: nome ? { nome } : undefined,
    },
    chave: segredo(),
  })
  if (r.ok && r.dados?.id) return { ok: true, id: r.dados.id }
  const msg = String(r.dados?.msg || r.dados?.message || '')
  const jaExiste = r.status === 422 || msg.toLowerCase().includes('already')
  return { ok: false, jaExiste, erro: msg || 'Falha ao criar a conta.' }
}

// Devolve { ok: true } se a senha confere. A Supabase é quem faz a conta cara.
export async function conferirSenha({ email, senha }) {
  const r = await chamar('/auth/v1/token?grant_type=password', {
    corpo: { email, password: senha },
    chave: PUBLICA,
  })
  if (r.ok && r.dados?.user?.id) return { ok: true, id: r.dados.user.id }
  return { ok: false }
}

export async function acharPorEmail(email) {
  const r = await chamar('/auth/v1/admin/users?page=1&per_page=1&email=' + encodeURIComponent(email), {
    metodo: 'GET',
    chave: segredo(),
  })
  const lista = r.dados?.users || []
  const achado = lista.find((u) => String(u.email || '').toLowerCase() === email)
  return achado ? { id: achado.id } : null
}

export async function trocarSenha({ id, senha }) {
  const r = await chamar('/auth/v1/admin/users/' + id, {
    metodo: 'PUT',
    corpo: { password: senha },
    chave: segredo(),
  })
  return { ok: r.ok }
}

// Uma consulta barata só para manter o projeto acordado. O plano gratuito da
// Supabase pausa projetos que passam 7 dias sem movimento — e projeto pausado
// significa cliente que pagou sem conseguir entrar.
export async function batidaDeVida() {
  if (!BASE || !PUBLICA) return false
  try {
    const res = await fetch(BASE + '/auth/v1/settings', { headers: { apikey: PUBLICA } })
    return res.ok
  } catch {
    return false
  }
}
