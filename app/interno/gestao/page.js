import PainelTela from '@/components/gestao/PainelTela'

// O Painel. A permissão é conferida no layout, antes de chegar aqui; os dados
// chegam pelo navegador, de /api/gestao/painel e /api/gestao/avisos, que
// conferem de novo.
export default function GestaoPage() {
  return <PainelTela />
}
