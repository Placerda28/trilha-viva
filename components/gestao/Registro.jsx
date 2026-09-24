'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import { Aviso, Esqueleto, Vazio, Paginacao } from './Estados'
import { dataHora, numero } from './formato'

const POR_PAGINA = 50

// Frase de cada ação, para a lista ler como um diário e não como um log.
const ACOES = {
  cupom_criado: 'criou o cupom',
  cupom_desativado: 'desativou o cupom',
  membro_adicionado: 'adicionou à equipe',
  membro_removido: 'removeu da equipe',
  acervo_liberado: 'liberou o acervo para',
  acervo_retirado: 'tirou o acervo de',
  senha_trocada: 'trocou a própria senha',
  cliente_bloqueado: 'bloqueou o cliente',
  cliente_liberado: 'liberou o cliente',
}

function Linha({ r }) {
  const frase = ACOES[r.acao] || r.acao
  const mostrarAlvo = r.alvo && r.acao !== 'senha_trocada'
  return (
    <li className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="figs shrink-0 text-[13px] text-ink-muted sm:w-[140px]">{dataHora(r.quando)}</span>
      <span className="min-w-0 text-[14.5px] text-ink">
        <span className="break-words font-semibold">{r.quem}</span> {frase}
        {mostrarAlvo && (
          <>
            {' '}
            <span className="break-words font-semibold">{r.alvo}</span>
          </>
        )}
        {r.acao === 'membro_adicionado' && r.detalhe?.conta_existente && (
          <span className="text-ink-muted"> (já tinha conta)</span>
        )}
      </span>
    </li>
  )
}

export default function Registro() {
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro, carregando } = useGestao('/api/gestao/registro?pagina=' + pagina, tentativa)

  return (
    <section aria-labelledby="titulo-registro" className="mt-8">
      <h2 id="titulo-registro" className="text-[17px] font-bold text-ink">
        Registro de ações{' '}
        {dados && <span className="figs font-normal text-ink-muted">({numero(dados.total)})</span>}
      </h2>
      <p className="mt-1 text-[14px] text-ink-muted">
        Quem mexeu em cupons e na equipe, e quando. Mais recente primeiro, no horário de Brasília.
      </p>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto linhas={5} />
      ) : dados.itens.length === 0 ? (
        <Vazio titulo="Nada registrado ainda" texto="Criar ou desativar um cupom, ou mexer na equipe, aparece aqui." />
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-white">
            {dados.itens.map((r) => (
              <Linha key={r.id} r={r} />
            ))}
          </ul>
          <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={dados.total} onIr={setPagina} />
        </div>
      )}
    </section>
  )
}
