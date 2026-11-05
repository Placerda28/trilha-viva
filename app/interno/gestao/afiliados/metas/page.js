import { adminAtual } from '@/lib/gestao/permissao'
import Metas from '@/components/gestao/afiliados/metas/Metas'

// A permissão é conferida no middleware e no layout; as rotas /api/gestao/afiliados conferem de novo.
// O papel só decide o que a tela mostra: as ações do Master não aparecem para a equipe, e o servidor recusa se alguém forçar.
export default async function MetasAfiliadosPage() {
  const admin = await adminAtual()
  return <Metas master={admin?.papel === 'master'} />
}
