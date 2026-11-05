import Medalha from '@/components/afiliados/painel/Medalha'
import { STATUS, grauDoNivel } from '../afiliadosUtil'

// Peças pequenas que a lista, a ficha e as metas repetem.

// Status como marca de texto: quadrado cheio (ativo), vazado (pendente) ou
// vermelho (suspenso). Sem pílula colorida: a forma diz o estado, o texto confirma.
const MARCA = {
  ativo: 'bg-ink',
  pendente: 'border border-ink bg-white',
  suspenso: 'bg-signal',
}

export function Status({ status }) {
  return (
    <span className={'inline-flex items-center gap-2 text-[14px] font-semibold ' + (status === 'suspenso' ? 'text-signal-deep' : 'text-ink')}>
      <span aria-hidden="true" className={'h-2.5 w-2.5 shrink-0 ' + (MARCA[status] || MARCA.pendente)} />
      {STATUS[status] || status}
    </span>
  )
}

// Selo de metal + nome do nível. `travado` marca o nível fixado à mão.
export function NivelSelo({ nivel, niveis, tamanho = 24, travado = false }) {
  if (!nivel) return <span className="text-[14px] text-ink-faint">Sem nível</span>
  return (
    <span className="inline-flex items-center gap-2">
      <Medalha cor={nivel.cor} grau={grauDoNivel(nivel, niveis)} tamanho={tamanho} className="text-ink" />
      <span className="text-[14.5px] font-semibold text-ink">{nivel.nome}</span>
      {travado && <span className="text-[12.5px] font-semibold text-ink-muted">(travado)</span>}
    </span>
  )
}

// Campo de texto no padrão das telas de gestão: rótulo em cima, ajuda e erro embaixo.
export function Campo({ id, rotulo, ajuda, erro, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14.5px] font-semibold text-ink">
        {rotulo}
      </label>
      {ajuda && (
        <p id={id + '-ajuda'} className="mt-0.5 text-[13.5px] text-ink-muted">
          {ajuda}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {erro && (
        <p id={id + '-erro'} role="alert" className="mt-1.5 text-[13.5px] font-semibold text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}

export const classeCampo = (erro) =>
  'block min-h-11 w-full rounded border bg-white px-3 py-2 text-[15.5px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:bg-mist/60 disabled:text-ink-muted ' +
  (erro ? 'border-signal' : 'border-line')

// Dado em duas linhas (rótulo pequeno, valor forte) para as fichas.
export function Dado({ rotulo, children, className = '' }) {
  return (
    <div className={'min-w-0 ' + className}>
      <dt className="text-[13.5px] text-ink-muted">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-[15.5px] font-semibold text-ink">{children}</dd>
    </div>
  )
}
