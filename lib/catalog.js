// Acervo Trilha Viva - catalogo real, gerado a partir da pasta do Drive.
//
// ESTE ARQUIVO E GERADO. Nao edite a mao: mexa no gerar_catalogo.py, que le o
// catalogo-trilha-viva.json (a planilha do acervo) e reescreve este arquivo.
//
// POR QUE ELE E ASSIM. O Cloudflare da ao site 10 ms de processamento por
// visita. Antes o acervo vinha como uma lista de linhas de texto que o site
// tinha que abrir, agrupar, classificar e ordenar toda vez que era carregado:
// 45 ms. Passou a derrubar as paginas (erro 1102, em 11/09/2026). Agora o
// acervo ja vem pronto e ordenado, e o site so le - cerca de 2 ms.
//
// Cada musica e uma lista, na ordem:
//   0 slug · 1 titulo · 2 banda · 3 categoria (indice de CATEGORIAS) ·
//   4 seed (desenho das barras) · 5 1 se for VS MP3 · 6 participacao ·
//   7 banda convidada · 8 variantes
// Os campos vazios do fim sao omitidos. As variantes sao os ARQUIVOS daquela
// musica no acervo, separados por ";", cada um "tom~bpm~versao~1 se VS":
// o mesmo titulo da mesma banda em outro tom ou ao vivo e UMA musica com mais
// de uma variante. Sao 1563 musicas para 1819 arquivos.
//
// O acervo em si mora nos catalog-dados-N.js, ao lado deste arquivo: o
// conector do GitHub nao carrega um arquivo de 120 KB de uma vez, entao os
// dados viajam partidos, como ja acontece com as imagens em assets/.
const CATEGORIAS = ['Adoração', 'Celebração', 'Ministração', 'Congregacional']

import { parte as p1 } from './catalog-dados-1.js'
import { parte as p2 } from './catalog-dados-2.js'
import { parte as p3 } from './catalog-dados-3.js'
import { parte as p4 } from './catalog-dados-4.js'
import { parte as p5 } from './catalog-dados-5.js'
import { parte as p6 } from './catalog-dados-6.js'
import { parte as p7 } from './catalog-dados-7.js'
import { parte as p8 } from './catalog-dados-8.js'

const CRU = [...p1, ...p2, ...p3, ...p4, ...p5, ...p6, ...p7, ...p8]

export const songs = CRU.map(
  ([slug, title, artist, cat = 3, seed = 0, vs = 0, part = '', tambem = '', vars = '']) => ({
    slug,
    title,
    artist,
    categoria: CATEGORIAS[cat],
    seed,
    tipo: vs ? 'VS MP3' : 'Multitrack',
    part,
    tambem,
    variantes: vars.split(';').map((v) => {
      const [tom = '', bpm = '', versao = '', ehVs = ''] = v.split('~')
      return { tom, bpm, versao, tipo: ehVs ? 'VS MP3' : 'Multitrack' }
    }),
  })
)

// Quantos arquivos o acervo tem de verdade (maior que songs.length, porque
// uma musica pode ter mais de uma versao).
export const totalArquivos = 1819

const porSlug = new Map(songs.map((s) => [s.slug, s]))

export function getSong(slug) {
  return porSlug.get(slug)
}

// Um Intl.Collator so, reaproveitado. Chamar localeCompare a cada comparacao
// cria um collator por chamada e custava 10 ms sozinho, so para ordenar.
const colator = new Intl.Collator('pt-BR')

export const artists = [...new Set(songs.map((s) => s.artist))].sort(colator.compare)

export const categorias = [...new Set(songs.map((s) => s.categoria))].sort()

// Vitrine da home. A ordem do acervo e alfabetica, e alfabetica a home abriria
// com "1 Tm 3.16" e "5 Paes e 2 Peixinhos". Esta lista e escolhida a mao, com
// louvor que a igreja canta. Para trocar, e so mexer nos slugs.
// Regra: so Multitrack aqui. A home diz, embaixo da grade, que toda musica tem
// os nove canais - e um VS MP3 no meio faria dessa frase uma mentira.
const DESTAQUE = [
  'ousado-amor-vigilia-dos-asafes',
  'bondade-de-deus-isaias-saad',
  'lugar-secreto-gabriela-rocha',
  'grandes-coisas-fernandinho',
  'so-tu-es-santo-morada',
  'yeshua-casa-worship',
  'nada-alem-do-sangue-fernandinho',
  'raridade-anderson-freire',
  'a-casa-e-sua-casa-worship',
  'caminho-no-deserto-fernandinho',
  'deus-de-promessas-toque-no-altar',
  'rendido-estou-aline-barros',
  'ruja-o-leao-fhop-music',
  'atos-2-gabriela-rocha',
  'me-atraiu-gabriela-rocha',
  'digno-e-o-cordeiro-diante-do-trono',
  'santo-eli-soares',
  'holy-forever-bethel-music',
  'jireh-maverick-city',
  'reckless-love-bethel-music',
  'preciso-de-ti-lagoinha-worship',
  'tudo-e-teu-morada',
  'galileu-fernandinho',
  'pai-nosso-bethel-music',
]

export const destaques = DESTAQUE.map((slug) => getSong(slug)).filter(Boolean)

export function relatedSongs(song, n = 6) {
  const sameArtist = songs.filter((s) => s.artist === song.artist && s.slug !== song.slug)
  const sameCat = songs.filter(
    (s) => s.categoria === song.categoria && s.artist !== song.artist && s.slug !== song.slug
  )
  return [...sameArtist, ...sameCat].slice(0, n)
}
