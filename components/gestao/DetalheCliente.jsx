'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { formatarCelular } from '@/lib/gestao/csv'
import { SeloTeste } from './AcaoGestao'
import { Carrinho, Compras, Downloads, Historico, Lead, Secao, Selo, dia } from './DetalheSecoes'
import Icone from './Icone'
import MenuAcoes, { PainelAcao } from './MenuAcoes'
import { Aviso } from './Estados'
import { dataHora } from './formato'
import { useGestao } from './useGestao'

// O Detalhe do cliente (plano 2.6): uma gaveta pela direita, com 480 px no
// computador e tela cheia no celular. Abre pela busca, pelas "Últimas vendas"
// do Painel e por um clique na linha de Clientes. A Casca põe o provedor uma
// vez só; quem quer abrir chama `useDetalhe().abrir(id, aoMudar)`. `aoMudar`
// (opcional) roda depois de uma ação, para a lista de trás se atualizar.
const Contexto = createContext({ abrir: () => {} })
export const useDetalhe = () => useContext(Contexto)

export function DetalheProvider({ children }) {
  const [alvo, setAlvo] = useState(null)
  const [aberto, setAberto] = useState(false)
  const abrir = useCallback((id, aoMudar) => {
    setAlvo({ id, aoMudar })
    setAberto(true)
  }, [])
  const valor = useMemo(() => ({ abrir }), [abrir])
  return (
    <Contexto.Provider value={valor}>
      {children}
      <DetalheCliente alvo={alvo} aberto={aberto} aoMudarAberto={setAberto} />
    </Contexto.Provider>
  )
}

function Esqueleto() {
  return (
    <div aria-hidden="true" className="space-y-3 px-4 py-5 sm:px-5">
      <div className="h-6 w-2/3 rounded-sm bg-mist" />
      <div className="h-4 w-1/2 rounded-sm bg-mist/70" />
      <div className="h-4 w-2/5 rounded-sm bg-mist/70" />
      <div className="mt-6 h-28 rounded bg-mist/50" />
      <div className="h-28 rounded bg-mist/50" />
    </div>
  )
}

function CopiarEmail({ email }) {
  const [copiado, setCopiado] = useState(false)
  const relogio = useRef(null)
  useEffect(() => () => clearTimeout(relogio.current), [])
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiado(true)
      clearTimeout(relogio.current)
      relogio.current = setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* sem permissão da área de transferência: o e-mail está na tela para copiar à mão */
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      aria-label="Copiar e-mail"
      className="flex h-11 shrink-0 items-center gap-1.5 rounded px-2.5 text-[13px] font-semibold text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <Icone nome={copiado ? 'confere' : 'copiar'} tamanho={18} />
      <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar'}</span>
    </button>
  )
}

// Um componente por cliente (a gaveta o monta com `key`): sai um e entra outro
// sem sobrar a ficha do anterior na tela.
function Ficha({ id, aoMudar, topo }) {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro } = useGestao('/api/gestao/clientes/detalhe?id=' + id, tentativa)
  const [acao, setAcao] = useState(null)
  const [aviso, setAviso] = useState('')

  const recarregar = () => {
    setTentativa((n) => n + 1)
    aoMudar?.()
  }
  const c = dados?.cliente
  const escolher = (a) => {
    setAviso('')
    setAcao(a)
  }

  return (
    <>
      {topo(c ? <MenuAcoes cliente={c} onEscolher={escolher} /> : null)}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {erro ? (
          <div className="px-4 pb-5 sm:px-5">
            <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
          </div>
        ) : !c ? (
          <Esqueleto />
        ) : (
          <>
            <div className="px-4 pb-5 pt-5 sm:px-5">
              <h3 className="break-words text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink">
                {c.nome || 'Sem nome'}
              </h3>
              {(c.teste || c.bloqueado || !c.tem_senha) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.teste && <SeloTeste />}
                  {c.bloqueado && <Selo alerta>Bloqueado</Selo>}
                  {!c.tem_senha && <Selo>Sem senha</Selo>}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="min-w-0 break-all text-[14.5px] text-ink">{c.email}</p>
                <CopiarEmail email={c.email} />
              </div>
              {c.telefone && (
                <a
                  href={'https://wa.me/55' + c.telefone}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={'Abrir conversa no WhatsApp com ' + formatarCelular(c.telefone)}
                  className="figs inline-flex min-h-[44px] items-center text-[14.5px] text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                >
                  {formatarCelular(c.telefone)}
                </a>
              )}
              <p className="figs mt-1 text-[13.5px] text-ink-muted">
                Cliente desde {dia(c.criado_em)}. Último acesso: {c.ultimo_acesso ? dataHora(c.ultimo_acesso) : 'nunca entrou'}.
              </p>
            </div>

            {(aviso || acao) && (
              <div className="px-4 pb-5 sm:px-5" aria-live="polite">
                {aviso && !acao && (
                  <p role="status" className="rounded border border-line bg-paper/60 px-3 py-2.5 text-[14px] text-ink">
                    {aviso}
                  </p>
                )}
                {acao && (
                  <PainelAcao
                    key={acao}
                    acao={acao}
                    c={c}
                    aoFechar={() => setAcao(null)}
                    aoFeito={(texto, recarrega) => {
                      setAviso(texto)
                      if (recarrega) recarregar()
                    }}
                    aoCorrigir={recarregar}
                  />
                )}
              </div>
            )}

            <Secao titulo={'Compras (' + dados.compras.length + ')'}>
              <Compras compras={dados.compras} />
            </Secao>
            <Secao titulo="Downloads">
              <Downloads d={dados.downloads} />
            </Secao>
            {dados.carrinho && (
              <Secao titulo="Carrinho e recuperação">
                <Carrinho k={dados.carrinho} />
              </Secao>
            )}
            {dados.lead && (
              <Secao titulo="VS grátis">
                <Lead l={dados.lead} />
              </Secao>
            )}
            <Secao titulo="Histórico">
              <Historico itens={dados.historico} />
            </Secao>
          </>
        )}
      </div>
    </>
  )
}

function DetalheCliente({ alvo, aberto, aoMudarAberto }) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={aoMudarAberto}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white font-sans text-ink duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right motion-reduce:animate-none md:w-[480px] md:border-l md:border-line"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {alvo && (
            <Ficha
              key={alvo.id}
              id={alvo.id}
              aoMudar={alvo.aoMudar}
              topo={(menu) => (
                <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line pl-4 pr-2 sm:pl-5">
                  <DialogPrimitive.Title className="text-[16px] font-bold tracking-[-0.01em] text-ink">
                    Cliente
                  </DialogPrimitive.Title>
                  <div className="flex items-center gap-1">
                    {menu}
                    <DialogPrimitive.Close
                      aria-label="Fechar"
                      className="grid h-11 w-11 place-items-center rounded text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    >
                      <Icone nome="x" tamanho={22} />
                    </DialogPrimitive.Close>
                  </div>
                </div>
              )}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
