'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Icone } from '@/components/ds'

// Campo de senha com o botão de olho (MUDANÇAS §6): mostra ou esconde o que foi
// digitado. Mesmo desenho do Campo (rótulo em cima, 48 px, 16 px de texto,
// erro em vermelho de texto com ícone). O botão de olho tem 44 px.
//
//   <CampoSenha rotulo="Senha" mostrar={mostrar} onAlternar={() => setMostrar((v) => !v)}
//               extra={<a href="/recuperar">Esqueci a senha</a>} ajuda="…" erro={erro} … />
//
// `extra` é o que fica à direita do rótulo (o link "Esqueci a senha").
// `onAlternar` ausente = sem botão de olho (o segundo campo "Repita a senha"
// segue o estado do primeiro).
const OLHO = (
  <>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </>
)
const OLHO_RISCADO = (
  <>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </>
)

export default function CampoSenha({ rotulo, ajuda, erro, mostrar = false, onAlternar, extra, id, className, ...resto }) {
  const auto = useId()
  const campoId = id || auto
  const ajudaId = ajuda ? `${campoId}-ajuda` : undefined
  const erroId = erro ? `${campoId}-erro` : undefined
  const descreve = [erroId, ajudaId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className={cn('flex items-center justify-between gap-3', extra && 'min-h-11')}>
        <label htmlFor={campoId} className="text-[15px] font-semibold text-ink">
          {rotulo}
        </label>
        {extra}
      </div>
      <div className="relative">
        <input
          id={campoId}
          type={mostrar ? 'text' : 'password'}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descreve}
          className={cn(
            'block h-12 w-full rounded-control border bg-white pl-3.5 text-[16px] text-ink transition-colors duration-150 motion-reduce:transition-none',
            onAlternar ? 'pr-14' : 'pr-3.5',
            erro ? 'border-red-text' : 'border-field-border hover:border-ink'
          )}
          {...resto}
        />
        {onAlternar && (
          <button
            type="button"
            onClick={onAlternar}
            aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
            aria-pressed={mostrar}
            className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-control text-text-2 hover:bg-surface"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {mostrar ? OLHO_RISCADO : OLHO}
            </svg>
          </button>
        )}
      </div>
      {ajuda && (
        <p id={ajudaId} className="text-[14px] leading-[1.45] text-text-3">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={erroId} role="alert" className="flex items-start gap-1.5 text-[14px] font-medium leading-[1.45] text-red-text">
          <Icone nome="alerta" tamanho={16} className="mt-[2px]" />
          <span>{erro}</span>
        </p>
      )}
    </div>
  )
}
