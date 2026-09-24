import { notFound } from 'next/navigation'
import { adminAtual } from '@/lib/gestao/permissao'
import Equipe from '@/components/gestao/Equipe'

// Só o master. Um membro que digite o endereço recebe "não encontrada", e as
// rotas /api/gestao/equipe recusam de novo, no servidor.
export default async function EquipePage() {
  const admin = await adminAtual()
  if (admin?.papel !== 'master') notFound()
  return <Equipe />
}
