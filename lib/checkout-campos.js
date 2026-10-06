// Lógica do formulário de compra que não depende da tela (para testar sem
// navegador): o WhatsApp, os dados lembrados neste aparelho e o que vai no
// envio. Nada daqui fala com o servidor.

// Só os dígitos, sem o 55 do Brasil nem o 0 de discagem. Valido = DDD +
// número (10 ou 11 dígitos). O servidor confere de novo do mesmo jeito.
// O preenchimento automático do celular costuma mandar "+55 27 99999-8888".
export function digitosCelular(valor) {
  let d = String(valor || '').replace(/[^0-9]/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if ((d.length === 11 || d.length === 12) && d.startsWith('0')) d = d.slice(1)
  return d
}

export function celularValido(digitos) {
  return /^[1-9][0-9]{9,10}$/.test(digitos)
}

// Máscara enquanto digita: (27) 99999-8888. Só para ler melhor; o que vale é
// digitosCelular.
export function mascaraCelular(valor) {
  const d = digitosCelular(valor).slice(0, 11)
  if (d.length <= 2) return d.length ? '(' + d : ''
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2)
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
}

// Nome, e-mail e WhatsApp guardados só no navegador da pessoa, para a próxima
// compra. Aba anônima ou armazenamento bloqueado: não lembra e segue normal.
export const CHAVE_CHECKOUT = 'tv_checkout'

function armazenamento(storage) {
  if (storage !== undefined) return storage
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function lerGuardado(storage) {
  try {
    const bruto = armazenamento(storage)?.getItem(CHAVE_CHECKOUT)
    if (!bruto) return null
    const dados = JSON.parse(bruto)
    const nome = typeof dados?.nome === 'string' ? dados.nome : ''
    const email = typeof dados?.email === 'string' ? dados.email : ''
    const telefone = typeof dados?.telefone === 'string' ? dados.telefone : ''
    return nome || email || telefone ? { nome, email, telefone } : null
  } catch {
    return null
  }
}

export function guardar(dados, storage) {
  try {
    armazenamento(storage)?.setItem(
      CHAVE_CHECKOUT,
      JSON.stringify({ nome: dados.nome, email: dados.email, telefone: dados.telefone }),
    )
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function esquecer(storage) {
  try {
    armazenamento(storage)?.removeItem(CHAVE_CHECKOUT)
  } catch {
    /* nada a apagar */
  }
}

// O que preenche cada campo ao abrir: o carrinho do lembrete (?r=) vale mais
// que o guardado neste aparelho, que vale mais que vazio. lembrado diz se
// algum campo veio do guardado (para mostrar "Não é você? Limpar").
export function escolherInicial(carrinho, guardado) {
  const valores = { nome: '', email: '', telefone: '' }
  let lembrado = false
  for (const campo of Object.keys(valores)) {
    if (carrinho?.[campo]) valores[campo] = carrinho[campo]
    else if (guardado?.[campo]) {
      valores[campo] = guardado[campo]
      lembrado = true
    }
  }
  if (valores.telefone) valores.telefone = mascaraCelular(valores.telefone)
  return { ...valores, lembrado }
}

// O que vai no envio. Às vezes o navegador preenche o campo sem avisar o
// React: o estado fica vazio e a tela mostra o valor. Então, campo a campo,
// vale o estado e, se ele estiver vazio, o que está escrito no formulário.
export function valoresDoEnvio(estado, form) {
  const doForm = (nome) => {
    const campo = form?.elements?.namedItem?.(nome)
    return campo && typeof campo.value === 'string' ? campo.value : ''
  }
  return {
    nome: (estado.nome || doForm('name')).trim(),
    email: (estado.email || doForm('email')).trim(),
    telefone: estado.telefone || doForm('tel'),
  }
}
