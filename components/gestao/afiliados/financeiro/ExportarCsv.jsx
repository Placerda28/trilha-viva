'use client'

import { useState } from 'react'
import Icone from '../../Icone'
import Confirmar from '../Confirmar'

// Os três relatórios para a contabilidade. A planilha só vale para o período
// escolhido e o servidor recusa mais de 5.000 linhas (nunca entrega arquivo
// cortado); por isso o arquivo é pedido com fetch, e o erro aparece aqui em
// vez de um arquivo de erro baixado. O de saques pagos tem CPF e chave Pix de
// quem recebeu: confirma antes e o servidor registra cada exportação.

const RELATORIOS = [
  { id: 'comissoes', rotulo: 'Comissões', texto: 'Cada lançamento do período: vendas, bônus, ajustes e estornos.' },
  { id: 'saques_pagos', rotulo: 'Saques pagos', texto: 'Quem recebeu, com CPF e chave Pix.', sensivel: true },
  { id: 'resumo_mensal', rotulo: 'Resumo mensal', texto: 'Receita, taxas, comissões e lucro mês a mês.' },
]

const FALHA = 'Não consegui gerar a planilha agora. Confira a internet e tente de novo.'

// Pede o CSV e entrega ao navegador. Devolve o texto de erro, ou '' se baixou.
async function baixar(tipo, de, ate) {
  try {
    const res = await fetch('/api/gestao/afiliados/financeiro/csv?tipo=' + tipo + '&de=' + de + '&ate=' + ate, { cache: 'no-store' })
    if (!res.ok) {
      const corpo = await res.json().catch(() => null)
      return res.status === 404 ? 'Sua sessão acabou. Entre de novo para continuar na gestão.' : corpo?.erro || FALHA
    }
    const nome = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'afiliados-' + tipo + '.csv'
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return ''
  } catch {
    return FALHA
  }
}

export default function ExportarCsv({ de, ate, master = false }) {
  const [pedindo, setPedindo] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  const pedir = async (r) => {
    setErro('')
    setOcupado(r.id)
    const falha = await baixar(r.id, de, ate)
    setOcupado('')
    if (falha) setErro(falha)
    return falha
  }

  return (
    <section aria-labelledby="titulo-exportar" className="rounded-md border border-line bg-white p-4 sm:p-5">
      <h2 id="titulo-exportar" className="text-[17px] font-bold tracking-[-0.01em] text-ink">Planilhas para a contabilidade</h2>
      <p className="mt-1 text-[14px] text-ink-muted">Valem para o período escolhido acima. No máximo 5.000 linhas por arquivo.</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {RELATORIOS.filter((r) => master || !r.sensivel).map((r) => (
          <li key={r.id} className="flex flex-col items-start justify-between gap-3 rounded border border-line p-3.5">
            <div>
              <p className="text-[14.5px] font-semibold text-ink">{r.rotulo}</p>
              <p className="mt-0.5 text-[13.5px] text-ink-muted">{r.texto}</p>
              {r.sensivel && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-signal-deep">
                  <Icone nome="alerta" tamanho={16} className="mt-px shrink-0" />
                  Tem CPF e chave Pix. A exportação fica registrada.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={Boolean(ocupado)}
              onClick={() => (r.sensivel ? setPedindo(r) : pedir(r))}
              className="btn-quiet min-h-11 !px-4 !py-2.5 !text-[14px] disabled:opacity-60"
            >
              {ocupado === r.id ? 'Gerando…' : 'Baixar planilha'}
            </button>
          </li>
        ))}
      </ul>
      {!master && <p className="mt-2 text-[13.5px] text-ink-muted">Só o Administrador Master paga saques e vê CPF e Pix completos. A planilha de saques pagos é dele.</p>}
      <p role="alert" className="mt-2 min-h-[20px] text-[13.5px] text-signal-deep">
        {erro}
      </p>
      <Confirmar
        aberto={Boolean(pedindo)}
        aoMudar={(v) => !v && setPedindo(null)}
        titulo="Baixar saques pagos?"
        texto="A planilha traz o CPF e a chave Pix de quem recebeu. Guarde em lugar seguro e use só para a contabilidade. Esta exportação fica registrada com o seu e-mail."
        rotulo="Baixar planilha"
        aoConfirmar={() => pedir(pedindo)}
      />
    </section>
  )
}
