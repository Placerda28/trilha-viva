'use client'

import { Suspense, useState } from 'react'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto } from '../../Estados'
import { diaPorExtenso } from '../../formato'
import { useGestao } from '../../useGestao'
import { usePeriodo } from '../../usePeriodo'
import SubAbas from '../SubAbas'
import { BlocoAfiliados, BlocoDinheiro } from './BlocosAfiliadosDinheiro'
import Compensa from './Compensa'
import Graficos from './Graficos'

// Gestão > Afiliados > Dashboard: "está compensando? quem está vendendo?
// quanto vou pagar?". Tudo vem calculado de /api/gestao/afiliados/dashboard
// (o período e o período anterior também); aqui só se desenha. O período é o
// global da gestão (?de&ate na URL), então vale igual em Financeiro.

function Conteudo() {
  const periodo = usePeriodo()
  const [tentativa, setTentativa] = useState(0)
  const url = periodo.valido ? '/api/gestao/afiliados/dashboard?de=' + periodo.de + '&ate=' + periodo.ate : null
  const { dados, erro, carregando } = useGestao(url, tentativa)

  return (
    <section aria-label="Dashboard dos afiliados">
      <CabecalhoPagina titulo="Dashboard dos afiliados" texto="O programa está compensando? Quem vendeu e quanto falta pagar, no horário de Brasília." comPeriodo />
      <SubAbas atual="dashboard" />

      {!periodo.valido && <p role="alert" className="mt-3 text-[14px] text-signal-deep">{periodo.erro}</p>}

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        periodo.valido && <Esqueleto linhas={5} />
      ) : (
        <div className={'transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
          <p className="figs mb-3 text-[13.5px] text-ink-muted">
            {dados.periodo?.anterior && 'Comparado com ' + diaPorExtenso(dados.periodo.anterior.de) + ' a ' + diaPorExtenso(dados.periodo.anterior.ate)}
          </p>
          <Compensa dados={dados} />
          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <BlocoAfiliados a={dados.afiliados} />
            <BlocoDinheiro d={dados.dinheiro} />
          </div>
          <Graficos series={dados.series} />
        </div>
      )}
    </section>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<Esqueleto linhas={5} />}>
      <Conteudo />
    </Suspense>
  )
}
