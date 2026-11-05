import Dashboard from '@/components/gestao/afiliados/dashboard/Dashboard'

// /gestao/afiliados abre o Dashboard. A permissão (master e membros) é
// conferida no middleware e no layout; as rotas de dados conferem de novo.
export default function AfiliadosPage() {
  return <Dashboard />
}
