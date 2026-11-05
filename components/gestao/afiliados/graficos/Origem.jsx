import { numero } from '../../formato'
import { Legenda } from './Quadro'

// De onde veio o pagamento: Pix, cartão e o resto, para as vendas por afiliado
// e para todas as vendas. Duas barras de 100%, uma sobre a outra, na mesma
// escala, para comparar. O texto dentro do bloco só aparece quando cabe.
// forma: { afiliados: { pix, cartao, outro, sem_info }, todas: {...} }

const PARTES = [
  { id: 'pix', nome: 'Pix', cor: '#0D0D0D', texto: '#FFFFFF' },
  { id: 'cartao', nome: 'Cartão', cor: '#8A8A8A', texto: '#0D0D0D' },
  { id: 'outro', nome: 'Outro', cor: '#C4C6CB', texto: '#0D0D0D' },
  { id: 'sem_info', nome: 'Sem informação', cor: '#E7E8EB', texto: '#0D0D0D' },
]

const soma = (g) => PARTES.reduce((t, p) => t + (Number(g?.[p.id]) || 0), 0)

export function tabelaDaOrigem(forma) {
  return {
    colunas: ['Forma de pagamento', 'Vendas por afiliado', 'Todas as vendas'],
    linhas: PARTES.map((p) => [p.nome, numero(forma.afiliados[p.id]), numero(forma.todas[p.id])]),
  }
}

export const semVendas = (forma) => soma(forma.afiliados) + soma(forma.todas) === 0

function Barra({ titulo, grupo }) {
  const total = soma(grupo)
  return (
    <div>
      <p className="text-[14px] font-medium text-ink">
        {titulo} <span className="figs text-ink-muted">({numero(total)})</span>
      </p>
      {total === 0 ? (
        <p className="mt-1.5 text-[13.5px] text-ink-muted">Nenhuma venda no período.</p>
      ) : (
        <div className="mt-1.5 flex h-7 gap-[2px]" role="img" aria-label={PARTES.map((p) => p.nome + ' ' + numero(grupo[p.id])).join(', ')}>
          {PARTES.map((p) => {
            const v = Number(grupo[p.id]) || 0
            if (!v) return null
            const pct = (v / total) * 100
            return (
              <div
                key={p.id}
                title={p.nome + ': ' + numero(v) + ' (' + Math.round(pct) + '%)'}
                className={'flex items-center overflow-hidden rounded px-2 text-[12.5px] font-semibold'}
                style={{ width: pct + '%', backgroundColor: p.cor, color: p.texto }}
              >
                {pct >= 14 && <span className="figs">{Math.round(pct)}%</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Origem({ forma }) {
  return (
    <div className="flex flex-col gap-4">
      <Barra titulo="Vendas por afiliado" grupo={forma.afiliados} />
      <Barra titulo="Todas as vendas" grupo={forma.todas} />
      <Legenda itens={PARTES.filter((p) => (forma.afiliados[p.id] || 0) + (forma.todas[p.id] || 0) > 0)} />
    </div>
  )
}
