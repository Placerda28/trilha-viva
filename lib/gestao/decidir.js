function emailNormalizado(valor) {
  return String(valor || '').trim().toLowerCase()
}

// Função pura: a sessão já foi validada no servidor antes de chegar aqui.
export function decidirPapel({ cliente, adminMaster }) {
  if (!cliente || Number(cliente.bloqueado) !== 0) return null

  const master = emailNormalizado(adminMaster)
  if (!master) return null

  return emailNormalizado(cliente.email) === master ? 'master' : null
}
