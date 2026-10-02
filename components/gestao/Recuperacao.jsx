'use client'

import { useEffect, useState } from 'react'
import { useGestao } from './useGestao'
import Segmentos from './Segmentos'
import { Aviso, Esqueleto, Vazio, BaixarPlanilha } from './Estados'
import { dataHora, moeda, numero } from './formato'

// Aba Recuperação: uma linha por pessoa que deixou nome, e-mail e celular no
// checkout e não pagou na hora. Mostra em que ponto da sequência de e-mails
// ela está (1 hora, 7 dias, 15 dias, 30 dias e o encerramento), o WhatsApp
// (ainda não existe: fica "em breve") e quem comprou depois de um lembrete.

const POR_PAGINA = 50
const TOTAL_EMAILS = 4

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'recuperados', rotulo: 'Recuperados' },
  { id: 'finalizados', rotulo: 'Finalizados' },
  { id: 'sem_envio', rotulo: 'Sem envio' },
]

// O que cada e-mail da sequência é, para o texto de ajuda e para o "próximo".
const QUANDO = { 1: '1 hora depois', 2: '7 dias depois do 1º', 3: '15 dias depois do 2º', 4: '30 dias depois do 3º' }

const MOTIVO = {
  sequencia: 'Recebeu os 4 e-mails e não comprou',
  descadastro: 'Pediu para não receber lembretes',
  comprou: 'Já tinha comprado por outro caminho',
}

// (11) 98765-4321 a partir dos dígitos que o servidor guarda.
function celular(digitos) {
  const d = String(digitos || '')
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return d
}

function Total({ rotulo, valor, detalhe }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

function Situacao({ p }) {
  const base = 'inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold leading-snug'
  if (p.situacao === 'recuperado') {
    return (
      <span className={base + ' bg-signal-deep text-white'}>
        Comprou após o {p.recuperado_pela_etapa || 1}º e-mail
      </span>
    )
  }
  if (p.situacao === 'comprou_sem_lembrete') {
    return <span className={base + ' border border-line text-ink-muted'}>Comprou antes do lembrete</span>
  }
  if (p.situacao === 'finalizado') {
    return <span className={base + ' bg-ink text-white'}>Protocolo finalizado</span>
  }
  if (p.situacao === 'andamento') {
    return <span className={base + ' border border-ink text-ink'}>Em recuperação</span>
  }
  if (p.situacao === 'aguardando') {
    return <span className={base + ' border border-ink text-ink'}>Aguardando 1º e-mail</span>
  }
  return <span className={base + ' border border-line text-ink-muted'}>Sem envio</span>
}

// Detalhe abaixo da situação: quando comprou, por que encerrou, por que não
// recebeu nada.
function DetalheSituacao({ p }) {
  let texto = ''
  if (p.situacao === 'recuperado' || p.situacao === 'comprou_sem_lembrete') texto = 'Pago em ' + dataHora(p.pago_em)
  else if (p.situacao === 'finalizado') {
    texto = (MOTIVO[p.finalizado_motivo] || 'Encerrado') + (p.finalizado_em ? ' · ' + dataHora(p.finalizado_em) : '')
  } else if (p.situacao === 'sem_envio') texto = 'Já era cliente, carrinho repetido ou passou do prazo'
  if (!texto) return null
  return <span className="figs mt-1 block text-[12.5px] text-ink-muted">{texto}</span>
}

// Os 4 e-mails como quatro casas: cheia = enviado, contorno = o próximo,
// apagada = ainda não. Embaixo, em texto, o que aconteceu e o que vem.
function Emails({ p }) {
  const enviados = new Map((p.emails || []).map((e) => [e.etapa, e.enviado_em]))
  const proxima = p.proxima_etapa
  return (
    <div>
      <ol className="flex gap-1" aria-label={enviados.size + ' de ' + TOTAL_EMAILS + ' e-mails enviados'}>
        {Array.from({ length: TOTAL_EMAILS }, (_, i) => {
          const etapa = i + 1
          const em = enviados.get(etapa)
          const cls = em
            ? 'border-ink bg-ink text-white'
            : etapa === proxima
              ? 'border-ink text-ink'
              : 'border-line text-ink-faint'
          return (
            <li
              key={etapa}
              title={em ? etapa + 'º e-mail enviado em ' + dataHora(em) : etapa + 'º e-mail: ' + QUANDO[etapa]}
              className={'figs flex h-6 w-6 items-center justify-center rounded-sm border text-[12px] font-semibold ' + cls}
            >
              {etapa}
            </li>
          )
        })}
      </ol>
      <ul className="figs mt-1.5 space-y-0.5 text-[12.5px] text-ink-muted">
        {(p.emails || []).map((e) => (
          <li key={e.etapa}>
            {e.etapa}º enviado {dataHora(e.enviado_em)}
          </li>
        ))}
        {p.situacao === 'aguardando' && <li>1º sai cerca de 1 hora após o carrinho</li>}
        {p.situacao === 'andamento' && p.proximo_email_em && (
          <li className="text-ink">
            {proxima ? proxima + 'º previsto ' : 'Encerra '}
            {dataHora(p.proximo_email_em)}
          </li>
        )}
      </ul>
    </div>
  )
}

function Whatsapp({ p }) {
  if (p.whatsapp?.enviado_em) return <span className="figs text-ink">Enviado {dataHora(p.whatsapp.enviado_em)}</span>
  return <span className="text-ink-muted">Em breve</span>
}

function Pessoa({ p }) {
  const tel = celular(p.telefone)
  return (
    <>
      <span className="block font-semibold text-ink">{p.nome || 'Sem nome'}</span>
      <span className="block break-all text-[13.5px] text-ink-muted">{p.email}</span>
      {tel ? (
        <a
          href={'https://wa.me/55' + p.telefone}
          target="_blank"
          rel="noopener noreferrer"
          className="figs mt-0.5 inline-block text-[13.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          title="Abrir conversa no WhatsApp"
        >
          {tel}
        </a>
      ) : (
        <span className="mt-0.5 block text-[13px] text-ink-faint">Sem celular</span>
      )}
    </>
  )
}

function Tabela({ itens }) {
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded border border-line bg-white md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Pessoa</th>
              <th scope="col" className="px-4 py-3 font-semibold">Carrinho</th>
              <th scope="col" className="px-4 py-3 font-semibold">E-mails</th>
              <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
              <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((p) => (
              <tr key={p.email} className="align-top">
                <td className="max-w-[300px] px-4 py-3.5">
                  <Pessoa p={p} />
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink-muted">{dataHora(p.criado_em)}</td>
                <td className="px-4 py-3.5">
                  <Emails p={p} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[14px]">
                  <Whatsapp p={p} />
                </td>
                <td className="max-w-[240px] px-4 py-3.5">
                  <Situacao p={p} />
                  <DetalheSituacao p={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white md:hidden">
        {itens.map((p) => (
          <li key={p.email} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Pessoa p={p} />
              </div>
              <div className="shrink-0 text-right">
                <Situacao p={p} />
              </div>
            </div>
            <DetalheSituacao p={p} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div className="col-span-2">
                <dt className="mb-1 text-ink-muted">E-mails</dt>
                <dd>
                  <Emails p={p} />
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Carrinho</dt>
                <dd className="figs text-ink">{dataHora(p.criado_em)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">WhatsApp</dt>
                <dd>
                  <Whatsapp p={p} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
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

  // Espera parar de digitar antes de consultar o banco.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const busca = 'filtro=' + filtro + '&busca=' + encodeURIComponent(q)
  const { dados, erro, carregando } = useGestao('/api/gestao/recuperacao?' + busca + '&pagina=' + pagina, tentativa)
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
            detalhe={numero(t.emails_enviados) + (t.emails_enviados === 1 ? ' e-mail enviado' : ' e-mails enviados')}
          />
        </dl>
      )}

      <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">
        Sequência por e-mail: 1º com 1 hora, 2º 7 dias depois, 3º 15 dias depois, 4º 30 dias depois. Sem compra em
        mais 30 dias, o protocolo é finalizado. WhatsApp: em breve.
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
          <Tabela itens={dados.itens} />
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
