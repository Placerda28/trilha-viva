import { redirect } from 'next/navigation'

// Enquanto Afiliados só tem a sub-aba Saques, a entrada leva direto a ela.
// Na Fase 8 esta página vira o Dashboard.
export default function AfiliadosPage() {
  redirect('/gestao/afiliados/saques')
}
