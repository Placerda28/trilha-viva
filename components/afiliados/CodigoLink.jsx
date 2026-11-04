'use client'

import { useRef, useState } from 'react'
import { linkWhatsApp } from '@/lib/afiliados-campos'

// Copia pelo navegador; se ele recusar (página sem https, permissão negada),
// seleciona num campo escondido e usa o comando antigo.
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const campo = document.createElement('textarea')
      campo.value = texto
      campo.setAttribute('readonly', '')
      campo.style.position = 'fixed'
      campo.style.opacity = '0'
      document.body.appendChild(campo)
      campo.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(campo)
      return ok
    } catch {
      return false
    }
  }
}

function BotaoCopiar({ texto, rotulo }) {
  const [estado, setEstado] = useState('')
  const timer = useRef(null)

  async function clicar() {
    const ok = await copiar(texto)
    setEstado(ok ? 'copiado' : 'falhou')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setEstado(''), 2200)
  }

  return (
    <button
      type="button"
      onClick={clicar}
      aria-label={`Copiar ${rotulo}`}
      className="btn min-h-11 shrink-0 bg-white px-5 py-3 text-[14.5px] text-ink hover:bg-mist"
    >
      <span aria-live="polite">{estado === 'copiado' ? 'Copiado' : estado === 'falhou' ? 'Não copiou' : 'Copiar'}</span>
    </button>
  )
}

// Código e link do afiliado, em destaque, num painel preto. Usado no fim do
// cadastro e no cartão de quem já é afiliado.
export default function CodigoLink({ codigo, link, className = '' }) {
  return (
    <div className={`panel px-6 py-7 sm:px-8 sm:py-8 ${className}`}>
      <p className="text-[14px] font-semibold text-white/65">Seu código de afiliado</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="figs break-all text-[40px] font-extrabold leading-none tracking-[0.02em] text-white sm:text-[52px]">
          {codigo}
        </p>
        <BotaoCopiar texto={codigo} rotulo="o código" />
      </div>
      <div className="mt-2 h-[3px] w-16 bg-signal" aria-hidden="true" />

      <p className="mt-7 text-[14px] font-semibold text-white/65">Seu link para divulgar</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="min-w-0 break-all text-[16px] leading-[1.5] text-white">{link}</p>
        <BotaoCopiar texto={link} rotulo="o link" />
      </div>

      <a
        href={linkWhatsApp(link)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-onink mt-7 w-full min-h-11 sm:w-auto"
      >
        Compartilhar no WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </div>
  )
}
