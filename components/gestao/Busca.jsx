'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog as DialogPrimitive } from 'radix-ui'
import Icone from './Icone'
import { SeloTeste } from './AcaoGestao'
import { useDetalhe } from './DetalheCliente'

// Busca de pessoa (plano 2.4): uma caixa só, que procura nome, e-mail ou
// celular em clientes, carrinhos e leads ao mesmo tempo. Espera 300 ms depois
// da última tecla e só consulta com 3 letras ou mais. Um cliente abre o Detalhe;
// um carrinho ou lead leva à tela dele com ?q=.
//
// No computador é a caixa da barra do topo (Ctrl K ou ⌘ K põe o cursor nela);
// no celular, a lupa abre a mesma busca em tela cheia.

const MINIMO = 3
const SITUACAO_CLIENTE = { ativo: 'Ativo', sem_senha: 'Sem senha', bloqueado: 'Bloqueado' }
const SITUACAO_CARRINHO = { aberto: 'Aberto', lembrado: 'Lembrado', pago: 'Pagou', ignorado: 'Ignorado' }

function useBusca(q) {
  const [r, setR] = useState({ estado: 'ocioso', dados: null })

  useEffect(() => {
    if (q.length < MINIMO) {
      setR({ estado: 'ocioso', dados: null })
      return undefined
    }
    setR((a) => ({ ...a, estado: 'carregando' }))
    const controle = new AbortController()
    const espera = setTimeout(async () => {
      try {
        const res = await fetch('/api/gestao/busca?q=' + encodeURIComponent(q), {
          signal: controle.signal,
          cache: 'no-store',
        })
        // Para quem perdeu o acesso, a rota "não existe": pede para entrar de novo.
        if (res.status === 404) return setR({ estado: 'sessao', dados: null })
        const dados = await res.json().catch(() => null)
        if (!res.ok || !dados?.ok) return setR({ estado: 'erro', dados: null })
        setR({ estado: 'ok', dados })
      } catch (e) {
        if (e.name !== 'AbortError') setR({ estado: 'erro', dados: null })
      }
    }, 300)
    return () => {
      clearTimeout(espera)
      controle.abort()
    }
  }, [q])

  return r
}

function Selo({ children, alerta = false }) {
  return (
    <span
      className={
        'shrink-0 rounded-sm border px-1.5 py-0.5 text-[11.5px] font-semibold ' +
        (alerta ? 'border-signal-deep text-signal-deep' : 'border-line text-ink-muted')
      }
    >
      {children}
    </span>
  )
}

function Opcao({ id, item, ativo, aoEscolher }) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={ativo}
      // Manter o foco na caixa: o clique não pode tirar o cursor dela antes de escolher.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => aoEscolher(item)}
      className="flex min-h-[52px] cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-150 aria-selected:bg-mist"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-ink">{item.nome || 'Sem nome'}</span>
        <span className="block truncate text-[13px] text-ink-muted">{item.email}</span>
      </span>
      {item.tipo === 'cliente' && item.teste && <SeloTeste />}
      {item.tipo === 'cliente' && (
        <Selo alerta={item.situacao === 'bloqueado'}>{SITUACAO_CLIENTE[item.situacao] || item.situacao}</Selo>
      )}
      {item.tipo === 'carrinho' && <Selo>{SITUACAO_CARRINHO[item.situacao] || item.situacao}</Selo>}
      {item.tipo === 'lead' && <Selo>{item.comprou ? 'Comprou' : 'Não comprou'}</Selo>}
    </li>
  )
}

function CaixaBusca({ flutuante, aoEscolher, entradaRef, atalho }) {
  const id = useId()
  const router = useRouter()
  const detalhe = useDetalhe()
  const [texto, setTexto] = useState('')
  const [foco, setFoco] = useState(!flutuante)
  const [ativo, setAtivo] = useState(0)
  const q = texto.trim()
  const { estado, dados } = useBusca(q)

  const grupos = useMemo(() => {
    if (!dados) return []
    const lista = [
      ['Clientes', dados.clientes.map((c) => ({ ...c, tipo: 'cliente' }))],
      ['Carrinhos', dados.carrinhos.map((c) => ({ ...c, tipo: 'carrinho' }))],
      ['Leads', dados.leads.map((l) => ({ ...l, tipo: 'lead' }))],
    ]
    let inicio = 0
    return lista
      .filter(([, itens]) => itens.length)
      .map(([titulo, itens]) => {
        const g = { titulo, itens, inicio }
        inicio += itens.length
        return g
      })
  }, [dados])
  const itens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos])

  useEffect(() => setAtivo(0), [dados])

  const escolher = (item) => {
    setTexto('')
    setFoco(false)
    entradaRef.current?.blur()
    aoEscolher?.()
    if (item.tipo === 'cliente') {
      // Depois de fechar a busca (no celular ela é uma janela), para as duas não disputarem o foco.
      setTimeout(() => detalhe.abrir(item.id), 0)
    } else {
      router.push((item.tipo === 'carrinho' ? '/gestao/recuperacao' : '/gestao/leads') + '?q=' + encodeURIComponent(item.email))
    }
  }

  const teclas = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!itens.length) return
      e.preventDefault()
      const passo = e.key === 'ArrowDown' ? 1 : -1
      setAtivo((a) => (a + passo + itens.length) % itens.length)
    } else if (e.key === 'Enter') {
      if (itens[ativo]) {
        e.preventDefault()
        escolher(itens[ativo])
      }
    } else if (e.key === 'Escape' && flutuante) {
      if (texto) setTexto('')
      else entradaRef.current?.blur()
    }
  }

  const painel = !flutuante || (foco && q.length > 0)
  const mostraLista = estado === 'ok' || (estado === 'carregando' && dados)
  let aviso = ''
  if (q.length < MINIMO) aviso = 'Digite pelo menos 3 letras do nome, do e-mail ou do celular.'
  else if (estado === 'erro') aviso = 'Não consegui buscar agora. Confira a internet e tente de novo.'
  else if (estado === 'sessao') aviso = 'Sua sessão acabou. Entre de novo para continuar.'
  else if (!mostraLista) aviso = 'Buscando…'
  else if (itens.length === 0) aviso = 'Ninguém encontrado com “' + q + '”.'

  const resumo =
    q.length >= MINIMO && estado === 'ok'
      ? itens.length === 0
        ? 'Nenhum resultado.'
        : itens.length + (itens.length === 1 ? ' resultado.' : ' resultados.')
      : ''

  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={(e) => {
        if (flutuante && !e.currentTarget.contains(e.relatedTarget)) setFoco(false)
      }}
    >
      <Icone nome="lupa" tamanho={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        ref={entradaRef}
        type="search"
        role="combobox"
        aria-expanded={painel && itens.length > 0}
        aria-controls={id + '-lista'}
        aria-activedescendant={painel && itens.length > 0 ? id + '-' + ativo : undefined}
        aria-autocomplete="list"
        aria-label="Buscar pessoa por nome, e-mail ou celular"
        aria-keyshortcuts={flutuante ? 'Control+K Meta+K' : undefined}
        autoComplete="off"
        maxLength={80}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => setFoco(true)}
        onKeyDown={teclas}
        placeholder={flutuante ? 'Buscar nome, e-mail ou celular' : 'Nome, e-mail ou celular'}
        className={
          flutuante
            ? 'h-10 w-full rounded border border-transparent bg-paper pl-10 pr-3 text-[14px] text-ink placeholder:text-ink-muted focus:border-ink focus:bg-white focus:outline-none lg:pr-16'
            : 'h-11 w-full rounded border border-line bg-paper pl-10 pr-3 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'
        }
      />
      {flutuante && (
        <kbd
          className={
            'pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-sm border border-line bg-white px-1.5 py-0.5 font-sans text-[12px] text-ink-muted lg:block ' +
            (texto ? 'lg:hidden' : '')
          }
        >
          {atalho}
        </kbd>
      )}
      <p className="sr-only" aria-live="polite">
        {resumo}
      </p>

      {painel && (
        <div
          className={
            flutuante
              ? 'absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[70vh] overflow-y-auto rounded-md border border-line bg-white'
              : 'fixed inset-x-0 bottom-0 top-14 overflow-y-auto'
          }
        >
          {aviso && (
            <p className="px-4 py-3 text-[14px] text-ink-muted">
              {aviso}
              {estado === 'sessao' && (
                <>
                  {' '}
                  <a href="/entrar" className="font-semibold text-ink underline">
                    Entrar
                  </a>
                </>
              )}
            </p>
          )}
          {mostraLista && itens.length > 0 && (
            <ul id={id + '-lista'} role="listbox" aria-label="Resultados da busca" className="py-1">
              {grupos.map((g) => (
                <li key={g.titulo} role="presentation">
                  <p className="px-3 pb-1 pt-3 text-[12.5px] font-semibold text-ink-muted">{g.titulo}</p>
                  <ul role="presentation">
                    {g.itens.map((item, i) => (
                      <Opcao
                        key={item.tipo + (item.id ?? item.email)}
                        id={id + '-' + (g.inicio + i)}
                        item={item}
                        ativo={g.inicio + i === ativo}
                        aoEscolher={escolher}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Caixa do topo (computador e tablet).
export default function Busca() {
  const entrada = useRef(null)
  const [atalho, setAtalho] = useState('Ctrl K')

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || '')) setAtalho('⌘ K')
    const tecla = (e) => {
      // Escondida (celular): o atalho fica com o navegador, ou com a lupa.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && entrada.current?.offsetParent) {
        e.preventDefault()
        entrada.current.focus()
        entrada.current.select()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  return (
    <div className="mx-auto flex min-w-0 max-w-[440px] flex-1">
      <CaixaBusca flutuante entradaRef={entrada} atalho={atalho} />
    </div>
  )
}

// Lupa da barra de 56 px do celular: abre a busca em tela cheia.
export function BuscaCelular() {
  const [aberta, setAberta] = useState(false)
  const entrada = useRef(null)
  const lupa = useRef(null)

  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && lupa.current?.offsetParent) {
        e.preventDefault()
        setAberta(true)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={setAberta}>
      <DialogPrimitive.Trigger asChild>
        <button
          ref={lupa}
          type="button"
          aria-label="Buscar pessoa"
          className="grid h-11 w-11 place-items-center rounded text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <Icone nome="lupa" tamanho={20} />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            entrada.current?.focus()
          }}
          className="fixed inset-0 z-50 bg-paper md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Buscar pessoa</DialogPrimitive.Title>
          <div className="flex h-14 items-center gap-2 border-b border-line bg-white px-2">
            <CaixaBusca entradaRef={entrada} aoEscolher={() => setAberta(false)} />
            <DialogPrimitive.Close className="h-11 shrink-0 rounded px-3 text-[14.5px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
              Cancelar
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
