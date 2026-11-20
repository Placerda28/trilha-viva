'use client'

import { useEffect, useRef, useState } from 'react'
import { Icone } from './ds'

// Quadro de canais da música (MUDANÇAS §13) e, com `previa`, o player de 30 s.
//
//   <Canais musica="Ousado Amor" artista="Vigília dos Asafes" canais={lista} />          // só o quadro
//   <Canais previa pasta="/audio/previa/obediencia/" tema="escuro" ... />                 // player
//
// `canais`: [{ nome, dest: 'FONE' | 'PA', n: 0-100 (nível do medidor), sinal?: true, arq?: 'clique' }].
// `sinal` marca clique e guia (traço vermelho ao lado do nome). Sem `canais`, usa
// os 8 da prévia de Obediência. Dado de música: SÓ da lista real do catálogo
// (lib/ficha.js); o padrão existe para o player de demonstração.
//
// Player: Web Audio, um canal por mp3, todos começando no mesmo instante; o nome
// do canal liga e desliga (aria-pressed); para sozinho aos 30 s; os medidores
// sobem e descem enquanto toca; a barra vermelha mostra o progresso. Os mp3 ficam
// em `pasta` + arq + '.mp3' e só baixam no primeiro clique (~2,9 MB). Se nenhum
// arquivo existir, o player avisa e volta ao início, sem travar a página.

// Prévia: Obediência (FHOP Music), trecho 2:40–3:10 da VS. Ganho por canal: guia
// ×0,71 (-3 dB), clique 20% abaixo disso (×0,57) e instrumentos 20% acima (×0,85),
// pedido do Paulo em 20/11; a soma dos 8 fica em -2,5 dB de pico. A VS não tem vocal.
export const CANAIS_PREVIA = [
  { nome: 'Clique', dest: 'FONE', n: 62, sinal: true, arq: 'clique' },
  { nome: 'Guia', dest: 'FONE', n: 46, sinal: true, arq: 'guia' },
  { nome: 'Bateria', dest: 'PA', n: 84, arq: 'bateria' },
  { nome: 'Baixo', dest: 'PA', n: 70, arq: 'baixo' },
  { nome: 'Guitarras', dest: 'PA', n: 66, arq: 'guitarras' },
  { nome: 'Teclados', dest: 'PA', n: 58, arq: 'teclados' },
  { nome: 'Cordas e sopros', dest: 'PA', n: 44, arq: 'cordas' },
  { nome: 'Loops', dest: 'PA', n: 52, arq: 'loops' },
]
export const PASTA_PREVIA = '/audio/previa/obediencia/'
const CAPA_PREVIA = '/capas/obediencia-fhop-music.webp'
const DURACAO = 30

const TEMAS = {
  claro: {
    caixa: 'border-ink bg-white text-ink',
    linha: 'border-line',
    trilho: 'bg-line',
    medidor: 'bg-ink',
    fg2: 'text-text-4',
    fone: 'text-red-text',
    play: 'bg-ink text-white hover:bg-ink-hover active:bg-ink-pressed',
    caixaOn: 'border-ink bg-ink text-white',
    caixaOff: 'border-text-4 bg-transparent',
  },
  escuro: {
    caixa: 'border-dark-frame bg-ink text-white',
    linha: 'border-dark-line',
    trilho: 'bg-dark-pressed',
    medidor: 'bg-white',
    fg2: 'text-dark-text-3',
    fone: 'text-red-text-dark',
    play: 'bg-white text-ink hover:bg-line active:bg-line-2',
    caixaOn: 'border-white bg-white text-ink',
    caixaOff: 'border-dark-text-3 bg-transparent',
  },
}

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Canais({
  musica = 'Obediência',
  artista = 'FHOP Music',
  canais = CANAIS_PREVIA,
  tema = 'claro',
  previa = false,
  pasta = PASTA_PREVIA,
  capa = CAPA_PREVIA,
  limite,
  className = '',
}) {
  const t = TEMAS[tema] || TEMAS.claro
  const [tocando, setTocando] = useState(false)
  const [seg, setSeg] = useState(0)
  const [desligados, setDesligados] = useState({})
  const [semAudio, setSemAudio] = useState(false)
  const [carregando, setCarregando] = useState(false)
  // Web Audio: os 8 canais são baixados e decodificados antes e começam no mesmo
  // instante do relógio de áudio (start(quando)). Com 8 <audio> soltos, o celular
  // dava a partida em cada um com alguns ms de diferença e o som "flangeava".
  const ctx = useRef(null)
  const buffers = useRef(null)
  const ganhos = useRef([])
  const fontes = useRef([])
  const timer = useRef(null)
  const inicio = useRef(0)
  const desl = useRef(desligados)
  desl.current = desligados

  const parar = () => {
    clearInterval(timer.current)
    fontes.current.forEach((f) => {
      try {
        f.stop()
      } catch {
        /* já parou */
      }
    })
    fontes.current = []
  }
  useEffect(
    () => () => {
      parar()
      ctx.current?.close().catch(() => {})
    },
    []
  )

  async function tocar() {
    // O AudioContext nasce no clique (o celular só libera som com gesto da pessoa).
    if (!ctx.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx.current = new AC()
      // iPhone: Web Audio respeita a chave do silencioso; "playback" toca como o <audio> tocava
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback'
      } catch {
        /* navegador sem audioSession */
      }
    }
    const ac = ctx.current
    ac.resume().catch(() => {})
    setSemAudio(false)
    if (!buffers.current) {
      setCarregando(true)
      buffers.current = await Promise.all(
        canais.map((c) =>
          fetch(pasta + (c.arq || c.nome.toLowerCase()) + '.mp3')
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
            .then((b) => ac.decodeAudioData(b))
            .catch(() => null)
        )
      )
      setCarregando(false)
      // Todos faltando = a prévia ainda não foi enviada: avisa e desliga o player.
      if (buffers.current.every((b) => !b)) {
        buffers.current = null
        setSemAudio(true)
        return
      }
      ganhos.current = canais.map(() => {
        const g = ac.createGain()
        g.connect(ac.destination)
        return g
      })
    }
    parar()
    const comeco = seg >= DURACAO ? 0 : seg
    const quando = ac.currentTime + 0.08 // folga para os 8 começarem juntos
    fontes.current = buffers.current.map((b, i) => {
      if (!b) return null
      ganhos.current[i].gain.value = desl.current[i] ? 0 : 1
      const f = ac.createBufferSource()
      f.buffer = b
      f.connect(ganhos.current[i])
      f.start(quando, comeco, Math.max(0, DURACAO - comeco))
      return f
    }).filter(Boolean)
    inicio.current = quando - comeco
    timer.current = setInterval(() => {
      const s = Math.max(0, ac.currentTime - inicio.current)
      if (s >= DURACAO) {
        parar()
        setTocando(false)
        setSeg(DURACAO)
      } else {
        setSeg(s)
      }
    }, 200)
    setTocando(true)
    setSeg(comeco)
  }

  function alternarCanal(i) {
    const prox = { ...desligados, [i]: !desligados[i] }
    if (ganhos.current[i]) ganhos.current[i].gain.value = prox[i] ? 0 : 1
    setDesligados(prox)
  }

  const quantos = previa ? canais.length : (limite ?? canais.length)
  const visiveis = canais.slice(0, quantos)
  const resto = canais.slice(quantos).map((c) => c.nome.toLowerCase())
  const listaResto = resto.length > 1 ? resto.slice(0, -1).join(', ') + ' e ' + resto[resto.length - 1] : resto.join('')
  const parado = reduzMovimento()
  const tempo = '0:' + String(Math.floor(seg)).padStart(2, '0')

  return (
    <figure className={`m-0 w-full border ${t.caixa} ${className}`}>
      <div className={`flex items-center justify-between gap-3 border-b px-4 pb-3.5 pt-4 ${t.linha}`}>
        <div className="flex min-w-0 items-center gap-3">
          {previa && (
            <button
              type="button"
              onClick={() => (carregando ? null : tocando ? (parar(), setTocando(false)) : tocar())}
              aria-label={carregando ? 'Carregando a prévia' : tocando ? 'Pausar a prévia' : 'Tocar 30 segundos'}
              aria-busy={carregando || undefined}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-control transition-colors motion-reduce:transition-none ${t.play}`}
            >
              <Icone nome={tocando ? 'pausa' : 'play'} tamanho={20} className={carregando ? 'animate-pulse' : undefined} />
            </button>
          )}
          {previa && capa && (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura de 4 KB, sem custo no Worker
            <img src={capa} alt="" width={48} height={48} loading="lazy" decoding="async" className="h-12 w-12 shrink-0 object-cover" />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[17px] font-[650] leading-[1.25]">{musica}</strong>
            <span className={`text-[14px] ${t.fg2}`}>{artista}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={`whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.04em] tabular-nums ${t.fg2}`}>
            {canais.length} canais
          </span>
          {previa && <span className="whitespace-nowrap text-[14px] font-semibold tabular-nums">{tempo} / 0:30</span>}
        </div>
      </div>

      {previa && (
        <div aria-hidden="true" className={`relative h-[3px] ${t.trilho}`}>
          <span className="absolute inset-y-0 left-0 bg-red" style={{ width: `${(seg / DURACAO) * 100}%` }} />
        </div>
      )}

      <div role="list">
        {visiveis.map((c, i) => {
          const ligado = !desligados[i]
          const pulso = tocando && !parado ? Math.max(8, Math.min(100, c.n + Math.sin(seg * (3 + i) + i) * 22)) : c.n
          const nome = (
            <>
              <span aria-hidden="true" className={`h-4 w-[3px] shrink-0 ${c.sinal ? 'bg-red' : 'bg-transparent'}`} />
              <span className="truncate">{c.nome}</span>
            </>
          )
          return (
            <div
              role="listitem"
              key={c.nome + i}
              className={`grid min-h-11 grid-cols-[minmax(0,1fr)_minmax(48px,88px)_44px] items-center gap-3.5 border-b px-4 ${t.linha} ${ligado ? '' : 'opacity-45'}`}
            >
              {previa ? (
                <button
                  type="button"
                  onClick={() => alternarCanal(i)}
                  aria-pressed={ligado}
                  aria-label={(ligado ? 'Desligar ' : 'Ligar ') + c.nome}
                  className="flex min-h-11 min-w-0 items-center gap-2.5 text-left text-[15px] font-medium hover:underline hover:underline-offset-4"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border ${ligado ? t.caixaOn : t.caixaOff}`}
                  >
                    {ligado && <Icone nome="check" tamanho={12} traco={3} />}
                  </span>
                  {nome}
                </button>
              ) : (
                <span className="flex min-w-0 items-center gap-2.5 text-[15px] font-medium">{nome}</span>
              )}
              <span aria-hidden="true" className={`relative block h-1 ${t.trilho}`}>
                <span
                  className={`absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear motion-reduce:transition-none ${c.nome === 'Clique' ? 'bg-red' : t.medidor}`}
                  style={{ width: `${ligado ? pulso : 0}%` }}
                />
              </span>
              <span className={`text-right text-[12px] font-bold tracking-[0.06em] ${c.dest === 'FONE' ? t.fone : t.fg2}`}>{c.dest}</span>
            </div>
          )
        })}
      </div>

      {resto.length > 0 && <p className={`px-4 py-3 text-[14px] ${t.fg2}`}>{`+ ${resto.length} canais: ${listaResto}`}</p>}
      {previa && (
        <p className={`px-4 py-3 text-[14px] leading-[1.45] ${t.fg2}`} role={semAudio ? 'alert' : undefined}>
          {semAudio
            ? 'A prévia desta música ainda não está disponível.'
            : 'Prévia de 30 segundos. Toque no nome do canal para ligar ou desligar.'}
        </p>
      )}
    </figure>
  )
}
