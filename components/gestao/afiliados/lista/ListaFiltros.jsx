'use client'

import { useEffect, useState } from 'react'
import { rotuloMes, mesesParaFiltro } from '@/lib/afiliados-painel'
import Icone from '../../Icone'
import { hojeBrasilia } from '../../formato'
import { FILTROS_VAZIOS, ORDENS, STATUS, dirPadrao, filtrosAtivos } from '../afiliadosUtil'
import { classeAba } from '../SubAbas'

// Busca, abas de status com contagem e os demais filtros. No celular os filtros
// ficam atrás do botão "Filtros" (com a quantidade ligada); de 768 px em diante
// ficam sempre à vista.

const SELECT =
  'block min-h-11 w-full rounded border border-line bg-white px-3 py-2 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink'

function Seletor({ id, rotulo, valor, aoMudar, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-ink-muted">
        {rotulo}
      </label>
      <select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)} className={SELECT + ' mt-1'}>
        {children}
      </select>
    </div>
  )
}

function Liga({ id, rotulo, ligado, aoMudar }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded border border-line bg-white px-3 text-[14.5px] text-ink has-[:checked]:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
      <input id={id} type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} className="h-[18px] w-[18px] shrink-0 accent-ink" />
      {rotulo}
    </label>
  )
}

// A busca espera a pessoa parar de digitar antes de chamar o servidor.
function Busca({ valor, aoMudar }) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  useEffect(() => {
    if (texto === valor) return undefined
    const t = setTimeout(() => aoMudar(texto), 350)
    return () => clearTimeout(t)
  }, [texto, valor, aoMudar])
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="busca-afiliado" className="sr-only">
        Buscar por nome, código ou e-mail
      </label>
      <Icone nome="lupa" tamanho={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        id="busca-afiliado"
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nome, código ou e-mail"
        autoComplete="off"
        className="block min-h-11 w-full rounded border border-line bg-white py-2 pl-10 pr-3 text-[15.5px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      />
    </div>
  )
}

export default function ListaFiltros({ filtros: f, aoMudar, dados }) {
  const [aberto, setAberto] = useState(false)
  const ativos = filtrosAtivos(f)
  const cont = dados?.contagem_status
  const todos = cont ? cont.pendente + cont.ativo + cont.suspenso : null
  const meses = mesesParaFiltro(hojeBrasilia().slice(0, 7), 12)
  const abas = [
    { id: '', rotulo: 'Todos', n: todos },
    ...['pendente', 'ativo', 'suspenso'].map((s) => ({ id: s, rotulo: STATUS[s] + 's', n: cont?.[s] })),
  ]
  const limpar = () => aoMudar({ ...FILTROS_VAZIOS, q: f.q, status: f.status, mes: f.mes, ordem: f.ordem, dir: f.dir })

  return (
    <div>
      <div className="flex gap-2">
        <Busca valor={f.q} aoMudar={(q) => aoMudar({ q })} />
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls="filtros-afiliados"
          onClick={() => setAberto((a) => !a)}
          className="btn-quiet min-h-11 shrink-0 gap-2 !px-4 !py-2.5 !text-[14.5px] md:hidden"
        >
          Filtros
          {ativos > 0 && <span className="figs grid h-[20px] min-w-[20px] place-items-center rounded-sm bg-ink px-1 text-[12px] font-bold leading-none text-white">{ativos}</span>}
        </button>
      </div>

      <div role="tablist" aria-label="Status do afiliado" className="-mx-4 mt-3 flex overflow-x-auto border-b border-line px-1 md:mx-0 md:px-0">
        {abas.map((a) => (
          <button key={a.id || 'todos'} type="button" role="tab" aria-selected={f.status === a.id} onClick={() => aoMudar({ status: a.id })} className={classeAba(f.status === a.id)}>
            {a.rotulo}
            {a.n != null && <span className="figs ml-1.5 text-[13px] font-normal text-ink-muted">{a.n}</span>}
          </button>
        ))}
      </div>

      <div id="filtros-afiliados" className={(aberto ? 'block' : 'hidden') + ' mt-4 md:block'}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Seletor id="f-nivel" rotulo="Nível do mês" valor={f.nivel} aoMudar={(nivel) => aoMudar({ nivel })}>
            <option value="">Todos</option>
            {(dados?.niveis || []).map((n) => (
              <option key={n.id} value={String(n.id)}>
                {n.nome}
              </option>
            ))}
            <option value="sem">Sem nível</option>
          </Seletor>
          <Seletor id="f-vendeu" rotulo="Vendeu no mês" valor={f.vendeu} aoMudar={(vendeu) => aoMudar({ vendeu })}>
            <option value="">Tanto faz</option>
            <option value="sim">Vendeu</option>
            <option value="nao">Não vendeu</option>
          </Seletor>
          <Seletor id="f-mes" rotulo="Mês" valor={f.mes} aoMudar={(mes) => aoMudar({ mes })}>
            <option value="">Este mês</option>
            {meses.slice(1).map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </Seletor>
          <Seletor id="f-ordem" rotulo="Ordenar por" valor={f.ordem || 'vendas'} aoMudar={(ordem) => aoMudar({ ordem, dir: '' })}>
            {ORDENS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </Seletor>
          <Seletor id="f-dir" rotulo="Sentido" valor={f.dir || dirPadrao(f.ordem || 'vendas')} aoMudar={(dir) => aoMudar({ dir })}>
            <option value="desc">Maior primeiro</option>
            <option value="asc">Menor primeiro</option>
          </Seletor>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Liga id="f-saldo" rotulo="Com saldo para sacar" ligado={f.saldo} aoMudar={(saldo) => aoMudar({ saldo })} />
          <Liga id="f-saque" rotulo="Saque pendente" ligado={f.saque} aoMudar={(saque) => aoMudar({ saque })} />
          <Liga id="f-perto" rotulo="Perto de subir de nível" ligado={f.perto} aoMudar={(perto) => aoMudar({ perto })} />
        </div>
        {ativos > 0 && (
          <button type="button" onClick={limpar} className="link-signal mt-2 min-h-11 !text-[14.5px]">
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
