'use client'

import { useEffect, useMemo, useState } from 'react'
import { Botao, ListaVazia } from '@/components/ds'
import BuscaEFiltros from '@/components/catalogo/BuscaEFiltros'
import { LinhaMusica, ListaMusicas } from '@/components/catalogo/ListaMusicas'
import { FAIXAS_BPM, musicaDaTupla, naFaixa, plano } from '@/lib/catalogo-util'

// Lista do acervo com busca e filtros (Artista, Estilo, Tom e BPM), toda no
// navegador. Serve /musicas (com os quatro filtros e "Carregar mais") e
// /artistas/[slug] (só a busca, a lista inteira).
//
// As músicas chegam como tuplas (lib/catalogo-lista.js) já com tom e BPM: nada
// de buscar de novo. ?artista= e ?q= são lidos aqui, no navegador, e não no
// servidor: assim a página continua sendo montada uma vez só, na publicação
// (ler a barra de endereço no servidor derrubou o acervo em setembro: erro 1102).
const VAZIO = { q: '', artista: '', estilo: '', tom: '', faixa: '' }

export default function CatalogBrowser({
  musicas,
  estilos = [],
  artistas = [],
  tons = [],
  comFiltros = true,
  porPagina = 40,
  rotuloBusca = 'Buscar música ou artista',
}) {
  const [f, setF] = useState(VAZIO)
  const [limite, setLimite] = useState(porPagina)
  const lista = useMemo(() => musicas.map((t) => musicaDaTupla(t, estilos)), [musicas, estilos])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const artista = sp.get('artista')
    const q = sp.get('q')
    if (artista || q) setF((v) => ({ ...v, artista: artista || '', q: q || '' }))
  }, [])

  const muda = (campo) => (valor) => {
    setF((v) => ({ ...v, [campo]: valor }))
    setLimite(porPagina)
  }

  const achadas = useMemo(() => {
    const termo = plano(f.q.trim())
    return lista.filter((m) => {
      if (f.artista && m.artista !== f.artista && m.convidado !== f.artista) return false
      if (f.estilo && m.estilo !== f.estilo) return false
      if (f.tom && m.tom !== f.tom) return false
      if (f.faixa && !(m.bpm && naFaixa(m.bpm, f.faixa))) return false
      return !termo || plano(m.titulo).includes(termo) || plano(m.artista).includes(termo)
    })
  }, [lista, f])

  const mostradas = achadas.slice(0, limite)
  const filtros = comFiltros
    ? [
        { id: 'artista', rotulo: 'Artista', valor: f.artista, onChange: muda('artista'), opcoes: artistas },
        { id: 'estilo', rotulo: 'Estilo', valor: f.estilo, onChange: muda('estilo'), opcoes: estilos },
        { id: 'tom', rotulo: 'Tom', valor: f.tom, onChange: muda('tom'), opcoes: tons },
        {
          id: 'bpm',
          rotulo: 'BPM',
          valor: f.faixa,
          onChange: muda('faixa'),
          opcoes: FAIXAS_BPM.map((b) => ({ valor: b.id, rotulo: b.rotulo })),
        },
      ]
    : []

  return (
    <>
      <BuscaEFiltros rotuloBusca={rotuloBusca} busca={f.q} onBusca={muda('q')} filtros={filtros} />

      <p aria-live="polite" className="figs flex justify-between gap-3 text-[14px] text-text-3">
        <span>
          {achadas.length.toLocaleString('pt-BR')} {achadas.length === 1 ? 'música' : 'músicas'}
        </span>
        {comFiltros && <span>Ordem alfabética</span>}
      </p>

      {achadas.length === 0 ? (
        <ListaVazia
          icone="inbox"
          titulo={f.q.trim() ? `Nenhuma música encontrada para "${f.q.trim()}"` : 'Nenhuma música encontrada'}
          descricao="Confira a escrita, procure pelo nome do artista ou tire algum filtro."
          acao={
            <Botao variante="contorno" onClick={() => setF(VAZIO)}>
              Ver todas as músicas
            </Botao>
          }
          className="items-start px-0 py-7 text-left"
        />
      ) : (
        <ListaMusicas>
          {mostradas.map((m) => (
            <LinhaMusica key={m.slug} musica={m} />
          ))}
        </ListaMusicas>
      )}

      {limite < achadas.length && (
        <Botao variante="contorno" className="self-center" onClick={() => setLimite((l) => l + porPagina)}>
          Carregar mais músicas
        </Botao>
      )}
    </>
  )
}
