'use client'

import { priceBRL } from '@/lib/site'

// Bloco do cupom do CheckoutForm: o link "Tenho um cupom", o campo com o botão
// Aplicar e, depois de aplicado, o preço novo com "Remover". O estado fica no
// CheckoutForm, que confere o cupom de novo na hora de cobrar.
export default function CheckoutCupom({
  id,
  escuro,
  rotuloCls,
  campoCls,
  abrirCupom,
  setAbrirCupom,
  cupom,
  setCupom,
  aplicado,
  setAplicado,
  checando,
  erroCupom,
  aplicarCupom,
}) {
  return (
    <div>
      {!abrirCupom ? (
        <button
          type="button"
          onClick={() => setAbrirCupom(true)}
          className={`text-[13.5px] font-semibold underline underline-offset-4 ${escuro ? 'text-white/80 hover:text-white' : 'text-ink-muted hover:text-ink'}`}
        >
          Tenho um cupom
        </button>
      ) : aplicado ? (
        <div
          className={`flex items-center justify-between gap-3 rounded border px-4 py-3 text-[14px] ${escuro ? 'border-white/25 text-white' : 'border-line text-ink'}`}
        >
          <span>
            Cupom <strong className="font-semibold">{aplicado.cupom}</strong> aplicado:{' '}
            <span className="line-through opacity-60">{priceBRL(aplicado.de)}</span>{' '}
            <strong className="font-semibold">{priceBRL(aplicado.preco)}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setAplicado(null)
              setCupom('')
            }}
            className="shrink-0 text-[13px] font-semibold underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            Remover
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={`${id}-cupom`} className={rotuloCls}>
            Cupom de desconto
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-cupom`}
              name="cupom"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={cupom}
              onChange={(e) => setCupom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aplicarCupom(cupom)
                }
              }}
              placeholder="Digite o código"
              className={`${campoCls} uppercase`}
            />
            <button
              type="button"
              onClick={() => aplicarCupom(cupom)}
              disabled={checando || !cupom.trim()}
              className={`mt-2 shrink-0 rounded border px-4 py-3.5 text-[14px] font-semibold disabled:opacity-50 ${escuro ? 'border-white/40 text-white hover:bg-white/10' : 'border-ink text-ink hover:bg-mist'}`}
            >
              {checando ? 'Conferindo…' : 'Aplicar'}
            </button>
          </div>
          {erroCupom && (
            <p role="alert" className={`mt-2 text-[13px] font-medium ${escuro ? 'text-signal-lite' : 'text-signal-deep'}`}>
              {erroCupom}
            </p>
          )}
        </>
      )}
    </div>
  )
}
