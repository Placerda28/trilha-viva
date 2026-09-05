import Link from 'next/link'

// Os canais que vêm em toda multitrack do pacote. É verdade para qualquer
// música do acervo, então pode aparecer em qualquer faixa sem inventar dado.
export const CHANNELS = [
  { name: 'clique', cue: true },
  { name: 'guia', cue: true },
  { name: 'bateria' },
  { name: 'baixo' },
  { name: 'teclado' },
  { name: 'guitarra' },
  { name: 'pads' },
  { name: 'vocal' },
  { name: 'backing' },
]

// Alturas estáveis por música: mesma faixa, mesmo desenho, sempre.
function heights(seed) {
  return CHANNELS.map((_, i) => 0.35 + (((seed >> (i * 2)) % 9) / 9) * 0.65)
}

// Cada canal tem um desenho próprio, porque na vida real ele é diferente:
// o clique é uma batida seca e regular, a guia são frases faladas soltas no meio
// da música, e os instrumentos tocam contínuo.
function sampleHeight(channel, row, j, amp) {
  if (channel.name === 'clique') return j % 4 === 0 ? 100 : 8
  if (channel.name === 'guia') {
    const bloco = j % 15
    return bloco < 4 ? 45 + ((j * 37) % 45) : 6
  }
  const onda = 0.42 + Math.abs(Math.sin((j + row * 4) * 0.78)) * 0.58
  const grao = ((j * 53 + row * 17) % 11) / 40
  return Math.min(100, Math.max(20, Math.round(amp * 100 * (onda - grao) * 1.45)))
}

/** Miniatura da sessão: uma barra por canal, as duas primeiras são clique e guia. */
export function ChannelStrip({ seed = 7, tone = 'ink', className = '', height = 22 }) {
  const hs = heights(seed)
  const base = tone === 'light' ? 'rgba(255,255,255,.34)' : '#B9C0D2'
  return (
    <span
      className={`inline-flex items-end gap-[3px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {hs.map((h, i) => (
        <span
          key={i}
          className="w-[3px]"
          style={{
            height: `${Math.round(h * 100)}%`,
            background: CHANNELS[i].cue ? '#F2A93B' : base,
          }}
        />
      ))}
    </span>
  )
}

/** Uma linha do setlist. */
export function TrackRow({ song, index, tone = 'ink', href }) {
  const light = tone === 'light'
  return (
    <Link
      href={href || `/musicas/${song.slug}`}
      className={`group flex items-center gap-4 px-3 py-3.5 transition-colors sm:gap-6 sm:px-4 ${
        light ? 'hover:bg-white/[.07]' : 'hover:bg-mist'
      }`}
    >
      <span
        className={`figs w-6 shrink-0 text-[13px] font-semibold ${
          light ? 'text-white/35' : 'text-ink-faint'
        }`}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[16px] font-semibold leading-tight sm:text-[17px] ${
            light ? 'text-white' : 'text-ink'
          }`}
        >
          {song.title}
        </span>
        <span
          className={`mt-1 block truncate text-[13.5px] leading-tight ${
            light ? 'text-white/50' : 'text-ink-muted'
          }`}
        >
          {song.artist}
        </span>
      </span>

      <span
        className={`hidden shrink-0 text-[13px] sm:block ${
          light ? 'text-white/45' : 'text-ink-muted'
        }`}
      >
        {song.categoria}
      </span>

      <ChannelStrip seed={song.seed} tone={light ? 'light' : 'ink'} className="shrink-0" />
    </Link>
  )
}

/** O setlist inteiro, dividido por fios. */
export function TrackList({ songs, tone = 'ink', className = '', start = 0 }) {
  const light = tone === 'light'
  return (
    <div className={`divide-y ${light ? 'divide-white/10' : 'divide-line'} ${className}`}>
      {songs.map((s, i) => (
        <TrackRow key={s.slug} song={s} index={start + i} tone={tone} />
      ))}
    </div>
  )
}

/** Bloco da sessão aberta: os nove canais com nome, como no programa. */
export function SessionPanel({ song, className = '' }) {
  const hs = heights(song?.seed ?? 11)
  return (
    <div className={`panel overflow-hidden ${className}`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold leading-tight">{song.title}</p>
          <p className="mt-1 truncate text-[13.5px] text-white/50">{song.artist}</p>
        </div>
        <p className="figs shrink-0 text-[13px] text-white/45">{CHANNELS.length} canais</p>
      </div>

      <ul className="divide-y divide-white/[.07]">
        {CHANNELS.map((c, i) => (
          <li key={c.name} className="flex items-center gap-4 px-5 py-2.5">
            <span
              className={`h-[7px] w-[7px] shrink-0 ${
                c.cue ? 'bg-signal' : 'bg-white/25'
              } ${c.name === 'clique' ? 'animate-tick' : ''}`}
            />
            <span
              className={`w-[76px] shrink-0 text-[13.5px] ${
                c.cue ? 'font-semibold text-signal' : 'text-white/70'
              }`}
            >
              {c.name}
            </span>
            <span className="flex h-4 flex-1 items-center gap-[2px] overflow-hidden">
              {Array.from({ length: 46 }).map((_, j) => (
                <span
                  key={j}
                  className="w-[3px] shrink-0"
                  style={{
                    height: `${sampleHeight(c, i, j, hs[i])}%`,
                    background: c.cue ? 'rgba(242,169,59,.8)' : 'rgba(255,255,255,.22)',
                  }}
                />
              ))}
            </span>
            <span className="hidden w-[46px] shrink-0 text-right text-[12px] text-white/35 sm:block">
              {c.cue ? 'fone' : 'PA'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
