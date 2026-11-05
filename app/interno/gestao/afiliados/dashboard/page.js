import Dashboard from '@/components/gestao/afiliados/dashboard/Dashboard'

// A permissão é conferida no middleware e no layout; /api/gestao/afiliados/dashboard confere de novo.
export default function DashboardAfiliadosPage() {
  return <Dashboard />
}
