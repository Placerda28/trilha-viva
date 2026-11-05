'use client'

import { useEffect, useRef } from 'react'
import { corMetal } from '@/lib/afiliados-painel'
import Medalha from '../painel/Medalha'

// Selo de nível como moeda de metal em CSS 3D (sem biblioteca): frente, verso
// e uma borda feita de camadas empilhadas em Z. O HTML já chega pronto e
// parado; o JavaScript só acrescenta o movimento por cima:
//   - gira uma volta quando entra na tela (e quando o `grau` muda);
//   - inclina com o dedo/mouse (arrastar) e com o giroscópio, quando existir;
//   - um toque gira de novo.
// Com `prefers-reduced-motion` nada disso liga: a moeda fica parada.
const CAMADAS = 6
const limitar = (v, max) => Math.max(-max, Math.min(max, v))

export default function Moeda3D({ cor, grau = 1, tamanho = 88, className = '', titulo = '' }) {
  const raiz = useRef(null)
  const corpo = useRef(null)
  const giro = useRef(null)
  const primeira = useRef(true)
  const metal = corMetal(cor)

  const girar = () => {
    const el = giro.current
    if (!el) return
    el.classList.remove('moeda-girando')
    void el.offsetWidth // reinicia a animação
    el.classList.add('moeda-girando')
  }

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    girar()
  }, [grau])

  useEffect(() => {
    const el = raiz.current
    const c = corpo.current
    if (!el || !c || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    // Uma atualização por quadro (como no "Optimized Tilt Card" do 21st.dev):
    // vários pointermove no mesmo quadro viram uma escrita só.
    let quadro = 0
    let pend = null
    const inclinar = (rx, ry) => {
      pend = [rx, ry]
      if (quadro) return
      quadro = requestAnimationFrame(() => {
        quadro = 0
        const [x, y] = pend
        c.style.setProperty('--rx', `${x.toFixed(1)}deg`)
        c.style.setProperty('--ry', `${y.toFixed(1)}deg`)
        c.style.setProperty('--bx', `${(50 + y * 1.7).toFixed(0)}%`)
        c.style.setProperty('--by', `${(50 - x * 1.7).toFixed(0)}%`)
      })
    }
    let segura = 0 // no toque, o brilho e a inclinação ficam 350 ms depois de soltar

    // Giroscópio: no Android vale direto; no iPhone o aparelho pede permissão,
    // que só pode ser pedida num toque (feito em aoPressionar).
    let sensor = false
    const aoMexer = (e) => {
      if (e.gamma == null || e.beta == null) return
      inclinar(limitar((e.beta - 50) * -0.35, 16), limitar(e.gamma * 0.55, 24))
    }
    const ligarSensor = () => {
      if (sensor) return
      sensor = true
      c.dataset.sensor = '1'
      window.addEventListener('deviceorientation', aoMexer, { passive: true })
    }
    const desligarSensor = () => {
      sensor = false
      delete c.dataset.sensor
      window.removeEventListener('deviceorientation', aoMexer)
    }

    let jaGirou = false
    const visao = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!jaGirou && e.intersectionRatio >= 0.6) {
            jaGirou = true
            girar()
          }
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
            ligarSensor()
          }
        } else desligarSensor()
      },
      { threshold: [0, 0.6] },
    )
    visao.observe(el)

    // Arrastar (dedo ou mouse): a moeda acompanha e volta ao repouso ao soltar.
    let arrastando = false
    let ox = 0
    let oy = 0
    let moveu = false
    const aoPressionar = (e) => {
      window.clearTimeout(segura)
      arrastando = true
      moveu = false
      ox = e.clientX
      oy = e.clientY
      c.dataset.arrastando = '1'
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function' && !sensor) {
        DeviceOrientationEvent.requestPermission()
          .then((r) => r === 'granted' && ligarSensor())
          .catch(() => {})
      }
    }
    const aoArrastar = (e) => {
      if (e.pointerType === 'mouse' && !arrastando) {
        // Mouse: inclina só de passar por cima.
        const r = el.getBoundingClientRect()
        inclinar(limitar(((r.top + r.height / 2 - e.clientY) / r.height) * 34, 22), limitar(((e.clientX - (r.left + r.width / 2)) / r.width) * 44, 28))
        return
      }
      if (!arrastando) return
      const dx = e.clientX - ox
      const dy = e.clientY - oy
      if (Math.abs(dx) + Math.abs(dy) > 6) moveu = true
      inclinar(limitar(-dy * 0.6, 40), limitar(dx * 0.9, 70))
    }
    const aoSoltar = (e) => {
      if (!arrastando) return
      arrastando = false
      delete c.dataset.arrastando
      if (!moveu) girar()
      if (!sensor) {
        if (e.pointerType === 'touch') segura = window.setTimeout(() => inclinar(0, 0), 350)
        else inclinar(0, 0)
      }
    }
    const aoSair = () => {
      delete c.dataset.sobre
      if (!arrastando && !sensor) inclinar(0, 0)
    }
    const aoEntrar = (e) => {
      if (e.pointerType === 'mouse') c.dataset.sobre = '1'
    }

    el.addEventListener('pointerdown', aoPressionar)
    el.addEventListener('pointermove', aoArrastar)
    el.addEventListener('pointerup', aoSoltar)
    el.addEventListener('pointercancel', aoSoltar)
    el.addEventListener('pointerleave', aoSair)
    el.addEventListener('pointerenter', aoEntrar)
    return () => {
      cancelAnimationFrame(quadro)
      window.clearTimeout(segura)
      visao.disconnect()
      desligarSensor()
      el.removeEventListener('pointerdown', aoPressionar)
      el.removeEventListener('pointermove', aoArrastar)
      el.removeEventListener('pointerup', aoSoltar)
      el.removeEventListener('pointercancel', aoSoltar)
      el.removeEventListener('pointerleave', aoSair)
      el.removeEventListener('pointerenter', aoEntrar)
    }
  }, [])

  const camadas = Array.from({ length: CAMADAS }, (_, i) => i + 1)
  return (
    <div
      ref={raiz}
      className={`moeda ${className}`}
      style={{ '--t': `${tamanho}px`, '--e': metal.escuro, '--b': metal.base }}
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : 'true'}
    >
      <div ref={giro} className="moeda-giro">
        <div ref={corpo} className="moeda-corpo">
          {camadas.map((i) => (
            <span key={i} className="moeda-borda" style={{ transform: `translateZ(${-i * (tamanho / 64) * 1.1}px)` }} />
          ))}
          <span className="moeda-face">
            <Medalha cor={cor} grau={grau} tamanho={tamanho} />
            <span className="moeda-brilho" />
          </span>
          <span className="moeda-face moeda-verso" style={{ transform: `translateZ(${-(CAMADAS + 1) * (tamanho / 64) * 1.1}px) rotateY(180deg)` }}>
            <Medalha cor={cor} grau={grau} tamanho={tamanho} />
          </span>
        </div>
      </div>
    </div>
  )
}
