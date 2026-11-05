import { adminAtual } from '@/lib/gestao/permissao'
import Lista from '@/components/gestao/afiliados/lista/Lista'

// A permissão é conferida no middleware e no layout; as rotas /api/gestao/afiliados conferem de novo.
// O papel só decide o que a tela mostra: as ações do Master não aparecem para a equipe, e o servidor recusa se alguém forçar.
export default async function ListaAfiliadosPage() {
  const admin = await adminAtual()
  return <Lista master={admin?.papel === 'master'} />
}
