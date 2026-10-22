'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGestao } from './useGestao'
import Segmentos from './Segmentos'
import { Aviso, Esqueleto, Vazio, BaixarPlanilha } from './Estados'
import { moeda, numero } from './formato'
import Tabela from './RecuperacaoTabela'
import { MostrarTestes } from './AcaoGestao'

// Aba Recuperação: uma linha por pessoa que deixou nome, e-mail e celular no
// checkout e não pagou na hora. Mostra em que ponto da sequência de e-mails
// ela está (1 hora, 7 dias, 15 dias, 30 dias e o encerramento), a sequência
// de WhatsApp (1ª 3 h depois, depois 1 por semana até 9, pela API oficial da
// Meta; "desligado" enquanto não estiver ligado) e quem comprou depois.

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'recuperados', rotulo: 'Recuperados' },
  { id: 'finalizados', rotulo: 'Finalizados' },
  { id: 'sem_envio', rotulo: 'Sem envio' },
]

function Total({ rotulo, valor, detalhe }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

const VAZIO = {
  todos: ['Ninguém por aqui ainda', 'Quem preencher o formulário de compra e não pagar aparece aqui.'],
  andamento: ['Ninguém em recuperação agora', 'Quem está esperando ou recebendo a sequência de e-mails aparece aqui.'],
  recuperados: ['Nenhuma venda recuperada ainda', 'Quem comprar depois de receber um dos e-mails aparece aqui.'],
  finalizados: ['Nenhum protocolo finalizado', 'Aparece aqui quem recebeu os 4 e-mails sem comprar, ou pediu para parar.'],
  sem_envio: ['Ninguém sem envio', 'Aparece aqui quem já era cliente, repetiu o carrinho ou passou do prazo do 1º e-mail.'],
}

export default function Recuperacao() {
  const [filtro, setFiltro] = useState('todos')
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [testes, setTestes] = useState(false)

  // A busca do topo leva até aqui com ?q=: a caixa já abre preenchida.
  const qDaUrl = useSearchParams().get('q')
  useEffect(() => {
    if (qDaUrl) setTexto(qDaUrl.slice(0, 80))
  }, [qDaUrl])

  // Espera parar de digitar antes de consultar o banco.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const busca = 'filtro=' + filtro + '&busca=' + encodeURIComponent(q)
  const { dados, erro, carregando } = useGestao(
    '/api/gestao/recuperacao?' + busca + '&pagina=' + pagina + (testes ? '&testes=1' : ''),
    tentativa
  )
  const t = dados?.totais

  return (
    <section aria-labelledby="titulo-recuperacao" className="mt-8">
      <h2 id="titulo-recuperacao" className="sr-only">
        Recuperação de vendas
      </h2>

      {t && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-4">
          <Total
            rotulo="Não pagaram na hora"
            valor={numero(t.pessoas)}
            detalhe={numero(t.comprou_sem_lembrete) + ' pagaram antes do lembrete'}
          />
          <Total rotulo="Em recuperação" valor={numero(t.andamento)} detalhe={numero(t.finalizados) + ' finalizados'} />
          <Total
            rotulo="Compraram após o e-mail"
            valor={numero(t.recuperados)}
            detalhe={Math.round((t.taxa || 0) * 100) + '% de quem recebeu'}
          />
          <Total
            rotulo="Valor recuperado"
            valor={moeda(t.valor_recuperado_centavos)}
            detalhe={
              numero(t.emails_enviados) +
              (t.emails_enviados === 1 ? ' e-mail' : ' e-mails') +
              ' · ' +
              numero(t.whatsapp_enviados || 0) +
              ' WhatsApp'
            }
          />
        </dl>
      )}

      <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">
        Sequência por e-mail: 1º com 1 hora, 2º 7 dias depois, 3º 15 dias depois, 4º 30 dias depois. Sem compra em
        mais 30 dias, o protocolo é finalizado. WhatsApp: 1ª 3 horas depois do carrinho, depois 1 por semana até 9,
        das 9h às 20h e nunca no mesmo dia de um e-mail. Para se a pessoa comprar, pedir para sair, responder ou não
        receber / não ler as últimas
        {t && !t.whatsapp_ativo ? ' (desligado no momento)' : ''}.
      </p>

      <div className="mt-6 space-y-4">
        <Segmentos
          opcoes={FILTROS}
          valor={filtro}
          onEscolher={(id) => {
            setFiltro(id)
            setPagina(1)
          }}
          rotulo="Filtrar pessoas"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={80}
            placeholder="Buscar por nome, e-mail ou celular"
            aria-label="Buscar por nome, e-mail ou celular"
            className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
          <BaixarPlanilha href={'/api/gestao/recuperacao/csv?' + busca} />
        </div>
        <MostrarTestes
          valor={testes}
          onMudar={(v) => {
            setTestes(v)
            setPagina(1)
          }}
        />
      </div>

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto />
      ) : dados.itens.length === 0 ? (
        q ? (
          <Vazio titulo={'Ninguém com “' + q + '”'} texto="A busca olha o nome, o e-mail e o celular." />
        ) : (
          <Vazio titulo={VAZIO[filtro][0]} texto={VAZIO[filtro][1]} />
        )
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <Tabela itens={dados.itens} onMudou={() => setTentativa((n) => n + 1)} />
          {/* A rota não conta o total (seria uma consulta a mais): sabe só se
              há próxima página. */}
          {(pagina > 1 || dados.temMais) && (
            <nav aria-label="Páginas" className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPagina(pagina - 1)}
                disabled={pagina <= 1}
                className="btn-quiet !px-4 !py-2.5 !text-[14px] disabled:pointer-events-none disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="figs text-[14px] text-ink-muted">Página {pagina}</p>
              <button
                type="button"
                onClick={() => setPagina(pagina + 1)}
                disabled={!dados.temMais}
                className="btn-quiet !px-4 !py-2.5 !text-[14px] disabled:pointer-events-none disabled:opacity-40"
              >
                Próxima
              </button>
            </nav>
          )}
        </div>
      )}
    </section>
  )
}
