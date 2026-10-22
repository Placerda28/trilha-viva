'use client'

import { Suspense, useEffect, useState } from 'react'
import { Dialog as DialogPrimitive, DropdownMenu } from 'radix-ui'
import Icone from './Icone'
import { ATALHOS, intervaloDoAtalho } from './formato'
import { erroDoPeriodo, usePeriodo } from './usePeriodo'

// O seletor de período da gestão (plano 2.5): cinco atalhos e "Escolher datas".
// Quem manda no período é a URL (usePeriodo); este controle só a muda. No
// computador mora na barra do topo; no celular, numa linha logo abaixo do
// título (`cheio`).

const ITEM_MENU =
  'flex h-11 cursor-default select-none items-center gap-2 rounded-sm px-3 text-[14px] text-ink outline-none data-[highlighted]:bg-mist md:h-10 '
const CONTEUDO_MENU = 'z-[60] min-w-[200px] rounded-md border border-line bg-white p-1'
const CAMPO =
  'mt-1 h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-ink focus:border-ink focus:outline-none'

function EscolherDatas({ aberto, aoMudar, de, ate, aoAplicar }) {
  const [rascunhoDe, setDe] = useState(de)
  const [rascunhoAte, setAte] = useState(ate)
  const [mostrarErro, setMostrarErro] = useState(false)

  // Cada abertura começa do período que está valendo.
  useEffect(() => {
    if (aberto) {
      setDe(de)
      setAte(ate)
      setMostrarErro(false)
    }
  }, [aberto, de, ate])

  const erro = erroDoPeriodo(rascunhoDe, rascunhoAte)
  const aplicar = (e) => {
    e.preventDefault()
    if (erro) return setMostrarErro(true)
    aoAplicar({ de: rascunhoDe, ate: rascunhoAte })
    aoMudar(false)
  }

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={aoMudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-white p-5 duration-150 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="text-[17px] font-bold tracking-[-0.01em] text-ink">
            Escolher datas
          </DialogPrimitive.Title>
          <form onSubmit={aplicar} className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] text-ink-muted">De</span>
                <input
                  type="date"
                  value={rascunhoDe}
                  max={rascunhoAte || undefined}
                  onChange={(e) => setDe(e.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="block">
                <span className="text-[13px] text-ink-muted">Até</span>
                <input
                  type="date"
                  value={rascunhoAte}
                  min={rascunhoDe || undefined}
                  onChange={(e) => setAte(e.target.value)}
                  className={CAMPO}
                />
              </label>
            </div>
            <p role="alert" className="mt-3 min-h-[20px] text-[13.5px] text-signal-deep">
              {mostrarErro ? erro : ''}
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <DialogPrimitive.Close className="btn-quiet h-11 !px-4 !py-0 !text-[14px]">Cancelar</DialogPrimitive.Close>
              <button type="submit" className="btn-ink h-11 !px-5 !py-0 !text-[14px]">
                Aplicar
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Seletor({ cheio }) {
  const p = usePeriodo()
  const [datas, setDatas] = useState(false)

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={
              'flex items-center gap-2 rounded border border-line bg-white px-3 text-[14px] font-semibold text-ink transition-colors duration-150 hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ' +
              (cheio ? 'h-11 w-full justify-between' : 'h-10')
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icone nome="calendario" tamanho={18} className="shrink-0 text-ink-muted" />
              <span className="shrink-0">{p.rotulo}</span>
              {p.intervalo && (
                <span className={'figs truncate font-normal text-ink-muted ' + (cheio ? '' : 'hidden xl:inline')}>
                  {p.intervalo}
                </span>
              )}
            </span>
            <Icone nome="baixo" tamanho={16} className="shrink-0 text-ink-muted" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className={CONTEUDO_MENU}>
            {ATALHOS.map((a) => (
              <DropdownMenu.Item
                key={a.id}
                onSelect={() => p.mudar(intervaloDoAtalho(a.id))}
                className={ITEM_MENU}
              >
                <span className="w-4">{a.id === p.atalho && <Icone nome="confere" tamanho={16} />}</span>
                {a.rotulo}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item onSelect={() => setDatas(true)} className={ITEM_MENU}>
              <span className="w-4">{!p.atalho && p.valido && <Icone nome="confere" tamanho={16} />}</span>
              Escolher datas
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <EscolherDatas aberto={datas} aoMudar={setDatas} de={p.de} ate={p.ate} aoAplicar={p.mudar} />
    </>
  )
}

// useSearchParams precisa de Suspense; o contorno fica aqui para quem usa o
// seletor (barra do topo, cabeçalho da página) não ter que lembrar.
export default function PeriodoGlobal({ cheio = false }) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className={'rounded border border-line bg-white ' + (cheio ? 'h-11 w-full' : 'h-10 w-[130px]')}
        />
      }
    >
      <Seletor cheio={cheio} />
    </Suspense>
  )
}
