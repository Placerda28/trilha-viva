import Saques from '@/components/gestao/afiliados/Saques'

// A permissão (master e membros da equipe) é conferida no middleware e no
// layout; as rotas /api/gestao/afiliados/saques conferem de novo.
export default function SaquesPage() {
  return <Saques />
}
