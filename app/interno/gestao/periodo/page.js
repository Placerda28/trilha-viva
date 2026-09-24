import Periodo from '@/components/gestao/Periodo'

// A permissão é conferida no layout (app/gestao/layout.js). Os dados chegam
// pelo navegador, de /api/gestao/periodo, que confere de novo.
export default function PeriodoPage() {
  return <Periodo />
}
