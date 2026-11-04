'use client'

import { useState } from 'react'
import Icone from '../Icone'
import { moeda } from '../formato'
import { useApiSaques } from './apiSaques'
import Gaveta from './Gaveta'
import ResultadoSaque from './ResultadoSaque'
import { MOTIVO_MAX, MOTIVO_MIN } from './saquesUtil'

const MAXIMO = MOTIVO_MAX

// Recusar pede o motivo (obrigatório): ele vai no e-mail e aparece no painel
// do afiliado. Só depois de escrever o botão faz alguma coisa.
export default function RecusarSaque({ saque: s, aoFechar, aoMudou }) {
  const api = useApiSaques()
  const [motivo, setMotivo] = useState('')
  const [tocou, setTocou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)
  const curto = motivo.trim().length < MOTIVO_MIN

  async function recusar(e) {
    e.preventDefault()
    setTocou(true)
    if (curto) return
    setSalvando(true)
    setErro('')
    const r = await api.recusar(s.id, motivo.trim())
    setSalvando(false)
    if (r.status === 404) return setErro('Sua sessão acabou. Entre de novo para continuar.')
    if (!r.ok) return setErro(r.status === 0 ? 'Falha de conexão. Confira a internet e tente de novo.' : r.dados?.erro || 'Não consegui recusar agora. Tente de novo.')
    setFeito({ email: Boolean(r.dados?.email_enviado) })
    aoMudou()
  }

  return (
    <Gaveta
      travada={salvando}
      aoFechar={aoFechar}
      titulo={feito ? 'Pedido recusado' : 'Recusar pedido'}
      descricao={feito ? undefined : `${s.nome} pediu ${moeda(s.valor_centavos)}.`}
    >
      {feito ? (
        <ResultadoSaque titulo="Pedido recusado." enviado={feito.email} nome={s.nome} aoFechar={aoFechar} />
      ) : (
        <form onSubmit={recusar} noValidate className="px-4 py-5 sm:px-6">
          <label htmlFor="motivo-recusa" className="block text-[15px] font-semibold text-ink">
            Motivo da recusa
          </label>
          <p id="ajuda-motivo" className="mt-1 text-[14px] text-ink-muted">
            O afiliado lê este texto no e-mail e no painel dele. Explique o que ele precisa corrigir.
          </p>
          <textarea
            id="motivo-recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MAXIMO}
            rows={4}
            required
            aria-invalid={tocou && curto}
            aria-describedby={'ajuda-motivo' + (tocou && curto ? ' erro-motivo' : '')}
            className={
              'mt-3 w-full rounded border bg-white px-3 py-2.5 text-[15.5px] leading-[1.5] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none ' +
              (tocou && curto ? 'border-signal-deep' : 'border-line')
            }
            placeholder="Por exemplo: a chave Pix está em nome de outra pessoa."
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <p id="erro-motivo" role={tocou && curto ? 'alert' : undefined} className="text-[14px] text-signal-deep">
              {tocou && curto ? 'Escreva o motivo, com pelo menos 3 letras.' : ''}
            </p>
            <p className="figs shrink-0 text-[13px] text-ink-muted">
              {motivo.length}/{MAXIMO}
            </p>
          </div>
          {erro && (
            <p role="alert" className="mt-3 flex gap-2 text-[14.5px] leading-[1.5] text-signal-deep">
              <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0" />
              {erro}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={aoFechar} disabled={salvando} className="btn-quiet min-h-12">
              Voltar
            </button>
            <button type="submit" disabled={salvando} className="btn-signal min-h-12 disabled:opacity-60">
              {salvando ? 'Recusando…' : 'Recusar pedido'}
            </button>
          </div>
        </form>
      )}
    </Gaveta>
  )
}
