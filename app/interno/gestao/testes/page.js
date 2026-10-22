import ContatosTeste from '@/components/gestao/ContatosTeste'

// Master e membro: a permissão é conferida no middleware e no layout, e as
// rotas /api/gestao/testes conferem de novo.
export default function TestesPage() {
  return <ContatosTeste />
}
