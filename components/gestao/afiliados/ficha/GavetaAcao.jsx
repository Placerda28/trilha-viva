'use client'

import { useState } from 'react'
import Gaveta from '../Gaveta'
import { erroDaAcao, useApiAfiliados } from '../apiAfiliados'

// A gaveta de uma ação da ficha: campos, botão, erro do servidor e a tela de
// "feito". Quem usa passa `corpo` (os campos da ação, ou null enquanto o
// formulário não está válido) e `children` como função que recebe `tocou`:
// os erros de campo só aparecem depois da primeira tentativa de enviar.
// `resultado(dados)` desenha o que o servidor respondeu.
export default function GavetaAcao({
  id,
  acao,
  titulo,
  tituloFeito,
  descricao,
  rotulo,
  perigo = false,
  corpo,
  aoFechar,
  aoMudou,
  resultado,
  children,
}) {
  const api = useApiAfiliados()
  const [tocou, setTocou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null)

  async function enviar(e) {
    e.preventDefault()
    setTocou(true)
    if (!corpo) return
    setSalvando(true)
    setErro('')
    const r = await api.acao(id, acao, corpo)
    setSalvando(false)
    if (!r.ok) return setErro(erroDaAcao(r))
    setFeito(r.dados)
    aoMudou()
  }

  return (
    <Gaveta travada={salvando} aoFechar={aoFechar} titulo={feito ? tituloFeito : titulo} descricao={feito ? undefined : descricao}>
      {feito ? (
        <div className="px-4 py-5 sm:px-6">
          <div role="status">{resultado(feito)}</div>
          <button type="button" onClick={aoFechar} className="btn-ink mt-6 min-h-11 w-full !py-3 !text-[15px] sm:w-auto sm:!px-8">
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="px-4 py-5 sm:px-6">
          <div className="space-y-5">{children(tocou)}</div>
          {erro && (
            <p role="alert" className="mt-5 border-l-2 border-signal bg-white py-1 pl-3 text-[14.5px] font-semibold text-signal-deep">
              {erro}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <button type="button" onClick={aoFechar} disabled={salvando} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className={(perigo ? 'btn-signal' : 'btn-ink') + ' min-h-11 !px-6 !py-2.5 !text-[14.5px] disabled:opacity-60'}>
              {salvando ? 'Enviando…' : rotulo}
            </button>
          </div>
        </form>
      )}
    </Gaveta>
  )
}
