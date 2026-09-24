import Registro from '@/components/gestao/Registro'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/registro, que confere mais uma vez.
export default function RegistroPage() {
  return <Registro />
}
