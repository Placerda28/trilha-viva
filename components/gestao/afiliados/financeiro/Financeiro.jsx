'use client'

import { Suspense, useState } from 'react'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto } from '../../Estados'
import { useGestao } from '../../useGestao'
import { usePeriodo } from '../../usePeriodo'
import SubAbas from '../SubAbas'
import ExportarCsv from './ExportarCsv'
import Extrato, { FiltrosExtrato } from './Extrato'
import ResumoMensal from './ResumoMensal'

// Gestão > Afiliados > Financeiro: o resumo mensal, as planilhas para a
// contabilidade e o extrato geral com filtros e páginas. Os números vêm
// prontos de /api/gestao/afiliados/financeiro; o período é o global da gestão.

function Conteudo({ de, ate, master }) {
  const [tipo, setTipo] = useState('')
  const [afiliado, setAfiliado] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)

  const url =
    '/api/gestao/afiliados/financeiro?de=' + de + '&ate=' + ate +
    (tipo ? '&tipo=' + tipo : '') + (afiliado ? '&afiliado=' + afiliado.id : '') + '&pagina=' + pagina
  const { dados, erro, carregando } = useGestao(url, tentativa)

  const mudarTipo = (v) => { setTipo(v); setPagina(1) }
  const mudarAfiliado = (a) => { setAfiliado(a); setPagina(1) }

  if (erro) return <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
  if (!dados) return <Esqueleto linhas={5} />
  return (
    <div className="flex flex-col gap-3">
      <ExportarCsv de={de} ate={ate} master={master} />
      <ResumoMensal resumo={dados.resumo_mensal} />
      <section aria-labelledby="titulo-extrato" className="rounded-md border border-line bg-white p-4 sm:p-5">
        <h2 id="titulo-extrato" className="text-[17px] font-bold tracking-[-0.01em] text-ink">Extrato geral</h2>
        <p className="mt-1 text-[14px] text-ink-muted">Vendas, bônus, ajustes e estornos, do mais novo ao mais antigo. Toque no nome para ver só aquele afiliado.</p>
        <FiltrosExtrato tipo={tipo} aoTipo={mudarTipo} afiliado={afiliado} aoLimpar={() => mudarAfiliado(null)} />
        <Extrato extrato={dados.extrato} aoAfiliado={(a) => mudarAfiliado(a)} aoPagina={setPagina} carregando={carregando} />
      </section>
    </div>
  )
}

function Tela({ master }) {
  const periodo = usePeriodo()
  return (
    <section aria-label="Financeiro dos afiliados">
      <CabecalhoPagina titulo="Financeiro dos afiliados" texto="Extrato, resumo por mês e planilhas para a contabilidade, no horário de Brasília." comPeriodo />
      <SubAbas atual="financeiro" />
      {periodo.valido ? (
        // Trocar o período recomeça os filtros e a página.
        <Conteudo key={periodo.de + periodo.ate} de={periodo.de} ate={periodo.ate} master={master} />
      ) : (
        <p role="alert" className="mt-3 text-[14px] text-signal-deep">{periodo.erro}</p>
      )}
    </section>
  )
}

export default function Financeiro({ master = false }) {
  return (
    <Suspense fallback={<Esqueleto linhas={5} />}>
      <Tela master={master} />
    </Suspense>
  )
}
