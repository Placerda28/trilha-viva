// Envio dos e-mails de saque pelo Resend. Sem `@/`: env e fetch por parâmetro. Devolve true/false, nunca lança.
export async function enviarEmailSaque(payload, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false
  const { titulo, ...corpo } = payload // eslint-disable-line no-unused-vars
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    if (!res.ok) console.error('resend saque', res.status, (await res.text()).slice(0, 200))
    return res.ok
  } catch (falhou) {
    console.error('email saque', falhou?.message)
    return false
  }
}
