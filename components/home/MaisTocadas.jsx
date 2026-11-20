import Link from 'next/link'
import Secao from '@/components/venda/Secao'
import { H2, LINK } from '@/components/venda/estilos'
import { Icone } from '@/components/ds'
import { getSong } from '@/lib/catalog'
import { artistList } from '@/lib/artists'

// Seção 3 da home (MUDANÇAS §3): as 8 mais tocadas e os artistas do acervo.
//
// A lista é a do desenho (fixada à mão, como a vitrine antiga). Título, artista
// e endereço vêm do catálogo: se um slug sumir do acervo, a linha some em vez de
// apontar para uma ficha que não existe. Sem capa no catálogo, o quadrado preto
// com as iniciais (o catálogo ainda não tem capas).
//
// Links com prefetch={false}: são 20 na tela e quase ninguém abre mais de um.

const MAIS_TOCADAS = [
  '1000-graus-renascer-praise',
  'estacoes-dunamis-music',
  'a-boa-parte-fhop-music',
  'a-casa-e-sua-casa-worship',
  'clamo-jesus-baruk',
  'jesus-filho-de-deus-fernandinho',
  'sou-grato-por-seu-amor-get-worship',
  'bondade-de-deus-isaias-saad',
]

const musicas = MAIS_TOCADAS.map((slug) => getSong(slug)).filter(Boolean)
const artistas = artistList.slice(0, 12)

// "A Casa É Sua" vira "CS"; "1000 Graus" vira "1G". Palavras de 1 ou 2 letras
// ("A", "de") ficam de fora, menos os números.
function sigla(titulo) {
  const palavras = titulo.split(/\s+/).filter((p) => p.length > 2 || /^\d/.test(p))
  return palavras.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || titulo.slice(0, 2).toUpperCase()
}

export default function MaisTocadas() {
  return (
    <Secao fundo="surface" aria-labelledby="h-musicas" interno="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 id="h-musicas" className={H2}>
          Mais tocadas
        </h2>
        <Link href="/musicas" className={LINK}>
          Ver todas as músicas
        </Link>
      </div>

      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-x-12 border-b border-line-2">
        {musicas.map((m, i) => (
          <li key={m.slug} className="border-t border-line-2">
            <Link
              href={`/musicas/${m.slug}`}
              prefetch={false}
              className="-mx-3 flex min-h-[76px] items-center gap-3.5 px-3 py-2.5 text-ink hover:bg-surface-pressed"
            >
              <span className="w-5 shrink-0 text-right text-[14px] font-bold tabular-nums text-text-3">{i + 1}</span>
              <span
                aria-hidden="true"
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-ink font-semi-condensed text-[16px] font-bold tracking-[.02em] text-white"
              >
                {sigla(m.title)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[16px] font-semibold leading-[1.3]">{m.title}</span>
                <span className="text-[14px] text-text-3">{m.artist}</span>
              </span>
              <Icone nome="seta-direita" tamanho={18} traco={1.5} className="shrink-0 opacity-55" />
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-[650]">Artistas e ministérios no acervo</h3>
        <div className="flex flex-wrap gap-x-5 text-[15px]">
          {artistas.map((a) => (
            <Link
              key={a.slug}
              href={`/artistas/${a.slug}`}
              prefetch={false}
              className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
            >
              {a.name}
            </Link>
          ))}
          <Link href="/artistas" className={`${LINK} text-[15px]`}>
            Ver os {artistList.length} artistas
          </Link>
        </div>
      </div>
    </Secao>
  )
}
