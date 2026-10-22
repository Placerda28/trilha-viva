const plain = s => s.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const rules = [
  ['Clique', 'clic clik click clique metronome metronomo met'], ['Guia', 'guide guia cues'],
  ['Bateria', 'drums drum drumm bateria bat kick snare overhead cx caixa hat hihat chimbal virada viradas batera tom toms room rooms oh cymbal cymbals prato pratos kit'], ['Baixo', 'bass baixo bajo synthbass sub'],
  ['Teclado / Piano', 'keys piano acpiano teclado rhodes arp arps wurli bel bell bells sinos'],
  // Decisão do Paulo (21/10): estes instrumentos aparecem separados, cada um com o próprio nome.
  ['Órgão', 'organ orgao hammond'], ['Sintetizador', 'synth synths sinthy synt'], ['Mellotron', 'mellotron'],
  ['Banjo', 'banjo'], ['Bandolim', 'mandolin bandolim'], ['Dulcimer', 'dulcimer'], ['Lap Steel', 'lap'],
  ['Guitarra / Violão', 'gt gtr guitar guitars guitarra eg ag violao ac acg acoustic nylon egt elec electric'], ['Pads', 'pad pads softpad'],
  ['Cordas', 'strings cordas sting stings violin violino violinos cello'], ['Sopros', 'brass horns sopros metais sax trompete trombone'],
  ['Percussão', 'perc percussion percussao shaker tambourine pandeiro conga ganza meia tambores'],
  ['Backing vocals', 'bv bvs bgv bgvs backs backing backings oohs harmony coral coro choir alto soprano tenor gang'], ['Vocal principal', 'vox vocal vocals lead voz vozes'],
  // Por último: "Backs fx" é backing vocal, não efeito.
  ['Loops', 'loop loops'], ['Efeitos', 'fx efeito efeitos'],
]
export function channel(name) {
  const base = plain(name.split(/[\\/]/).at(-1).replace(/\.[^.]+$/, ''))
    .replace(/\b(?:tom|key)\s*[:=]?\s*(?:[a-g][#b]?|do|re|mi|fa|sol|la|si)(?:m|\s+menor|\s+maior)?(?=$|[^a-z#])/g, '')
  const tokens = base.split(/[^a-z]+/).filter(Boolean)
  if (/^(?:vocoder|stems|mix|full)$/.test(tokens[0])) return null
  // "Loop synth", "FX guitar": a faixa é o loop/efeito, não o instrumento.
  if (/^loops?$/.test(tokens[0])) return 'Loops'
  if (/^(?:fx|efeitos?)$/.test(tokens[0])) return 'Efeitos'
  // Bip como sufixo marca a versão da faixa, não o instrumento (ACG_bip, LOOP_bip).
  const found = list => rules.find(([, words]) => words.split(' ').some(w => list.includes(w)))?.[0]
  // Plural/singular solto ("1CLICKS", "2GUIAS", "STRING") só depois do casamento exato.
  const flex = tokens.flatMap(t => [t.endsWith('s') ? t.slice(0, -1) : t + 's'])
  return found(tokens) ?? found(flex) ?? (tokens[0] === 'bip' ? 'Clique' : null)
}
export function audioFiles(entries) {
  return entries.filter(e => !e.directory && !/(^|[\\/])(?:__MACOSX(?:[\\/]|$)|\.DS_Store(?:[\\/]|$)|\._)/i.test(e.name)
    && /\.(wav|mp3|aif|aiff|flac|m4a)$/i.test(e.name))
}
export function extractNames(names) {
  const bpms = new Set(), keys = new Set()
  const key = '(?:[A-Ga-g][#b]?|[Dd][óo]|[Rr][ée]|[Mm]i|[Ff][áa]|[Ss]ol|[Ll][áa]|[Ss]i)(?:m|\\s+menor|\\s+maior)?'
  for (const name of names) {
    for (const m of name.matchAll(/\b(\d{2,3}(?:[.,]\d+)?)\s*bpm\b/gi)) {
      const n = Number(m[1].replace(',', '.')); if (n >= 50 && n <= 200) bpms.add(n)
    }
    for (const part of name.split(/[\\/]/)) {
      const clean = part.replace(/\.(zip|rar|wav|mp3|aif|aiff|flac|m4a)$/i, '')
      const fields = clean.split(/\s+-\s+/).slice(1)
      const explicit = [...clean.matchAll(new RegExp('\\b(?:tom|key)\\s*[:=]?\\s*(' + key + ')(?=$|[^\\p{L}#])', 'giu'))].map(m=>m[1])
      // Faixas exportadas por separadores de stems: "...-guitars-F# minor-145bpm-440hz".
      for (const m of clean.matchAll(/(?:^|[-_\s])([A-G][#b]?)\s+(minor|major)(?=$|[-_\s])/g)) explicit.push(m[1] + (m[2] === 'minor' ? ' menor' : ''))
      for (const field of [...fields, ...explicit]) {
        if (!new RegExp('^' + key + '$', 'i').test(field.trim())) continue
        const s = plain(field.trim()), minor = /menor$|m$/.test(s)
        const root = s.replace(/\s+(menor|maior)$/, '').replace(/m$/, '')
        const note = ({do:'C',re:'D',mi:'E',fa:'F',sol:'G',la:'A',si:'B'})[root] ?? root[0].toUpperCase() + root.slice(1)
        keys.add(note + (minor ? 'm' : ''))
      }
    }
  }
  return {bpm: bpms.size === 1 ? [...bpms][0] : null, tom: keys.size === 1 ? [...keys][0] : null,
    conflicts: [...(bpms.size > 1 ? ['bpm_conflitante_nome'] : []), ...(keys.size > 1 ? ['tom_conflitante_nome'] : [])]}
}
export const fixedSlugs = ['galileu-fernandinho', 'nada-alem-do-sangue-fernandinho',
  'dono-da-minha-afeicao-fhop-music', 'unico-fernandinho', 'nunca-foi-sobre-nos-doxologia-thamires-garcia',
  'a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada']
export function selectPilot(map, fixed = fixedSlugs) {
  let seed = 20261021
  const pool = Object.keys(map).filter(s=>!fixed.includes(s)).sort()
  for (let i=pool.length-1;i>0;i--) {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0
    const j = seed % (i+1); [pool[i],pool[j]] = [pool[j],pool[i]]
  }
  const rar = pool.filter(s=>map[s].some(p=>/\.rar$/i.test(p))).slice(0,5)
  return [...fixed, ...rar, ...pool.filter(s=>!rar.includes(s)).slice(0,20-rar.length)]
}
