import { cache } from 'react'
import { notFound } from 'next/navigation'
import { adminAtual } from '@/lib/gestao/permissao'
import GestaoNav from '@/components/gestao/GestaoNav'
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

const PAPEL = { master: 'Administrador master', membro: 'Equipe de gestão' }

export default async function GestaoLayout({ children }) {
  const admin = await quemEsta()
  if (!admin) notFound()

  // Membro que ainda está com a senha provisória só vê o formulário de troca.
  // As rotas de dados também recusam essa pessoa até ela trocar.
  const trocando = admin.papel === 'membro' && admin.precisa_trocar_senha

  return (
    <div className="shell pb-24 pt-10 sm:pt-12">
      {/* Na gestão não faz sentido o cabeçalho oferecer "Entrar" e "Liberar
          acesso". Em vez de pôr "/gestao" na lista de rotas do Header (que
          vai para o navegador de todo visitante), o próprio layout esconde
          os dois botões — e ele só é entregue a quem é da gestão. */}
      <style>{'[data-cta-compra]{display:none!important}'}</style>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.015em] text-ink sm:text-[32px]">
            Gestão
          </h1>
          <p className="mt-1.5 break-all text-[14px] text-ink-muted">
            {admin.cliente.email} · {PAPEL[admin.papel] || admin.papel}
          </p>
        </div>
        <a href="/acervo" className="link-quiet text-[14.5px]">
          Ir para o acervo
        </a>
      </div>

      {trocando ? (
        <TrocarSenha email={admin.cliente.email} />
      ) : (
        <>
          <GestaoNav papel={admin.papel} />
          {children}
        </>
      )}
    </div>
  )
}
