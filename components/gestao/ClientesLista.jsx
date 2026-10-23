'use client'

import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { CabecalhoPagina } from './Casca'
import { useGestao } from './useGestao'
import ClientesTabela from './ClientesTabela'
import { Aviso, Esqueleto, Vazio, Paginacao, BaixarPlanilha } from './Estados'
import { numero } from './formato'
import Segmentos from './Segmentos'
import { PainelAcao } from './MenuAcoes'
import { useDetalhe } from './DetalheCliente'

const POR_PAGINA = 25

export default function ClientesLista() {
  const detalhe = useDetalhe()
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [filtro, setFiltro] = useState('todos')
  const [acao, setAcao] = useState(null)
  const [aviso, setAviso] = useState('')

  // Espera a pessoa parar de digitar antes de buscar: sem isso, "maria" vira
  // cinco consultas ao banco.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const url = '/api/gestao/clientes?q=' + encodeURIComponent(q) + '&pagina=' + pagina + '&filtro=' + filtro + (filtro === 'testes' ? '&testes=1' : '')
  const { dados, erro, carregando } = useGestao(url, tentativa)
  const total = dados?.total ?? 0

  return (
    <section aria-label="Clientes" className="[&_button]:min-h-11 [&_a]:min-h-11">
      <CabecalhoPagina titulo="Clientes" texto="Quem comprou, de onde veio e como está o acesso." />
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

      <div className="mt-3">
        <Segmentos
          rotulo="Filtrar clientes"
          opcoes={[{ id: 'todos', rotulo: 'Todos' }, { id: 'sem_senha', rotulo: 'Sem senha' }, { id: 'bloqueados', rotulo: 'Bloqueados' }, { id: 'testes', rotulo: 'Testes' }]}
          valor={filtro}
          onEscolher={(v) => {
            setFiltro(v)
            setPagina(1)
          }}
        />
      </div>
      {filtro === 'testes' && <p className="mt-2 text-[13px] text-ink-muted">Inclui compras de teste junto aos clientes reais.</p>}
      {filtro !== 'todos' && <p className="mt-2 text-[13px] text-ink-muted">A planilha respeita a busca, mas inclui todas as situações e exclui testes.</p>}
      {aviso && <p role="status" className="mt-3 text-[14px] text-ink">{aviso}</p>}
      {acao && (
        <Dialog.Root open onOpenChange={(aberto) => { if (!aberto) setAcao(null) }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[75] bg-ink/60" />
            <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[80] max-h-[90dvh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-white p-4 [&_button]:min-h-11">
              <div className="flex items-center justify-between gap-2">
                <Dialog.Title className="min-w-0 break-all font-semibold">{acao.c.nome || acao.c.email}</Dialog.Title>
                <Dialog.Close aria-label="Fechar ação" className="btn-quiet min-w-11">×</Dialog.Close>
              </div>
          <PainelAcao
            key={acao.c.id + acao.id}
            acao={acao.id}
            c={acao.c}
            aoFechar={() => setAcao(null)}
            aoFeito={(mensagem) => { setAviso(mensagem); setAcao(null); setTentativa((n) => n + 1) }}
            aoCorrigir={() => { setAcao(null); setTentativa((n) => n + 1) }}
          />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <p className="figs mt-2 min-h-[20px] text-[13.5px] text-ink-muted" aria-live="polite">
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
          <ClientesTabela
            itens={dados.itens}
            whatsapp
            onEscolherAcao={(c, id) => { setAviso(''); setAcao({ c, id }) }}
            onAbrir={(id) => detalhe.abrir(id, () => setTentativa((n) => n + 1))}
          />
          <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={total} onIr={setPagina} />
        </div>
      )}
    </section>
  )
}
