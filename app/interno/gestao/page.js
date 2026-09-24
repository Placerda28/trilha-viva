import { redirect } from 'next/navigation'

// A permissão é conferida no layout, antes de chegar aqui.
export default function GestaoPage() {
  redirect('/gestao/clientes')
}
