import ContaChrome from '@/components/conta/ContaChrome'
import MenuContaAuto from '@/components/conta/MenuContaAuto'
import { clienteDaConta } from '@/lib/conta-pagina'
import { palcoEstado } from '@/lib/palco'

export const runtime = 'nodejs'
// Lê o cookie da sessão: montada a cada visita. O layout só pede o cliente
// (uma consulta, repartida com a página pelo cache() do React).
export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

export default async function ContaLayout({ children }) {
  const cliente = await clienteDaConta()
  // Sem login a moldura não faz sentido: cada página manda para /entrar. A única
  // exceção é /minha-conta/afiliado, que apresenta o programa a quem não entrou.
  if (!cliente) return children
  return (
    <ContaChrome
      menu={
        <MenuContaAuto
          palco={palcoEstado()}
          plano="nenhum"
          nome={cliente.nome || ''}
          email={cliente.email || ''}
        />
      }
    >
      {children}
    </ContaChrome>
  )
}
