import Cupons from '@/components/gestao/Cupons'

// A permissão é conferida no middleware e de novo no layout. Os dados chegam
// pelo navegador, de /api/gestao/cupons, que confere mais uma vez.
export default function CuponsPage() {
  return <Cupons />
}
