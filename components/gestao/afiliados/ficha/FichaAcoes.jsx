'use client'

import { acoesDisponiveis } from '../afiliadosUtil'
import Ajuste from './Ajuste'
import { Anotar, Aprovar, Reativar, Suspender, TravarNivel } from './AcoesSimples'
import TrocarCodigo from './TrocarCodigo'

// Os botões da ficha e a gaveta que cada um abre. O que aparece depende do
// status do afiliado e do papel de quem olha: as ações do Master não aparecem
// para a equipe (e, se alguém forçar, o servidor responde 403 e a gaveta mostra o texto).

const BOTOES = {
  aprovar: ['Aprovar cadastro', 'btn-ink'],
  suspender: ['Suspender', 'btn-quiet'],
  reativar: ['Reativar', 'btn-ink'],
  travar_nivel: ['Travar nível', 'btn-quiet'],
  trocar_codigo: ['Trocar código', 'btn-quiet'],
  ajuste: ['Lançar ajuste', 'btn-quiet'],
  anotar: ['Anotar', 'btn-quiet'],
}

// `aberta` e `setAberta` vêm da ficha: a aba de anotações também abre a gaveta de anotar.
export default function FichaAcoes({ afiliado: a, painel, master, aoMudou, aberta, setAberta }) {
  const fechar = () => setAberta(null)
  const comum = { a, aoFechar: fechar, aoMudou }
  const disponivel = Number(painel?.cartoes?.disponivel)

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={`Ações para ${a.nome}`}>
        {acoesDisponiveis(a.status, master).map((id) => (
          <button key={id} type="button" onClick={() => setAberta(id)} className={BOTOES[id][1] + ' min-h-11 !px-4 !py-2.5 !text-[14.5px]'}>
            {BOTOES[id][0]}
          </button>
        ))}
      </div>
      {!master && <p className="mt-2 text-[13.5px] text-ink-muted">Suspender, trocar código, travar nível e lançar ajuste são só do Administrador Master.</p>}

      {aberta === 'aprovar' && <Aprovar {...comum} />}
      {aberta === 'reativar' && <Reativar {...comum} />}
      {aberta === 'suspender' && <Suspender {...comum} />}
      {aberta === 'anotar' && <Anotar {...comum} />}
      {aberta === 'travar_nivel' && <TravarNivel {...comum} niveis={painel?.niveis || []} />}
      {aberta === 'trocar_codigo' && <TrocarCodigo {...comum} />}
      {aberta === 'ajuste' && <Ajuste {...comum} disponivel={disponivel} />}
    </>
  )
}
