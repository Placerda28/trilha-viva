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
  const base = tone === 'light' ? 'rgba(255,255,255,.30)' : '#C9CCD2'
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
            background: CHANNELS[i].cue ? (tone === 'light' ? '#FF5566' : '#E5152D') : base,
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
          light ? 'text-white/50' : 'text-ink-muted'
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
          light ? 'text-white/55' : 'text-ink-muted'
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
  // Um VS em MP3 e uma mixagem so. Mostrar os nove canais em cima dele seria
  // prometer o que o arquivo nao tem, entao o painel mostra a faixa unica.
  const canais = song?.tipo === 'VS MP3' ? [{ name: 'mixagem' }] : CHANNELS
  return (
    <div className={`panel overflow-hidden ${className}`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold leading-tight">{song.title}</p>
          <p className="mt-1 truncate text-[13.5px] text-white/50">{song.artist}</p>
        </div>
        <p className="figs shrink-0 text-[13px] text-white/55">
          {song?.tipo === 'VS MP3' ? 'faixa única' : `${CHANNELS.length} canais`}
        </p>
      </div>

      <ul className="divide-y divide-white/[.07]">
        {canais.map((c, i) => (
          <li key={c.name} className="flex items-center gap-4 px-5 py-2.5">
            <span
              className={`h-[7px] w-[7px] shrink-0 ${
                c.cue ? 'bg-signal-lite' : 'bg-white/25'
              } ${c.name === 'clique' ? 'animate-tick' : ''}`}
            />
            <span
              className={`w-[76px] shrink-0 text-[13.5px] ${
                c.cue ? 'font-semibold text-signal-lite' : 'text-white/70'
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
                    background: c.cue ? 'rgba(255,85,102,.95)' : 'rgba(255,255,255,.22)',
                  }}
                />
              ))}
            </span>
            <span className="hidden w-[46px] shrink-0 text-right text-[12px] text-white/50 sm:block">
              {c.cue ? 'fone' : 'PA'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Versao compacta da sessao, para a primeira tela do celular: os cinco
 * primeiros canais com o desenho de onda de cada um e uma linha com os que
 * faltam. Mostra, sem precisar ler, que e multitrack (canais separados, com
 * clique e guia) e nao playback. Nao inventa dado: os canais sao os mesmos
 * nove que valem para todo multitrack do pacote.
 */
export function SessionMini({ song, visible = 5, className = '' }) {
  const hs = heights(song?.seed ?? 11)
  const mostrados = CHANNELS.slice(0, visible)
  const resto = CHANNELS.slice(visible)
  return (
    <div
      className={`overflow-hidden rounded-lg border border-white/15 bg-ink/80 text-white ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <p className="min-w-0 truncate text-[14px] font-bold leading-tight">
          {song.title}
          <span className="font-normal text-white/60"> de {song.artist}</span>
        </p>
        <p className="figs shrink-0 text-[12.5px] text-white/60">{CHANNELS.length} canais</p>
      </div>
      <ul className="divide-y divide-white/[.07]">
        {mostrados.map((c, i) => (
          <li key={c.name} className="flex items-center gap-3 px-4 py-[7px]">
            <span
              className={`h-[6px] w-[6px] shrink-0 ${c.cue ? 'bg-signal-lite' : 'bg-white/30'} ${
                c.name === 'clique' ? 'animate-tick' : ''
              }`}
              aria-hidden="true"
            />
            <span
              className={`w-[62px] shrink-0 text-[13px] leading-none ${
                c.cue ? 'font-semibold text-signal-lite' : 'text-white/75'
              }`}
            >
              {c.name}
            </span>
            <span
              className="flex h-3.5 min-w-0 flex-1 items-center gap-[2px] overflow-hidden"
              aria-hidden="true"
            >
              {Array.from({ length: 64 }).map((_, j) => (
                <span
                  key={j}
                  className="w-[3px] shrink-0"
                  style={{
                    height: `${sampleHeight(c, i, j, hs[i])}%`,
                    background: c.cue ? 'rgba(255,85,102,.95)' : 'rgba(255,255,255,.26)',
                  }}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
      {resto.length > 0 && (
        <p className="border-t border-white/10 px-4 py-2 text-[12.5px] text-white/60">
          <span className="font-semibold text-white/85">+ {resto.length} canais</span>:{' '}
          {resto
            .map((c) => c.name)
            .join(', ')
            .replace(/, ([^,]*)$/, ' e $1')}
        </p>
      )}
    </div>
  )
}
