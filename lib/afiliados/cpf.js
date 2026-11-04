// CPF: só dígitos verificadores. Funções puras.
export function limparCpf(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

function digito(base) {
  let soma = 0
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

export function validarCpf(valor) {
  const cpf = limparCpf(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const d1 = digito(cpf.slice(0, 9))
  const d2 = digito(cpf.slice(0, 9) + d1)
  return cpf.endsWith(`${d1}${d2}`)
}
