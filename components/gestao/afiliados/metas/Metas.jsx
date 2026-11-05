'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto } from '../../Estados'
import SubAbas from '../SubAbas'
import { useBusca } from '../apiAfiliados'
import { MES_VALIDO, mesPorExtenso } from '../afiliadosUtil'
import EditorNiveis from './EditorNiveis'
import Fechamentos from './Fechamentos'
import Projecao from './Projecao'
import { ConjuntoFuturo, HistoricoTabelas, Niveis } from './TabelaNiveis'

// Gestão > Afiliados > Metas e fechamentos: a tabela de níveis (hoje, próximas e
// histórico), o editor (só Master), o fechamento dos últimos 6 meses e a
// projeção do mês. Os alertas chegam aqui com ?mes=AAAA-MM para marcar um mês.

export default function Metas(props) {
  return (
    <Suspense fallback={<Esqueleto linhas={4} />}>
      <Tela {...props} />
    </Suspense>
  )
}

function Tela({ master = false }) {
  const mesPedido = useSearchParams().get('mes')
  const destaque = MES_VALIDO.test(mesPedido || '') ? mesPedido : ''
  const [tentativa, setTentativa] = useState(0)
  const [editando, setEditando] = useState(false)
  const { dados, erro } = useBusca((api, sinal) => api.metas(sinal), [tentativa])
  const atualizar = () => setTentativa((n) => n + 1)

  return (
    <section aria-label="Metas e fechamentos">
      <CabecalhoPagina titulo="Metas e fechamentos" texto="A tabela de níveis, o fechamento de cada mês e quanto o programa deve custar este mês." />
      <SubAbas atual="metas" />
      {erro ? (
        <Aviso erro={erro} onTentar={atualizar} />
      ) : !dados ? (
        <Esqueleto linhas={5} />
      ) : (
        <div className="space-y-8">
          <Projecao p={dados.projecao} />

          <section aria-labelledby="tabela-niveis" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="tabela-niveis" className="text-[17px] font-bold text-ink">
                  Tabela de níveis
                </h2>
                <p className="mt-0.5 text-[14px] text-ink-muted">A tabela vale para todas as vendas do mês do afiliado.</p>
              </div>
              {master ? (
                <button type="button" onClick={() => setEditando(true)} className="btn-ink min-h-11 !px-5 !py-2.5 !text-[14.5px]">
                  Editar tabela
                </button>
              ) : (
                <p className="text-[13.5px] text-ink-muted">Só o Administrador Master edita a tabela.</p>
              )}
            </div>
            <div className="card-line px-4 py-4 sm:px-6">
              <h3 className="text-[16px] font-bold text-ink">
                Vale hoje <span className="text-[14px] font-normal text-ink-muted">(desde {mesPorExtenso(dados.vigente.valido_desde_mes)})</span>
              </h3>
              <Niveis niveis={dados.vigente.niveis} />
            </div>
            {dados.proximas.map((c) => (
              <ConjuntoFuturo key={c.valido_desde_mes} c={c} />
            ))}
            <HistoricoTabelas itens={dados.historico} />
          </section>

          <Fechamentos itens={dados.fechamentos} master={master} destaque={destaque} aoMudou={atualizar} />
        </div>
      )}
      {editando && dados && (
        <EditorNiveis
          base={(dados.proximas[0] || dados.vigente).niveis}
          mesAtual={dados.mes}
          aoFechar={() => setEditando(false)}
          aoMudou={atualizar}
        />
      )}
    </section>
  )
}
