'use client'

import { useEffect, useRef } from 'react'

// Mostra um texto já formatado ("R$ 1.500,00") e, quando um dígito muda, só
// aquele dígito rola (sobe se o novo é maior, desce se é menor) com um leve
// desfoque. Ideia do "Animate Digits" do 21st.dev, refeita em CSS puro: sem
// biblioteca de movimento e sem conta de dinheiro (só compara caracteres).
// `rolar` = false desliga o rolar (usado enquanto o número "conta").
// Com `prefers-reduced-motion` o CSS não anima nada.
export default function ValorAnimado({ texto, rolar = true, className = '' }) {
  const anterior = useRef(texto)
  const antes = anterior.current
  useEffect(() => {
    anterior.current = texto
  }, [texto])

  // Compara da direita para a esquerda: "R$ 980,00" -> "R$ 1.500,00" muda de tamanho.
  const letras = [...texto]
  const velhas = [...antes]
  return (
    <span className={className} aria-hidden="true">
      {letras.map((c, i) => {
        const v = velhas[velhas.length - (letras.length - i)]
        const mudou = rolar && antes !== texto && /\d/.test(c) && c !== v
        if (!mudou) return <span key={`${i}${c}`}>{c}</span>
        const sobe = !/\d/.test(v || '') || Number(c) > Number(v)
        return (
          <span key={`${i}${c}`} className="dig-roda" data-dir={sobe ? 'sobe' : 'desce'}>
            {c}
          </span>
        )
      })}
    </span>
  )
}
