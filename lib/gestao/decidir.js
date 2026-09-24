function emailNormalizado(valor) {
  return String(valor || '').trim().toLowerCase()
}

// Função pura: a sessão já foi validada no servidor antes de chegar aqui.
export function decidirPapel({ cliente, adminMaster }) {
  if (!cliente || Number(cliente.bloqueado) !== 0) return null

  const master = emailNormalizado(adminMaster)
  if (!master) return null

  // A tabela equipe nunca pode promover nem rebaixar o master. Por isso esta
  // comparação vem antes de olhar a linha de membro trazida pelo LEFT JOIN.
  if (emailNormalizado(cliente.email) === master) return 'master'
  return cliente.equipe_id == null ? null : 'membro'
}
