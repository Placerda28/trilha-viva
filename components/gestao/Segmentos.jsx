'use client'

// Botões lado a lado em que um só fica marcado (atalhos de data, dia/semana/
// mês, % ou R$). Compartilhado pelas telas da gestão para o mesmo controle
// ter a mesma cara em todo lugar.
export default function Segmentos({ opcoes, valor, onEscolher, rotulo, tamanho = 'normal' }) {
  const medida = tamanho === 'compacto' ? 'px-3 py-1.5 text-[13.5px]' : 'px-3.5 py-2 text-[14px]'
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const marcado = o.id === valor
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={marcado}
            onClick={() => onEscolher(o.id)}
            className={
              'rounded border font-semibold transition-colors duration-150 ' +
              medida +
              ' ' +
              (marcado ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink')
            }
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
