import { adminAtual } from '@/lib/gestao/permissao'
import Financeiro from '@/components/gestao/afiliados/financeiro/Financeiro'

// A permissão é conferida no middleware e no layout; /api/gestao/afiliados/financeiro confere de novo.
export default async function FinanceiroAfiliadosPage() {
  const admin = await adminAtual()
  return <Financeiro master={admin?.papel === 'master'} />
}
