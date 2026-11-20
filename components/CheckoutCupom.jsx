'use client'

import { useEffect, useRef } from 'react'
import { Botao, Icone } from '@/components/ds'
import { priceBRL } from '@/lib/site'

// Bloco do cupom do formulário de compra (MUDANÇAS §4), nos quatro estados:
//   fechado    só o link "Tenho um cupom"
//   aberto     campo + "Aplicar"
//   inválido   o mesmo, com a borda e a mensagem em vermelho de texto
//   aplicado   "Cupom XXX · Remover · −R$ 10,00" e o Total
// O estado vem de useCupom() (components/checkout/useCupom.js); o servidor
// confere o cupom de novo na hora de cobrar.
export default function CheckoutCupom({ cupom }) {
  const { aberto, setAberto, codigo, setCodigo, aplicado, checando, erro, aplicar, remover } = cupom
  const campo = useRef(null)
  const abriuPorClique = useRef(false)

  useEffect(() => {
    if (aberto && abriuPorClique.current) campo.current?.focus()
  }, [aberto])

  if (aplicado) {
    return (
      <div className="flex flex-col border-t border-line">
        <div className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
          <span className="flex items-center gap-2">
            Cupom <strong className="font-[650] tracking-[.02em]">{aplicado.cupom}</strong>
            <button
              type="button"
              onClick={remover}
              className="min-h-11 px-1 text-[14px] text-text-3 underline underline-offset-[3px] hover:text-ink"
            >
              Remover
            </button>
          </span>
          <span className="tabular-nums">−{priceBRL(aplicado.de - aplicado.preco)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
          <strong className="text-[16px] font-[650]">Total</strong>
          <strong className="whitespace-nowrap font-semi-condensed text-[28px] font-[800] tabular-nums">
            {priceBRL(aplicado.preco)}
          </strong>
        </div>
      </div>
    )
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          abriuPorClique.current = true
          setAberto(true)
        }}
        className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        Tenho um cupom
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="cupom" className="text-[15px] font-semibold">
        Cupom
      </label>
      <div className="flex gap-2">
        <input
          ref={campo}
          id="cupom"
          name="cupom"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              aplicar(codigo)
            }
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'cupom-erro' : undefined}
          placeholder="Digite o código"
          className={`h-12 min-w-0 flex-1 rounded-control border bg-white px-3.5 text-[16px] uppercase text-ink placeholder:normal-case placeholder:text-text-4 ${erro ? 'border-red-text' : 'border-field-border hover:border-ink'}`}
        />
        <Botao variante="contorno" onClick={() => aplicar(codigo)} carregando={checando} disabled={!codigo.trim()}>
          Aplicar
        </Botao>
      </div>
      {erro && (
        <p id="cupom-erro" role="alert" className="flex items-start gap-1.5 text-[14px] font-medium leading-[1.45] text-red-text">
          <Icone nome="alerta" tamanho={16} className="mt-[2px]" />
          <span>{erro}</span>
        </p>
      )}
    </div>
  )
}
