function emailNormalizado(valor) {
  return String(valor || '').trim().toLowerCase()
}

// ADMIN_MASTER aceita vários e-mails separados por vírgula, ponto e vírgula ou espaço.
// Itens vazios somem; só entra o que parece e-mail (tem @), então lixo não vira master.
export function mastersDe(valor) {
  return [...new Set(
    String(valor || '').split(/[\s,;]+/).map(emailNormalizado).filter((e) => e.includes('@'))
  )]
}

export function ehMaster(email, valor) {
  const e = emailNormalizado(email)
  return Boolean(e) && mastersDe(valor).includes(e)
}

// Função pura: a sessão já foi validada no servidor antes de chegar aqui.
export function decidirPapel({ cliente, adminMaster }) {
  if (!cliente || Number(cliente.bloqueado) !== 0) return null

  // A tabela equipe nunca pode promover nem rebaixar o master. Por isso esta
  // comparação vem antes de olhar a linha de membro trazida pelo LEFT JOIN.
  if (ehMaster(cliente.email, adminMaster)) return 'master'
  return cliente.equipe_id == null ? null : 'membro'
}
