import Recuperacao from '@/components/gestao/Recuperacao'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/recuperacao, que confere mais uma vez.
export default function RecuperacaoPage() {
  return <Recuperacao />
}
