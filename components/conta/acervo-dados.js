// Peças puras da lista "Minhas VS": filtros, rótulos e a ordem dos tons.
// Sem JSX nem Next, para o teste rodar no Node puro.

export const PAGINA = 40

export const semAcento = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Faixas do filtro de BPM. "Até 80" inclui o 80; "80 a 110" é de 81 a 110.
export const FAIXAS_BPM = [
  ['lento', 'Até 80'],
  ['medio', '80 a 110'],
  ['rapido', 'Acima de 110'],
]
export const faixaDoBpm = (bpm) => (bpm <= 80 ? 'lento' : bpm <= 110 ? 'medio' : 'rapido')

const NOTAS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
const raiz = (t) => /^[A-G][#b]?/.exec(t)?.[0] ?? t

// Tons que existem no acervo (campo `tom` das variantes), na ordem de C a B,
// maior antes do menor.
export function tonsDoAcervo(songs) {
  const tons = new Set()
  for (const s of songs) for (const v of s.variantes) if (v.tom) tons.add(v.tom)
  const pos = (t) => {
    const i = NOTAS.indexOf(raiz(t))
    return i < 0 ? NOTAS.length : i
  }
  return [...tons].sort((a, b) => pos(a) - pos(b) || a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
}

// "A Casa É Sua" -> "CS"; "1000 Graus" -> "GR". Duas letras das primeiras palavras com mais de 2 letras.
export function sigla(titulo) {
  const t = String(titulo || '')
  const letras = t
    .replace(/^\d+\s*/, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return letras || t.slice(0, 2).toUpperCase()
}

// "Tom A · 74 BPM", ou "3 versões" quando a música tem mais de um arquivo.
// Campo sem dado não aparece.
export function detalheDaMusica(musica) {
  if (musica.variantes.length > 1) return `${musica.variantes.length} versões`
  const v = musica.variantes[0]
  return [v?.tom && `Tom ${v.tom}`, v?.bpm && `${v.bpm} BPM`].filter(Boolean).join(' · ')
}

export function rotuloDaVersao(v, i) {
  const partes = []
  if (v.versao) partes.push(v.versao)
  if (v.tom) partes.push('tom ' + v.tom)
  if (v.bpm) partes.push(v.bpm + ' BPM')
  if (v.tipo === 'VS MP3') partes.push('playback')
  return partes.length ? partes.join(' · ') : 'Versão ' + (i + 1)
}

// Casa uma música com a busca e os filtros. `baixados` é um Map slug -> registro.
export function casaComFiltros(s, { busca, artista, tom, bpm, mostrar }, baixados) {
  if (artista && s.artist !== artista && s.tambem !== artista) return false
  if (tom && !s.variantes.some((v) => v.tom === tom)) return false
  if (bpm && !s.variantes.some((v) => v.bpm && faixaDoBpm(Number(v.bpm)) === bpm)) return false
  if (mostrar === 'baixadas' && !baixados.has(s.slug)) return false
  if (mostrar === 'novas' && baixados.has(s.slug)) return false
  return !busca || semAcento(s.title).includes(busca) || semAcento(s.artist).includes(busca)
}

// Mensagens de /acervo?aviso=… (o /api/baixar manda a pessoa de volta com uma
// destas chaves quando não entrega o arquivo).
export function textoDoAviso(chave, { limite, volta }) {
  const avisos = {
    cota: `Você já baixou ${limite} músicas hoje. O limite volta ${volta}. O acervo é seu para sempre, não precisa correr.`,
    suspenso: 'Este acesso está suspenso. Fale com o suporte.',
    'sem-compra': 'Não encontramos uma compra nesta conta.',
    preparando: 'O acervo ainda está sendo preparado. Volte em breve.',
    'nao-encontrada': 'Não encontramos essa música. Se o link veio de algum lugar, avise o suporte.',
    'sem-arquivo': 'Essa música está sem arquivo no momento. Avise o suporte.',
    falhou: 'Não conseguimos abrir esse arquivo agora. Tente de novo em instantes.',
    'outro-site': 'Para baixar, clique na música aqui em Minhas VS.',
  }
  return avisos[chave] || ''
}
