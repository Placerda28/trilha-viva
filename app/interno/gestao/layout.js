import { cache } from 'react'
import { notFound } from 'next/navigation'
import { adminAtual } from '@/lib/gestao/permissao'
import Casca from '@/components/gestao/Casca'
import TrocarSenha from '@/components/gestao/TrocarSenha'

export const runtime = 'nodejs'
// Lê o cookie da sessão, então é montada a cada visita. A casca aqui é
// mínima: as listas e os números chegam depois, pelas rotas /api/gestao.
export const dynamic = 'force-dynamic'

// Uma consulta de sessão por visita, mesmo sendo usada em dois lugares
// (título da página e conteúdo): o cache do React junta as duas chamadas.
const quemEsta = cache(adminAtual)

// Para quem não é da gestão, nada de título nem de metadado próprio: a página
// tem que sair idêntica à de um endereço que não existe.
export async function generateMetadata() {
  const admin = await quemEsta()
  if (!admin) return {}
  return {
    title: 'Gestão',
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  }
}

export default async function GestaoLayout({ children }) {
  const admin = await quemEsta()
  if (!admin) notFound()

  // Membro que ainda está com a senha provisória só vê o formulário de troca.
  // As rotas de dados também recusam essa pessoa até ela trocar.
  const trocando = admin.papel === 'membro' && admin.precisa_trocar_senha

  return (
    <>
      {/* Na gestão não faz sentido o cabeçalho oferecer "Entrar" e "Liberar
          acesso", nem o site público (Header e Footer) aparecer em volta da
          casca da gestão. Em vez de pôr "/gestao" na lista de rotas do Header
          (que vai para o navegador de todo visitante), o próprio layout os
          esconde — e ele só é entregue a quem é da gestão. Fora daqui o
          estilo não existe, então o site público fica como sempre. */}
      <style>{'[data-cta-compra],[data-site-chrome]{display:none!important}'}</style>

      {trocando ? (
        <Casca papel={admin.papel} email={admin.cliente.email} semMenu titulo="Criar senha">
          <TrocarSenha email={admin.cliente.email} />
        </Casca>
      ) : (
        <Casca papel={admin.papel} email={admin.cliente.email} parcial>
          {children}
        </Casca>
      )}
    </>
  )
}
