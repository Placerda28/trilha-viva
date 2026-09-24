import ClientesLista from '@/components/gestao/ClientesLista'

// A permissão é conferida no layout (app/gestao/layout.js). Os dados chegam
// pelo navegador, de /api/gestao/clientes, que confere de novo.
export default function ClientesPage() {
  return <ClientesLista />
}
