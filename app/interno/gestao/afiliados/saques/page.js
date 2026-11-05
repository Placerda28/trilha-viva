import { adminAtual } from '@/lib/gestao/permissao'
import Saques from '@/components/gestao/afiliados/Saques'

// A permissão (master e membros da equipe) é conferida no middleware e no
// layout; as rotas /api/gestao/afiliados/saques conferem de novo.
export default async function SaquesPage() {
  const admin = await adminAtual()
  return <Saques master={admin?.papel === 'master'} />
}
