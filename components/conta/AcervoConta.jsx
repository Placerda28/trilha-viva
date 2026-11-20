'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { songs, artists, getSong } from '@/lib/catalog'
import { Aviso, Botao, ListaCarregando, ListaErro } from '@/components/ds'
import TituloConta from './TituloConta'
import LinhaVS from './LinhaVS'
import { IconeBusca, IconeFiltro } from './Icones'
import { FAIXAS_BPM, PAGINA, casaComFiltros, semAcento, textoDoAviso, tonsDoAcervo } from './acervo-dados'

// Minhas VS (/minha-conta/acervo): a lógica do antigo /acervo (AcervoPainel +
// AcervoLista) no desenho novo. Não muda o fluxo de download nem a cota: o
// servidor segue contando em /api/baixar; aqui só se atualiza o que a tela mostra.

const SELECT =
  'h-11 w-full rounded-control border border-field-border bg-white px-3 text-[15px] text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-[.45] disabled:hover:border-field-border'

function Contador({ usados, limite }) {
  const acabou = usados >= limite
  return (
    <div role="status" className="flex flex-col gap-1.5 sm:w-[260px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold">Downloads hoje</span>
        <span className={`font-semi-condensed text-[20px] font-extrabold tabular-nums ${acabou ? 'text-red-text' : ''}`}>
          {usados} de {limite}
        </span>
      </div>
      <div aria-hidden="true" className="relative h-1 bg-surface-pressed">
        <span
          className={`absolute inset-y-0 left-0 ${acabou ? 'bg-red' : 'bg-ink'}`}
          style={{ width: `${Math.min(100, (usados / limite) * 100)}%` }}
        />
      </div>
      <span className="text-[13px] text-text-3">O contador volta a zero à meia-noite.</span>
    </div>
  )
}

function Filtro({ id, rotulo, valor, onChange, children, desligado }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {rotulo}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} disabled={desligado} className={SELECT}>
        {children}
      </select>
    </div>
  )
}

export default function AcervoConta({ restam, limite, volta, baixadosIniciais, admin = false }) {
  const [montado, setMontado] = useState(false)
  const [sobrando, setSobrando] = useState(restam)
  const [busca, setBusca] = useState('')
  const [artista, setArtista] = useState('')
  const [tom, setTom] = useState('')
  const [bpm, setBpm] = useState('')
  const [mostrar, setMostrar] = useState('todas')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [quantas, setQuantas] = useState(PAGINA)
  const [itens, setItens] = useState(baixadosIniciais ?? [])
  const [historico, setHistorico] = useState(baixadosIniciais === undefined ? 'carregando' : 'pronto')
  const [tentativa, setTentativa] = useState(0)
  const [preparando, setPreparando] = useState({})
  const [aviso, setAviso] = useState({ texto: '', tipo: 'erro' })
  // Vindo da ficha da música (/minha-conta/acervo?musica=<slug>): a lista abre só com essa música.
  const [foco, setFoco] = useState('')

  // Montar a lista no servidor gastaria o orçamento de CPU da visita: ela nasce no navegador.
  useEffect(() => {
    setMontado(true)
    const params = new URLSearchParams(window.location.search)
    const slug = (params.get('musica') || '').trim().toLowerCase()
    const achada = slug && getSong(slug)
    if (achada) {
      setFoco(achada.slug)
      setBusca(achada.title)
    } else if (slug) {
      setBusca(slug.replace(/-/g, ' '))
    }
    const chave = params.get('aviso') || ''
    const texto = textoDoAviso(chave, { limite, volta })
    if (texto) setAviso({ texto, tipo: chave === 'cota' ? 'info' : 'erro' })
  }, [limite, volta])

  useEffect(() => {
    if (baixadosIniciais !== undefined) return
    const controle = new AbortController()
    fetch('/api/conta/downloads', { signal: controle.signal })
      .then(async (res) => {
        const dados = await res.json()
        if (!res.ok || !dados.ok) throw new Error('Falha ao carregar o histórico')
        // Downloads feitos nesta visita (já na lista local) ganham do que veio do servidor.
        setItens((locais) => {
          const slugs = new Set(locais.map((i) => i.slug))
          return [...locais, ...dados.itens.filter((i) => !slugs.has(i.slug))]
        })
        setHistorico('pronto')
      })
      .catch((erro) => {
        if (erro.name !== 'AbortError') setHistorico('erro')
      })
    return () => controle.abort()
  }, [baixadosIniciais, tentativa])

  // O clique já está seguindo o link: a tela só acompanha, um instante depois.
  const baixar = useCallback((slug) => {
    setTimeout(() => {
      setSobrando((n) => Math.max(0, n - 1))
      setItens((atuais) => {
        const agora = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const antes = atuais.find((i) => i.slug === slug)
        return [{ slug, vezes: (antes?.vezes || 0) + 1, ultimo: agora }, ...atuais.filter((i) => i.slug !== slug)]
      })
      setPreparando((p) => ({ ...p, [slug]: true }))
      setTimeout(
        () =>
          setPreparando((p) => {
            const resto = { ...p }
            delete resto[slug]
            return resto
          }),
        2200,
      )
    }, 0)
  }, [])

  const baixados = useMemo(() => new Map(itens.map((i) => [i.slug, i])), [itens])
  const tons = useMemo(() => (montado ? tonsDoAcervo(songs) : []), [montado])
  const filtradas = useMemo(() => {
    if (!montado) return []
    const f = { busca: semAcento(busca.trim()), artista, tom, bpm, mostrar }
    return songs.filter((s) => (!foco || s.slug === foco) && casaComFiltros(s, f, baixados))
  }, [montado, busca, artista, tom, bpm, mostrar, baixados, foco])

  const acabou = sobrando <= 0
  const usados = Math.max(0, limite - sobrando)
  const nFiltros = [artista, tom, bpm, mostrar !== 'todas'].filter(Boolean).length
  const temFiltro = Boolean(busca || nFiltros)
  const limpar = () => {
    setFoco('')
    setBusca('')
    setArtista('')
    setTom('')
    setBpm('')
    setMostrar('todas')
    setQuantas(PAGINA)
  }
  const mudou = (set) => (v) => {
    setFoco('')
    set(v)
    setQuantas(PAGINA)
  }
  const contagem = temFiltro
    ? `${filtradas.length.toLocaleString('pt-BR')} de ${songs.length.toLocaleString('pt-BR')} músicas`
    : `${songs.length.toLocaleString('pt-BR')} músicas, em ordem alfabética`

  return (
    <div className="flex flex-col gap-6">
      <TituloConta titulo="Minhas VS" subtitulo="Mais de 2.000 multitracks com clique e guia, liberadas para você.">
        <div className="flex flex-col gap-1">
          <Contador usados={usados} limite={limite} />
          {admin && (
            <a href="/gestao" className="inline-flex min-h-11 items-center text-[14px] font-semibold underline underline-offset-[3px]">
              Abrir a gestão
            </a>
          )}
        </div>
      </TituloConta>

      {aviso.texto && <Aviso variante={aviso.tipo}>{aviso.texto}</Aviso>}
      {acabou && (
        <Aviso variante="info" titulo={`Você chegou aos ${limite} downloads de hoje.`}>
          Os botões voltam à meia-noite. Dá para buscar e montar a lista do culto enquanto isso.
        </Aviso>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          <div className="relative min-w-[min(100%,280px)] flex-[1_1_280px]">
            <label htmlFor="busca" className="sr-only">
              Buscar música ou artista
            </label>
            <IconeBusca className="pointer-events-none absolute left-3.5 top-3.5 text-text-3" />
            <input
              id="busca"
              type="search"
              value={busca}
              onChange={(e) => mudou(setBusca)(e.target.value)}
              placeholder="Buscar música ou artista"
              autoComplete="off"
              className="block h-12 w-full rounded-control border border-field-border bg-white pl-11 pr-3.5 text-[16px] text-ink placeholder:text-text-4 hover:border-ink"
            />
          </div>
          <Botao
            variante="contorno"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            aria-controls="filtros-vs"
            className="sm:hidden"
          >
            <IconeFiltro />
            Filtrar{nFiltros ? ` (${nFiltros})` : ''}
          </Botao>
        </div>
        <div
          id="filtros-vs"
          className={`${filtrosAbertos ? 'grid' : 'hidden'} grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 sm:grid`}
        >
          <Filtro id="f-artista" rotulo="Artista" valor={artista} onChange={mudou(setArtista)}>
            <option value="">Todos</option>
            {artists.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Filtro>
          <Filtro id="f-tom" rotulo="Tom" valor={tom} onChange={mudou(setTom)}>
            <option value="">Todos</option>
            {tons.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Filtro>
          <Filtro id="f-bpm" rotulo="BPM" valor={bpm} onChange={mudou(setBpm)}>
            <option value="">Todos</option>
            {FAIXAS_BPM.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </Filtro>
          <Filtro id="f-mostrar" rotulo="Mostrar" valor={mostrar} onChange={mudou(setMostrar)} desligado={historico !== 'pronto'}>
            <option value="todas">Todas as VS</option>
            <option value="baixadas">Só as que já baixei</option>
            <option value="novas">Só as que ainda não baixei</option>
          </Filtro>
        </div>
      </div>

      {historico === 'erro' && (
        <ListaErro
          titulo="Não conseguimos carregar o seu histórico de downloads."
          onTentar={() => {
            setHistorico('carregando')
            setTentativa((n) => n + 1)
          }}
        >
          As VS continuam liberadas e dá para baixar normalmente. Só não dá para marcar o que você já baixou.
        </ListaErro>
      )}

      {!montado ? (
        <ListaCarregando linhas={6} rotulo="Carregando suas VS" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3 text-[14px] text-text-3">
            <span className="tabular-nums" role="status">
              {contagem}
            </span>
            {temFiltro && (
              <button
                type="button"
                onClick={limpar}
                className="min-h-11 text-[14px] font-semibold text-ink underline underline-offset-[3px]"
              >
                Limpar busca e filtros
              </button>
            )}
          </div>
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-start gap-2.5 border-t border-line py-8">
              <IconeBusca tamanho={40} traco={1.5} className="text-text-3" />
              <strong className="text-[17px] font-[650]">Nenhuma VS encontrada</strong>
              <span className="text-[15px] leading-[1.5] text-text-2">
                Confira a escrita ou tire algum filtro. Se a música não está no acervo, peça em{' '}
                <a href="/minha-conta/ajuda" className="font-semibold underline underline-offset-[3px]">
                  Ajuda
                </a>
                .
              </span>
              <Botao variante="contorno" onClick={limpar}>
                Limpar busca e filtros
              </Botao>
            </div>
          ) : (
            <>
              <ul className="flex flex-col border-b border-line">
                {filtradas.slice(0, quantas).map((s) => (
                  <LinhaVS
                    key={s.slug}
                    musica={s}
                    baixado={baixados.get(s.slug)}
                    acabou={acabou}
                    preparando={Boolean(preparando[s.slug])}
                    onBaixar={baixar}
                  />
                ))}
              </ul>
              {quantas < filtradas.length && (
                <Botao variante="contorno" onClick={() => setQuantas((n) => n + PAGINA)} className="self-center px-6">
                  Mostrar mais {PAGINA}
                </Botao>
              )}
            </>
          )}
        </div>
      )}

      <p className="max-w-[68ch] text-[13px] leading-[1.5] text-text-3">
        São {limite} downloads por dia, renovando à meia-noite. O limite protege o acervo de cópia em massa, não o seu
        ministério. Baixar de novo também conta. Este acesso é pessoal: compartilhar a senha pode suspender a conta, conforme
        os{' '}
        <a href="/termos" className="font-semibold text-ink underline underline-offset-[3px]">
          termos de uso
        </a>
        .
      </p>
    </div>
  )
}
