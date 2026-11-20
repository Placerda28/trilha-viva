import { cn } from '@/lib/cn'
import { CONTAINER, SECAO_Y } from './estilos'

// Faixa de página do redesenho: fundo de ponta a ponta, conteúdo no contêiner de
// 1280 px, espaço vertical de clamp(64px, 8cqi, 112px).
//
//   <Secao id="pacote" aria-labelledby="h-pacote">…</Secao>
//   <Secao fundo="surface">…</Secao>
//
// O [container-type:inline-size] é o que dá sentido às unidades `cqi` dos
// títulos e espaços lá dentro. Por isso nada com position: fixed mora dentro de
// uma <Secao> (a contenção vira o ponto de referência do fixed).
export default function Secao({ as: Tag = 'section', fundo = 'branco', className, interno, children, ...resto }) {
  return (
    <Tag
      className={cn('[container-type:inline-size]', fundo === 'surface' && 'bg-surface', className)}
      {...resto}
    >
      <div className={cn(CONTAINER, SECAO_Y, interno)}>{children}</div>
    </Tag>
  )
}
