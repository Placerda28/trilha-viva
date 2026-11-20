'use client'

import { useEffect, useState } from 'react'
import { Botao } from '@/components/ds'
import BuscaEFiltros from '@/components/catalogo/BuscaEFiltros'
import { FAIXAS_BPM, naFaixa, plano } from '@/lib/catalogo-util'

// Busca e filtros da tabela de /bpm (Artista, Estilo, Tom e BPM). A tabela
// inteira já vem no HTML (para o Google ler); aqui só escondemos linhas, sem
// carregar os dados de novo. Cada linha traz o que o filtro precisa em atributos:
// data-bpm, data-busca (título e artista, sem acento), data-artistas ("|A|B|",
// com o convidado), data-estilo e data-tom.
const VAZIO = { q: '', artista: '', estilo: '', tom: '', faixa: '' }

export default function FiltroBpm({ tabelaId, artistas, estilos, tons }) {
  const [f, setF] = useState(VAZIO)
  const [visiveis, setVisiveis] = useState(null)

  useEffect(() => {
    const linhas = document.querySelectorAll(`#${tabelaId} tbody tr`)
    const termo = plano(f.q.trim())
    // Sem filtro, nada a esconder: não percorre as linhas ao abrir a página.
    if (!termo && !f.artista && !f.estilo && !f.tom && !f.faixa) {
      for (const tr of linhas) if (tr.hidden) tr.hidden = false
      setVisiveis(linhas.length)
      return
    }
    let n = 0
    for (const tr of linhas) {
      const d = tr.dataset
      const mostra =
        naFaixa(Number(d.bpm), f.faixa) &&
        (!termo || d.busca.includes(termo)) &&
        (!f.artista || d.artistas.includes(`|${f.artista}|`)) &&
        (!f.estilo || d.estilo === f.estilo) &&
        (!f.tom || d.tom === f.tom)
      if (tr.hidden === mostra) tr.hidden = !mostra
      if (mostra) n++
    }
    setVisiveis(n)
  }, [f, tabelaId])

  const muda = (campo) => (valor) => setF((v) => ({ ...v, [campo]: valor }))

  return (
    <>
      <BuscaEFiltros
        rotuloBusca="Buscar música ou artista"
        busca={f.q}
        onBusca={muda('q')}
        filtros={[
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
        ]}
      />
      {visiveis !== null && (
        <div role="status" className="figs flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-text-3">
          {visiveis === 0 ? 'Nenhuma música com esses filtros.' : `${visiveis.toLocaleString('pt-BR')} músicas`}
          {visiveis === 0 && (
            <Botao variante="contorno" tamanho="sm" onClick={() => setF(VAZIO)}>
              Limpar filtros
            </Botao>
          )}
        </div>
      )}
    </>
  )
}
