'use client'

import { useEffect, useRef } from 'react'
import { heroGradiente as g } from '@/lib/hero-gradiente'

// Fundo animado do topo: faixas de luz diagonais que se mexem devagar.
// Desenho adaptado do preset "Prism" do Animated Gradient do Spell UI
// (https://github.com/xxtomm/spell-ui, licença MIT, (c) 2025 Spell UI), reescrito
// em WebGL 1 puro, sem biblioteca, com as cores da marca e com economia:
// metade da resolução, no máximo 1,5x de densidade, 30 quadros por segundo,
// pausa fora da tela e com a aba escondida. Se o aparelho não tiver
// WebGL ou o desenho falhar, nada acontece e fica o fundo estático em CSS.

const VERTICES = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const DESENHO = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform vec2 u_size;
uniform float u_t;
uniform vec3 u_base;
uniform vec3 u_vinho;
uniform vec3 u_vermelho;
uniform vec3 u_luz;
uniform float u_forcaVermelho;
uniform float u_forcaLuz;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res - 0.5;
  uv *= 0.00056 * u_size;
  float a = -1.3708;
  uv = mat2(cos(a), sin(a), -sin(a), cos(a)) * uv + 0.5;
  for (int k = 1; k <= 16; k++) {
    float i = float(k);
    uv.x += 0.5 / i * cos(u_t + i * 1.5 * uv.y);
    uv.y += 0.5 / i * cos(u_t + i * uv.x);
  }
  vec2 s = uv * 2.075;
  float m = 0.5 + 0.5 * sin(s.x) * cos(s.y);
  vec3 c = mix(u_base, u_vinho, smoothstep(0.3, 0.7, m));
  c = mix(c, u_vermelho, u_forcaVermelho * smoothstep(0.6, 0.9, m));
  c = mix(c, u_luz, u_forcaLuz * smoothstep(0.86, 1.0, m));
  gl_FragColor = vec4(c, 1.0);
}
`

function cor(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export default function HeroGradiente() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const area = canvas?.parentElement
    if (!canvas || !area) return

    let gl
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      })
    } catch {
      gl = null
    }
    if (!gl) return

    const shader = (tipo, fonte) => {
      const s = gl.createShader(tipo)
      gl.shaderSource(s, fonte)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = shader(gl.VERTEX_SHADER, VERTICES)
    const fs = shader(gl.FRAGMENT_SHADER, DESENHO)
    const prog = gl.createProgram()
    if (vs && fs) {
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
    }
    if (!vs || !fs || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog)
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const p = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(p)
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0)

    const u = (nome) => gl.getUniformLocation(prog, nome)
    const uRes = u('u_res')
    const uSize = u('u_size')
    const uT = u('u_t')
    gl.uniform3fv(u('u_base'), cor(g.base))
    gl.uniform3fv(u('u_vinho'), cor(g.vinho))
    gl.uniform3fv(u('u_vermelho'), cor(g.vermelho))
    gl.uniform3fv(u('u_luz'), cor(g.luz))
    gl.uniform1f(u('u_forcaVermelho'), g.forcaVermelho)
    gl.uniform1f(u('u_forcaLuz'), g.forcaLuz)

    // O efeito é borrado: metade da resolução não aparece e custa 1/4.
    const ajustar = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5
      const w = area.clientWidth
      const h = area.clientHeight
      canvas.width = Math.max(1, Math.round(w * escala))
      canvas.height = Math.max(1, Math.round(h * escala))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      // Tela estreita (celular) mostraria uma faixa só: o desenho é calculado
      // como se ela tivesse pelo menos 1000 px, para ter as mesmas faixas.
      const z = Math.max(1, 1000 / Math.max(w, 1))
      gl.uniform2f(uSize, w * z, h * z)
    }
    ajustar()
    const ro = new ResizeObserver(ajustar)
    ro.observe(area)

    // 30 quadros por segundo em qualquer aparelho: o movimento é tão lento
    // que 60 não se distingue, e custa o dobro de bateria e de GPU.
    const intervalo = 1000 / 30
    let visivelNaTela = true
    let quadro = 0
    let ultimo = 0
    let tempo = 0 // segundos de animação, parado enquanto pausado
    let mostrado = false

    const desenhar = (agora) => {
      quadro = 0
      if (!visivelNaTela || document.hidden) return
      quadro = requestAnimationFrame(desenhar)
      if (ultimo && agora - ultimo < intervalo - 2) return
      if (ultimo) tempo += Math.min(agora - ultimo, 100) / 1000
      ultimo = agora
      // u_t só entra em cos(), então pode dar a volta em 2π sem emenda,
      // e o número não cresce até perder precisão.
      gl.uniform1f(uT, (0.75 * g.velocidade * tempo - 1.495) % (2 * Math.PI))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!mostrado) {
        mostrado = true
        canvas.style.opacity = '1'
      }
    }
    const retomar = () => {
      if (quadro || !visivelNaTela || document.hidden) return
      ultimo = 0
      quadro = requestAnimationFrame(desenhar)
    }

    const io = new IntersectionObserver(([e]) => {
      visivelNaTela = e.isIntersecting
      retomar()
    })
    io.observe(area)
    document.addEventListener('visibilitychange', retomar)

    const perdido = (e) => {
      e.preventDefault()
      cancelAnimationFrame(quadro)
      quadro = 0
      visivelNaTela = false
      canvas.style.opacity = '0'
    }
    canvas.addEventListener('webglcontextlost', perdido)

    retomar()

    return () => {
      cancelAnimationFrame(quadro)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', retomar)
      canvas.removeEventListener('webglcontextlost', perdido)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[600ms] ease-out"
    />
  )
}
