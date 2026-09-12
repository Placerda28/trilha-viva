// Recusa pedido que veio de outro site.
//
// Sem isso, uma página qualquer poderia mandar o navegador do seu cliente
// fazer um POST aqui usando o cookie dele — sair da conta, trocar a senha,
// disparar e-mails. O navegador carimba o cabeçalho Origin nesses casos e não
// deixa a página forjá-lo, então comparar Origin com o nosso próprio endereço
// fecha essa porta.
//
// Pedido sem Origin passa: é o caso de navegação direta e de ferramenta de
// linha de comando, que não carregam cookie de ninguém.
export function mesmaOrigem(req) {
  const origem = req.headers.get('origin')
  if (!origem) return true
  try {
    return new URL(origem).host === req.headers.get('host')
  } catch {
    return false
  }
}
