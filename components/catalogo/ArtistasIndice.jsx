'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ListaVazia } from '@/components/ds'
import BuscaEFiltros from './BuscaEFiltros'
import { plano } from '@/lib/catalogo-util'

// Corpo da /artistas: busca, "Com mais músicas no acervo", índice de A a Z e a
// lista de cada letra. Todos os artistas vão no HTML (o Google lê a lista);
// a busca troca tudo por uma lista só com os resultados.
//
// `destaques` e os itens de `grupos` são [slug, nome, quantidade de músicas].
// `grupos`: [{ id: 'a', letra: 'A', itens }], em ordem alfabética.
const LETRAS = 'abcdefghijklmnopqrstuvwxyz'.split('')

function Lista({ itens }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-8 border-b border-line p-0">
      {itens.map(([slug, nome, n]) => (
        <li key={slug} className="border-t border-line">
          <Link
            href={`/artistas/${slug}`}
            prefetch={false}
            className="flex min-h-14 items-center justify-between gap-3 hover:bg-surface"
          >
            <span className="text-[16px] font-semibold">{nome}</span>
            <span className="figs shrink-0 text-[14px] text-text-3">{n} VS</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const titulo = 'font-semi-condensed text-[22px] font-bold leading-tight'

export default function ArtistasIndice({ destaques, grupos }) {
  const [q, setQ] = useState('')
  const termo = plano(q.trim())
  const achados = useMemo(
    () => (termo ? grupos.flatMap((g) => g.itens).filter(([, nome]) => plano(nome).includes(termo)) : null),
    [grupos, termo]
  )
  const comArtistas = new Set(grupos.map((g) => g.id))
  const letras = grupos.some((g) => g.id === 'num') ? ['num', ...LETRAS] : LETRAS

  return (
    <>
      <BuscaEFiltros rotuloBusca="Buscar artista ou ministério" busca={q} onBusca={setQ} />

      {achados ? (
        <section aria-live="polite" className="flex flex-col gap-3">
          <p className="figs text-[14px] text-text-3">
            {achados.length.toLocaleString('pt-BR')} {achados.length === 1 ? 'artista' : 'artistas'}
          </p>
          {achados.length === 0 ? (
            <ListaVazia
              titulo={`Nenhum artista encontrado para "${q.trim()}"`}
              descricao="Confira a escrita ou procure pelo nome de uma música na página Acervo."
              className="items-start px-0 py-7 text-left"
            />
          ) : (
            <Lista itens={achados} />
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby="h-mais" className="flex flex-col gap-3">
            <h2 id="h-mais" className={titulo}>
              Com mais músicas no acervo
            </h2>
            <Lista itens={destaques} />
          </section>

          <section aria-labelledby="h-az" className="flex flex-col gap-3">
            <h2 id="h-az" className={titulo}>
              Todos, de A a Z
            </h2>
            <nav aria-label="Letras" className="flex flex-wrap border-l border-t border-l-line border-t-ink">
              {letras.map((id) => {
                const rotulo = id === 'num' ? '0-9' : id.toUpperCase()
                const caixa =
                  'flex h-11 min-w-11 items-center justify-center border-b border-r border-line px-1 text-[15px] font-semibold'
                return comArtistas.has(id) ? (
                  <a key={id} href={`#letra-${id}`} className={`${caixa} hover:bg-surface`}>
                    {rotulo}
                  </a>
                ) : (
                  <span key={id} aria-hidden="true" className={`${caixa} text-line-2`}>
                    {rotulo}
                  </span>
                )
              })}
            </nav>
            <div className="mt-3 flex flex-col gap-8">
              {grupos.map((g) => (
                <section key={g.id} id={`letra-${g.id}`} aria-label={`Artistas com a letra ${g.letra}`} className="scroll-mt-24">
                  <h3 className={`${titulo} mb-2 border-b border-ink pb-1.5`}>{g.letra}</h3>
                  <Lista itens={g.itens} />
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
