'use client'

import { useState } from 'react'
import Gaveta from '../Gaveta'
import { erroDaAcao, useApiAfiliados } from '../apiAfiliados'
import { NIVEIS_MAX, centavosParaCampo, mesPorExtenso, mesSeguinte, validarNiveis } from '../afiliadosUtil'
import { Campo, classeCampo } from '../lista/Pecas'

// Editor da tabela de níveis (só o Master). Começa da tabela mais nova que já
// existe (a futura, se houver, senão a de hoje). A mudança vale a partir do
// mês seguinte; o servidor recusa o que estiver fora das regras, e a tela só
// avisa antes para poupar a ida e volta.

const linhaDe = (n) => ({ nome: n.nome, vendas: String(n.vendas_minimas), valor: centavosParaCampo(n.valor_por_venda_centavos), cor: n.cor || '' })
const NOVA = { nome: '', vendas: '', valor: '', cor: '' }

function Linha({ i, l, erro, tocou, aoMudar, aoRemover, unica }) {
  const e = tocou ? erro : {}
  const campo = (k) => (v) => aoMudar(i, { [k]: v })
  return (
    <li className="card-line px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15.5px] font-bold text-ink">{l.nome.trim() || `Nível ${i + 1}`}</h3>
        <button type="button" onClick={() => aoRemover(i)} disabled={unica} className="btn-quiet min-h-11 !px-4 !py-2 !text-[14px] disabled:opacity-40">
          Remover<span className="sr-only"> {l.nome || `nível ${i + 1}`}</span>
        </button>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Campo id={`n${i}-nome`} rotulo="Nome" erro={e.nome}>
          <input id={`n${i}-nome`} value={l.nome} maxLength={30} onChange={(ev) => campo('nome')(ev.target.value)} aria-invalid={Boolean(e.nome)} className={classeCampo(e.nome)} />
        </Campo>
        <Campo id={`n${i}-vendas`} rotulo="Vendas mínimas no mês" erro={e.vendas}>
          <input id={`n${i}-vendas`} inputMode="numeric" value={l.vendas} onChange={(ev) => campo('vendas')(ev.target.value)} aria-invalid={Boolean(e.vendas)} className={classeCampo(e.vendas) + ' figs'} />
        </Campo>
        <Campo id={`n${i}-valor`} rotulo="Valor por venda (R$)" erro={e.valor}>
          <input id={`n${i}-valor`} inputMode="decimal" placeholder="0,00" value={l.valor} onChange={(ev) => campo('valor')(ev.target.value)} aria-invalid={Boolean(e.valor)} className={classeCampo(e.valor) + ' figs'} />
        </Campo>
        <Campo id={`n${i}-cor`} rotulo="Cor do selo" ajuda="Opcional. Ex.: #B45309" erro={e.cor}>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label={`Escolher a cor de ${l.nome || `nível ${i + 1}`}`}
              value={/^#[0-9a-fA-F]{6}$/.test(l.cor) ? l.cor : '#8a8a8a'}
              onChange={(ev) => campo('cor')(ev.target.value)}
              className="h-11 w-12 shrink-0 cursor-pointer rounded border border-line bg-white p-1"
            />
            <input id={`n${i}-cor`} value={l.cor} maxLength={7} onChange={(ev) => campo('cor')(ev.target.value)} aria-invalid={Boolean(e.cor)} className={classeCampo(e.cor) + ' figs'} />
          </div>
        </Campo>
      </div>
    </li>
  )
}

export default function EditorNiveis({ base, mesAtual, aoFechar, aoMudou }) {
  const api = useApiAfiliados()
  const [linhas, setLinhas] = useState(() => [...base].sort((a, b) => a.vendas_minimas - b.vendas_minimas).map(linhaDe))
  const [tocou, setTocou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)
  const { erros, geral, niveis } = validarNiveis(linhas)
  const vale = mesPorExtenso(mesSeguinte(mesAtual))

  const mudar = (i, parte) => setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...parte } : l)))
  const remover = (i) => setLinhas((ls) => ls.filter((_, k) => k !== i))
  const adicionar = () => setLinhas((ls) => [...ls, NOVA])

  async function salvar(e) {
    e.preventDefault()
    setTocou(true)
    if (!niveis) return
    setSalvando(true)
    setErro('')
    const r = await api.salvarMetas(niveis)
    setSalvando(false)
    if (!r.ok) return setErro(erroDaAcao(r))
    setFeito(r.dados)
    aoMudou()
  }

  return (
    <Gaveta lateral travada={salvando} aoFechar={aoFechar} titulo={feito ? 'Tabela salva' : 'Editar tabela de níveis'} descricao={feito ? undefined : `Vale a partir de ${vale}.`}>
      {feito ? (
        <div className="px-4 py-5 sm:px-6">
          <div role="status" className="space-y-3 text-[15px] leading-[1.55] text-ink">
            <p className="font-semibold">A nova tabela vale a partir de {mesPorExtenso(feito.valido_desde_mes)}.</p>
            {feito.aviso && <p className="border-l-2 border-signal pl-3">{feito.aviso}</p>}
          </div>
          <button type="button" onClick={aoFechar} className="btn-ink mt-6 min-h-11 w-full !py-3 sm:w-auto sm:!px-8">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={salvar} noValidate className="px-4 py-5 sm:px-6">
          <p className="text-[14.5px] leading-[1.55] text-ink-muted">
            O mês em andamento e os meses já fechados não mudam. Salvar de novo no mesmo mês troca a tabela futura que estava gravada. Cada nível pede mais vendas e paga mais que o de cima.
          </p>
          <ol className="mt-4 space-y-3">
            {linhas.map((l, i) => (
              <Linha key={i} i={i} l={l} erro={erros[i]} tocou={tocou} aoMudar={mudar} aoRemover={remover} unica={linhas.length === 1} />
            ))}
          </ol>
          {tocou && geral && (
            <p role="alert" className="mt-3 text-[14px] font-semibold text-signal-deep">
              {geral}
            </p>
          )}
          <button type="button" onClick={adicionar} disabled={linhas.length >= NIVEIS_MAX} className="btn-quiet mt-3 min-h-11 !px-4 !py-2.5 !text-[14.5px] disabled:opacity-40">
            Adicionar nível
          </button>
          {erro && (
            <p role="alert" className="mt-5 border-l-2 border-signal pl-3 text-[14.5px] font-semibold text-signal-deep">
              {erro}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <button type="button" onClick={aoFechar} disabled={salvando} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="btn-ink min-h-11 !px-6 !py-2.5 !text-[14.5px] disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar tabela'}
            </button>
          </div>
        </form>
      )}
    </Gaveta>
  )
}
