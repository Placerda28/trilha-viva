'use client'

import { useEffect, useState } from 'react'
import { useGestao } from './useGestao'
import ClientesTabela from './ClientesTabela'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { numero } from './formato'

const POR_PAGINA = 25

export default function ClientesLista() {
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)

  // Espera a pessoa parar de digitar antes de buscar: sem isso, "maria" vira
  // cinco consultas ao banco.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const url = '/api/gestao/clientes?q=' + encodeURIComponent(q) + '&pagina=' + pagina
  const { dados, erro, carregando } = useGestao(url, tentativa)
  const total = dados?.total ?? 0

  return (
    <section aria-labelledby="titulo-clientes" className="mt-8">
      <h2 id="titulo-clientes" className="sr-only">
        Clientes
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={80}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar cliente por nome ou e-mail"
          className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <BaixarPlanilha href={'/api/gestao/clientes/csv?q=' + encodeURIComponent(q)} />
      </div>

      <p className="figs mt-4 min-h-[20px] text-[13.5px] text-ink-muted" aria-live="polite">
        {dados
          ? q
            ? numero(total) + (total === 1 ? ' cliente encontrado' : ' clientes encontrados')
            : numero(total) + (total === 1 ? ' cliente com compra' : ' clientes com compra')
          : ''}
      </p>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto />
      ) : dados.itens.length === 0 ? (
        q ? (
          <Vazio
            titulo={'Ninguém com “' + q + '”'}
            texto="A busca olha o nome e o e-mail. Tente só uma parte, como o começo do e-mail."
          />
        ) : (
          <Vazio titulo="Ainda não há clientes" texto="Quem comprar aparece aqui, com a data e a forma de pagamento." />
        )
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <ClientesTabela itens={dados.itens} />
          <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={total} onIr={setPagina} />
        </div>
      )}
    </section>
  )
}
