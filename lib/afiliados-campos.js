// Peças da tela do afiliado que não dependem do Next nem do banco (para testar
// sem navegador). Roda no navegador. Tudo aqui só ajuda a pessoa: o servidor
// confere CPF, código e valores de novo.

// Caminhos para onde /entrar e /criar-senha podem mandar a pessoa depois do
// login. Lista fechada, comparada por igualdade: qualquer outro valor (inclusive
// //site.com, http://… e barra invertida) cai no destino de sempre.
const VOLTAS_PERMITIDAS = ['/minha-conta/afiliado']

export function voltaPermitida(valor) {
  const v = String(valor || '').trim()
  return VOLTAS_PERMITIDAS.includes(v) ? v : ''
}

// ---- CPF ------------------------------------------------------------------
export function digitosCpf(valor) {
  return String(valor || '').replace(/[^0-9]/g, '').slice(0, 11)
}

// 000.000.000-00 enquanto digita.
export function mascaraCpf(valor) {
  const d = digitosCpf(valor)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

function digitoVerificador(base) {
  let soma = 0
  for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (base.length + 1 - i)
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

export function cpfValido(valor) {
  const d = digitosCpf(valor)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const d1 = digitoVerificador(d.slice(0, 9))
  const d2 = digitoVerificador(d.slice(0, 9) + d1)
  return d1 === Number(d[9]) && d2 === Number(d[10])
}

// ---- código ---------------------------------------------------------------
// Sugestão: primeiro nome (sem acento, só letras e números) + 2 dígitos. O
// servidor decide se está livre. `sorteio` existe só para o teste fixar o número.
export function sugerirCodigo(nome, sorteio = Math.random) {
  const primeiro = String(nome || '')
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 13)
  if (primeiro.length < 2) return ''
  return primeiro + String(10 + Math.floor(sorteio() * 90))
}

// O que a pessoa digita no campo: maiúsculas, só letras e números, até 15.
export function limparCodigoDigitado(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15)
}

// ---- dinheiro e links -----------------------------------------------------
// 3000 -> "R$ 30"; 3050 -> "R$ 30,50". Sem "R$ 30,00" para ler mais rápido.
export function reais(centavos) {
  const c = Math.round(Number(centavos) || 0)
  const inteiro = Math.floor(c / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const resto = c % 100
  return 'R$ ' + inteiro + (resto ? ',' + String(resto).padStart(2, '0') : '')
}

export function linkDoAfiliado(base, codigo) {
  return String(base).replace(/\/+$/, '') + '/?ref=' + encodeURIComponent(codigo)
}

export function linkWhatsApp(link) {
  const texto = 'Conheça a Trilha Viva, o acervo de multitracks gospel com clique e guia: ' + link
  return 'https://wa.me/?text=' + encodeURIComponent(texto)
}
