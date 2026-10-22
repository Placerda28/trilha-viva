import Leads from '@/components/gestao/Leads'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/leads, que confere mais uma vez.
export default function LeadsPage() {
  return <Leads />
}
