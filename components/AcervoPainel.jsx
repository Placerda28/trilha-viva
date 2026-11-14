'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs } from 'radix-ui'
import { getSong } from '@/lib/catalog'
import AcervoLista, { AcaoDownload } from '@/components/AcervoLista'
import CotaAcervo from '@/components/CotaAcervo'
import RelatarProblema from '@/components/RelatarProblema'
import SairBotao from '@/components/SairBotao'

const ABAS = ['acervo', 'downloads', 'conta']
const PAGINA = 40

function abaDaUrl() {
  const aba = new URLSearchParams(window.location.search).get('aba')
  return ABAS.includes(aba) ? aba : 'acervo'
}

function dataBrasilia(valor) {
  const data = new Date(valor.replace(' ', 'T') + 'Z')
  return Number.isNaN(data.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(data)
}

function AbaDownloads({ estado, itens, mostrando, setMostrando, setEstado, setTentativa, acabou, baixar }) {
  return (
    <>
      <p className="text-[14px] text-ink-muted">Baixar de novo conta no limite de hoje.</p>
      {estado === 'carregando' && <p className="py-10 text-ink-muted">Carregando seus downloads…</p>}
      {estado === 'erro' && (
        <div role="alert" className="py-8">
          <p>Não consegui carregar seus downloads.</p>
          <button
            type="button"
            className="btn-quiet mt-4 min-h-11"
            onClick={() => { setEstado('carregando'); setTentativa((n) => n + 1) }}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {estado === 'pronto' && itens.length === 0 && (
        <p className="py-10 text-ink-muted">Você ainda não baixou nada. Comece pela aba Acervo.</p>
      )}
      {estado === 'pronto' && (
        <>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {itens.slice(0, mostrando).map((item) => {
              const musica = getSong(item.slug)
              return (
                <li key={item.slug} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-semibold text-ink">
                      {musica?.title || 'Música fora do catálogo'}
                    </p>
                    {musica && <p className="text-[13.5px] text-ink-muted">{musica.artist}</p>}
                    <p className="figs mt-1 text-[13px] text-ink-faint">
                      {dataBrasilia(item.ultimo)}{item.vezes > 1 ? ` · ${item.vezes} vezes` : ''}
                    </p>
                  </div>
                  {musica && <AcaoDownload musica={musica} acabou={acabou} onBaixar={baixar} repetido />}
                </li>
              )
            })}
          </ul>
          {mostrando < itens.length && (
            <button
              type="button"
              className="btn-quiet mt-8 min-h-11"
              onClick={() => setMostrando((n) => n + PAGINA)}
            >
              Ver mais
            </button>
          )}
        </>
      )}
    </>
  )
}

function AbaConta({ nome, email, limite }) {
  return (
    <>
      <section>
        <h2 className="text-[18px] font-bold text-ink">Sua conta</h2>
        <p className="mt-2 break-all text-ink-muted">{email}</p>
      </section>
      <section>
        <h2 className="text-[18px] font-bold text-ink">Senha</h2>
        <a href="/recuperar" className="link-quiet inline-flex min-h-11 items-center font-semibold">
          Trocar a senha
        </a>
        <p className="text-[14px] text-ink-muted">Você receberá um e-mail para escolher uma nova senha.</p>
      </section>
      <section>
        <h2 className="text-[18px] font-bold text-ink">Ajuda</h2>
        <div className="mt-2"><RelatarProblema nomeInicial={nome} emailInicial={email} /></div>
      </section>
      <section>
        <h2 className="text-[18px] font-bold text-ink">Atalhos</h2>
        <nav aria-label="Atalhos da conta" className="mt-2 flex flex-col items-start gap-2">
          <a href="/como-usar" className="link-quiet inline-flex min-h-11 items-center">Como usar as multitracks</a>
          <a href="/termos" className="link-quiet inline-flex min-h-11 items-center">Termos de uso</a>
        </nav>
      </section>
      <p className="text-[13px] leading-relaxed text-ink-faint">
        São {limite} downloads por dia, renovando à meia-noite — o limite protege o acervo de cópia em massa,
        não o seu ministério. Este acesso é pessoal; compartilhar a senha pode suspender a conta, conforme os{' '}
        <a href="/termos" className="link-quiet inline-flex min-h-11 items-center font-semibold">
          termos de uso
        </a>.
      </p>
      <div className="border-t border-line pt-6"><SairBotao /></div>
    </>
  )
}

export default function AcervoPainel({ nome, email, restam, limite, volta, baixadosIniciais, liberado = true, children }) {
  const [aba, setAba] = useState('acervo')
  const [sobrando, setSobrando] = useState(restam)
  const [itens, setItens] = useState(baixadosIniciais ?? [])
  const [estado, setEstado] = useState(liberado && baixadosIniciais === undefined ? 'carregando' : 'pronto')
  const [tentativa, setTentativa] = useState(0)
  const [mostrando, setMostrando] = useState(PAGINA)

  useEffect(() => {
    setAba(abaDaUrl())
    const voltar = () => setAba(abaDaUrl())
    window.addEventListener('popstate', voltar)
    return () => window.removeEventListener('popstate', voltar)
  }, [])

  useEffect(() => {
    if (!liberado || baixadosIniciais !== undefined) return
    const controle = new AbortController()
    fetch('/api/conta/downloads', { signal: controle.signal })
      .then(async (res) => {
        const dados = await res.json()
        if (!res.ok || !dados.ok) throw new Error('Falha ao carregar downloads')
        setItens((atuais) => {
          const slugsLocais = new Set(atuais.map((item) => item.slug))
          return [...atuais, ...dados.itens.filter((item) => !slugsLocais.has(item.slug))]
        })
        setEstado('pronto')
      })
      .catch((erro) => { if (erro.name !== 'AbortError') setEstado('erro') })
    return () => controle.abort()
  }, [baixadosIniciais, liberado, tentativa])

  const mudarAba = (proxima) => {
    setAba(proxima)
    const url = new URL(window.location.href)
    if (proxima === 'acervo') url.searchParams.delete('aba')
    else url.searchParams.set('aba', proxima)
    window.history.pushState(null, '', url)
  }

  const baixar = useCallback((slug) => {
    setSobrando((n) => Math.max(0, n - 1))
    setItens((atuais) => {
      const agora = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const anterior = atuais.find((item) => item.slug === slug)
      const novo = { slug, vezes: (anterior?.vezes || 0) + 1, ultimo: agora }
      return [novo, ...atuais.filter((item) => item.slug !== slug)]
    })
  }, [])

  const baixados = useMemo(() => new Set(itens.map((item) => item.slug)), [itens])
  const acabou = sobrando <= 0

  return (
    <>
      {liberado && <CotaAcervo sobrando={sobrando} limite={limite} volta={volta} />}
      <Tabs.Root
        value={!liberado && aba === 'downloads' ? 'acervo' : aba}
        onValueChange={mudarAba}
        className="mt-8"
      >
        <Tabs.List
          aria-label="Área do cliente"
          className={'grid border-b border-line ' + (liberado ? 'grid-cols-3' : 'grid-cols-2')}
        >
          {(liberado
            ? [['acervo', 'Acervo'], ['downloads', 'Meus downloads'], ['conta', 'Conta']]
            : [['acervo', 'Acervo'], ['conta', 'Conta']]).map(([valor, texto]) => (
            <Tabs.Trigger
              key={valor}
              value={valor}
              className="min-h-11 min-w-0 border-b-2 border-transparent px-1 py-3 text-center text-[13px] font-semibold text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink data-[state=active]:border-signal data-[state=active]:text-ink sm:text-[15px]"
            >
              {texto}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="acervo" className="focus-visible:outline-none">
          {liberado
            ? <AcervoLista sobrando={sobrando} baixados={baixados} estado={estado} onBaixar={baixar} />
            : children}
        </Tabs.Content>
        <Tabs.Content value="downloads" className="pt-7 focus-visible:outline-none">
          <AbaDownloads
            estado={estado}
            itens={itens}
            mostrando={mostrando}
            setMostrando={setMostrando}
            setEstado={setEstado}
            setTentativa={setTentativa}
            acabou={acabou}
            baixar={baixar}
          />
        </Tabs.Content>
        <Tabs.Content value="conta" className="space-y-7 pt-8 focus-visible:outline-none">
          <AbaConta nome={nome} email={email} limite={limite} />
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}
