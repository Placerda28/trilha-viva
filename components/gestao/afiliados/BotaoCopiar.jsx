'use client'

import { useEffect, useRef, useState } from 'react'
import Icone from '../Icone'

// Copia um texto e avisa na própria etiqueta do botão (e para o leitor de tela).
// `escuro` é a versão para dentro do painel preto.
export default function BotaoCopiar({ texto, rotulo, rotuloCopiado, escuro = false }) {
  const [estado, setEstado] = useState('') // '' | 'copiado' | 'falhou'
  const relogio = useRef(null)
  useEffect(() => () => clearTimeout(relogio.current), [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setEstado('copiado')
    } catch {
      setEstado('falhou') // sem permissão de área de transferência: a pessoa copia à mão
    }
    clearTimeout(relogio.current)
    relogio.current = setTimeout(() => setEstado(''), 2500)
  }

  return (
    <>
      <button
        type="button"
        onClick={copiar}
        className={(escuro ? 'btn-onink' : 'btn-quiet') + ' min-h-11 gap-2 !px-4 !py-2.5 !text-[14.5px]'}
      >
        <Icone nome={estado === 'copiado' ? 'confere' : 'copiar'} tamanho={17} />
        {estado === 'copiado' ? rotuloCopiado : rotulo}
      </button>
      <span role="status" className={estado === 'falhou' ? 'block w-full text-[13.5px]' : 'sr-only'}>
        {estado === 'copiado' ? rotuloCopiado : estado === 'falhou' ? 'Não deu para copiar. Selecione o texto e copie.' : ''}
      </span>
    </>
  )
}
