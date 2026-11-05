'use client'

import { useState } from 'react'
import { moeda } from '../../formato'
import Gaveta from '../Gaveta'
import { erroDaAcao, useApiAfiliados } from '../apiAfiliados'
import { mesPorExtenso, nomeDoMesMinusculo } from '../afiliadosUtil'

// Confirma e roda o fechamento de um mês (POST /fechamento, só Master). Rodar
// de novo o mesmo mês não duplica nada; se o servidor não deu conta de todos os
// afiliados de uma vez (`restam`), a gaveta pede para rodar outra vez.

export default function RodarFechamento({ mes, aoFechar, aoMudou }) {
  const api = useApiAfiliados()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)
  const nome = nomeDoMesMinusculo(mes)

  async function rodar() {
    setSalvando(true)
    setErro('')
    const r = await api.fechar(mes)
    setSalvando(false)
    if (!r.ok) return setErro(erroDaAcao(r))
    setFeito(r.dados)
    aoMudou()
  }

  const rel = feito?.relatorio
  const faltam = (feito?.pendentes?.length || 0) + (feito?.restam ? 1 : 0)
  return (
    <Gaveta travada={salvando} aoFechar={aoFechar} titulo={feito ? 'Fechamento rodado' : `Rodar fechamento de ${nome}`} descricao={feito ? undefined : mesPorExtenso(mes)}>
      <div className="px-4 py-5 sm:px-6">
        {feito ? (
          <div role="status" className="space-y-3 text-[15px] leading-[1.55] text-ink">
            <p className="font-semibold">
              {feito.fechados === 1 ? 'Fechei 1 afiliado' : `Fechei ${feito.fechados} afiliados`} de {nome}.
            </p>
            {faltam > 0 && (
              <p className="border-l-2 border-signal pl-3">
                {feito.pendentes?.length
                  ? `${feito.pendentes.length} afiliado(s) não fecharam desta vez.`
                  : 'Ainda restam afiliados para fechar.'}{' '}
                Rode o fechamento de novo para terminar; o que já foi fechado não duplica.
              </p>
            )}
            {rel && faltam === 0 && (
              <p>
                Total do mês: <strong className="figs">{moeda(rel.total_mes_centavos)}</strong>, sendo {moeda(rel.total_base_centavos)} de comissão base e {moeda(rel.total_bonus_centavos)} de bônus.
              </p>
            )}
            <p className="text-[14px] text-ink-muted">Os e-mails de resumo para os afiliados saem na próxima rodada do robô, em até 10 minutos.</p>
            <button type="button" onClick={aoFechar} className="btn-ink mt-3 min-h-11 w-full !py-3 sm:w-auto sm:!px-8">
              Fechar
            </button>
          </div>
        ) : (
          <>
            <p className="text-[15px] leading-[1.55] text-ink">
              Vai calcular o nível de cada afiliado em {mesPorExtenso(mes)}, lançar o bônus de nível no saldo de cada um e guardar o resultado. Rodar duas vezes o mesmo mês não duplica nada.
            </p>
            {erro && (
              <p role="alert" className="mt-4 border-l-2 border-signal pl-3 text-[14.5px] font-semibold text-signal-deep">
                {erro}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button type="button" onClick={aoFechar} disabled={salvando} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={rodar} disabled={salvando} className="btn-ink min-h-11 !px-6 !py-2.5 !text-[14.5px] disabled:opacity-60">
                {salvando ? 'Rodando…' : `Rodar fechamento de ${nome}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Gaveta>
  )
}
