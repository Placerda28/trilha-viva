import { site, priceBRL } from '@/lib/site'

// Textos da página de música montados por regra, a partir dos dados reais da
// ficha (lib/ficha.js). Cada frase tem 3 variações, e a escolha sai do slug:
// a mesma música mostra sempre o mesmo texto, e músicas vizinhas do mesmo
// artista não repetem o parágrafo inteiro (o Google desconfia de página igual).

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

// `sal` muda a escolha de cada bloco, senão todas as frases cairiam na mesma variação.
const escolher = (slug, sal, opcoes) => opcoes[hash(`${sal}:${slug}`) % opcoes.length]

const tem = (ficha, canal) => Boolean(ficha?.canais?.includes(canal))

function duracaoTexto(seg) {
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}

/** Itens da linha de destaque: "72 BPM · Tom original: A · 5:12 · 11 canais". */
export function linhaDaFicha(ficha) {
  if (!ficha) return []
  return [
    ficha.bpm && `${ficha.bpm} BPM`,
    ficha.tom && `Tom original: ${ficha.tom}`,
    ficha.duracaoSeg && duracaoTexto(ficha.duracaoSeg),
    ficha.canais?.length && `${ficha.canais.length} canais`,
  ].filter(Boolean)
}

/** ISO 8601 para o MusicRecording (PT5M12S). */
export function duracaoIso(seg) {
  return seg ? `PT${Math.floor(seg / 60)}M${seg % 60}S` : undefined
}

// "Clique, guia e 11 canais" só promete o que o arquivo tem.
function resumoDosCanais(ficha) {
  if (!ficha?.canais?.length) return 'clique, guia e canais'
  const partes = [tem(ficha, 'Clique') && 'clique', tem(ficha, 'Guia') && 'guia', `${ficha.canais.length} canais`]
  const lista = partes.filter(Boolean)
  return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista.at(-1)}` : lista[0]
}

const MARCA = ' | Trilha Viva'
const LIMITE_TITULO = 60

/** Título e descrição do Google (item 2.4 do plano). VS MP3 fica de fora: a página tem os próprios. */
export function metaDaMusica(song, ficha, { previa = false } = {}) {
  const nome = `${song.title} – ${song.artist}`
  let base
  if (ficha?.bpm && ficha?.tom) base = `${nome}: VS, BPM e Tom`
  else if (ficha?.bpm) base = `${nome}: VS e BPM`
  else base = `VS ${nome} (multitrack com clique)`
  // Longo demais: corta a marca antes de cortar o nome da música.
  const titulo = base.length <= LIMITE_TITULO ? base + MARCA : base

  // Só promete a prévia quando ela existe (item 2.3, fica para depois).
  const ouca = previa ? ' Ouça a prévia.' : ''
  const pacote = `${site.totalTracks.toLocaleString('pt-BR')} VS por ${priceBRL(site.price)}`
  const canais = `${resumoDosCanais(ficha)}${ficha?.canais?.length ? '' : ' separados'}`
  const Canais = canais[0].toUpperCase() + canais.slice(1)
  let descricao
  if (ficha?.bpm && ficha?.tom) {
    descricao = `VS de ${song.title} (${song.artist}): ${ficha.bpm} BPM e tom original ${ficha.tom}, ajustáveis na sua DAW. ${Canais}.${ouca} ${pacote}.`
  } else if (ficha?.bpm) {
    descricao = `VS de ${song.title} (${song.artist}): ${ficha.bpm} BPM, ajustável na sua DAW. ${Canais}.${ouca} ${pacote}.`
  } else {
    descricao = `VS de ${song.title} (${song.artist}) com ${resumoDosCanais(ficha)} separados.${ouca} No pacote com ${pacote}, pagamento único.`
  }
  return { titulo, descricao }
}

const DAW = [
  'Se o seu ministro canta em outro tom ou a equipe prefere outro andamento, dá para mudar os dois no programa que você usa para rodar a VS (DAW), como REAPER, Ableton Live ou Prime. Para o andamento, aplique a mudança em todas as faixas juntas, inclusive no clique, para tudo continuar sincronizado. Para o tom, transponha os instrumentos e os vocais, mas não o clique nem a guia.',
  'Tom e andamento não ficam presos à gravação: o programa que roda a VS (REAPER, Ableton Live, Prime e outros) muda os dois. O andamento se ajusta em todas as faixas ao mesmo tempo, com o clique junto, senão a banda sai do tempo. Já o tom se muda só nos instrumentos e nas vozes; clique e guia ficam como estão.',
  'Precisa de outro tom para o seu ministro ou de um andamento mais calmo para a equipe? A DAW resolve: REAPER, Ableton Live e Prime fazem as duas coisas. Mude o andamento em todas as faixas de uma vez, incluindo o clique, para nada sair do sincronismo. Na hora de transpor, deixe o clique e a guia de fora e mexa só nos instrumentos e nos vocais.',
]

/** H2 e os dois parágrafos que respondem "[música] bpm" (item 2.2, bloco 6). */
export function blocoBpm(song, ficha) {
  const guia = !ficha?.canais || tem(ficha, 'Guia')
  const clique = !ficha?.canais || tem(ficha, 'Clique')
  // "Clique nesse andamento" só vale quando o BPM saiu do próprio arquivo.
  const cliqueNoBpm = ficha?.fonteBpm === 'arquivo'
  let abertura
  if (ficha?.bpm) {
    abertura = `${song.title}, de ${song.artist}, tem andamento de ${ficha.bpm} BPM`
    abertura += ficha.tom ? ` e está no tom de ${ficha.tom} na versão original.` : ' na versão original.'
  } else if (ficha?.tom) {
    abertura = `${song.title}, de ${song.artist}, está no tom de ${ficha.tom} na versão original.`
  } else {
    abertura = `${song.title}, de ${song.artist}, vem no acervo como multitrack, com cada instrumento em um arquivo.`
  }
  let apoio = ''
  if (clique && guia) {
    apoio = cliqueNoBpm
      ? ' A multitrack vem com clique nesse andamento e com guia falada, então a banda entra junto sem precisar contar.'
      : ' A multitrack vem com clique e com guia falada, então a banda entra junto sem precisar contar.'
  } else if (clique) {
    apoio = cliqueNoBpm ? ' A multitrack vem com clique nesse andamento, para a banda tocar junto.' : ' A multitrack vem com clique, para a banda tocar junto.'
  }
  return {
    titulo: ficha?.bpm ? `BPM e tom de ${song.title}` : `Sobre a multitrack de ${song.title}`,
    paragrafos: [abertura + apoio, escolher(song.slug, 'daw', DAW)],
  }
}

const LENTA = [
  'Por ser uma música lenta, ela pede espaço: o pad segura a dinâmica nas partes mais calmas, e vale ensaiar as entradas da guia nos trechos livres, onde a ministração costuma se estender.',
  'Num andamento lento assim, quem sustenta o momento é o pad. Combine com a equipe como ficam as partes livres: a guia avisa a próxima parte, mas é o ministro quem decide quando seguir.',
  'Músicas lentas como esta funcionam bem na ministração. Deixe o pad um pouco mais presente no PA e confira no ensaio onde a guia entra, para ninguém se perder nas repetições.',
]
const MEDIA = [
  'O andamento médio deixa a música confortável para a congregação cantar junto, sem correr e sem arrastar.',
  'É um andamento médio, do tipo que a igreja inteira acompanha com facilidade: bom para o meio do louvor.',
  'Com andamento médio, ela encaixa bem em qualquer momento congregacional e é fácil de ensaiar com a banda.',
]
const RAPIDA = [
  'É música de celebração, com andamento rápido: o baterista precisa do clique bem alto no fone para segurar o tempo do começo ao fim.',
  'Num andamento rápido como este, o clique é o melhor amigo do baterista. Deixe-o bem alto no fone, porque a música não perdoa atraso.',
  'Andamento rápido pede banda firme no tempo. Com o clique alto no fone do baterista, a celebração não acelera nem perde força.',
]
const COMPLEMENTO = [
  'Os canais de {x} completam a banda que não tem esses músicos: é só deixar ligados no PA.',
  'Se a sua igreja não tem quem toque {x}, esses canais fazem esse papel; os outros você muta à vontade.',
  'Quem não tem {x} na equipe usa esses canais da própria multitrack e mantém o arranjo completo.',
]
const BACKING = [
  'O canal de backing vocals ajuda muito em equipe pequena: um ou dois cantores soam como um coro.',
  'Com o backing vocal separado, uma equipe pequena de louvor ganha o apoio das vozes sem precisar de mais gente.',
  'Equipe de vozes reduzida? Deixe o backing vocal da multitrack ligado e o ministro fica bem acompanhado.',
]
const MOMENTO = {
  Adoração: [
    'Ela cabe no momento de adoração, quando a igreja desacelera para cantar para Deus.',
    'É escolha natural para a adoração, depois das músicas mais animadas.',
    'Funciona bem no bloco de adoração do culto, com a congregação mais recolhida.',
  ],
  Celebração: [
    'Ela abre bem o culto ou puxa o bloco de celebração.',
    'É uma boa escolha para o começo do louvor, quando a igreja está chegando e precisa de energia.',
    'Cabe no bloco de celebração, para levantar a igreja.',
  ],
  Ministração: [
    'Ela serve para a ministração, quando o momento pede mais tempo e menos pressa.',
    'É música de ministração: dá para estender as partes enquanto o ministro conduz.',
    'Use no tempo de ministração, deixando a banda acompanhar o que o ministro pedir.',
  ],
}

/** De 2 a 3 frases de uso escolhidas pelos dados (item 2.2, bloco 8). */
export function frasesDeUso(song, ficha) {
  const frases = []
  const bpm = ficha?.bpm
  if (bpm) frases.push(escolher(song.slug, 'ritmo', bpm <= 80 ? LENTA : bpm <= 115 ? MEDIA : RAPIDA))
  const extras = ['Sopros', 'Cordas', 'Percussão'].filter((c) => tem(ficha, c)).map((c) => c.toLowerCase())
  if (extras.length) {
    const lista = extras.length > 1 ? `${extras.slice(0, -1).join(', ')} e ${extras.at(-1)}` : extras[0]
    frases.push(escolher(song.slug, 'extras', COMPLEMENTO).replace('{x}', lista))
  }
  if (tem(ficha, 'Backing vocals')) frases.push(escolher(song.slug, 'backing', BACKING))
  // "Congregacional" é o valor padrão do catálogo (campo vazio): só entram as categorias de verdade.
  if (MOMENTO[song.categoria]) frases.push(escolher(song.slug, 'momento', MOMENTO[song.categoria]))
  return frases.slice(0, 3)
}
