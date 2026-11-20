'use client'

import { useRef, useState } from 'react'
import { Botao } from '@/components/ds'
import { linkWhatsApp } from '@/lib/afiliados-campos'
import { SecaoTitulo } from '../TituloConta'

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

// "Seu link" (MUDANÇAS §7): endereço, "Copiar link", o código e o atalho do WhatsApp.
export default function SeuLink({ codigo, link }) {
  const [estado, setEstado] = useState('')
  const timer = useRef(null)

  async function clicar() {
    const ok = await copiar(link)
    setEstado(ok ? 'copiado' : 'falhou')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setEstado(''), 2200)
  }

  return (
    <section aria-labelledby="h-link" className="flex flex-col gap-2.5">
      <SecaoTitulo id="h-link">Seu link</SecaoTitulo>
      <div className="flex flex-wrap gap-2.5">
        <code className="flex min-h-12 min-w-[min(100%,260px)] flex-[1_1_260px] items-center overflow-hidden text-ellipsis whitespace-nowrap border border-field-border px-3.5 font-mono text-[15px]">
          {link.replace(/^https?:\/\//, '')}
        </code>
        <Botao onClick={clicar} aria-label="Copiar o link de afiliado" className="px-5">
          <span aria-live="polite">
            {estado === 'copiado' ? 'Link copiado' : estado === 'falhou' ? 'Não copiou' : 'Copiar link'}
          </span>
        </Botao>
      </div>
      <span className="text-[14px] text-text-3">
        Seu código: <strong className="font-semibold text-ink">{codigo}</strong>. Quem compra pelo link paga o preço normal.
      </span>
      <a
        href={linkWhatsApp(link)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold underline underline-offset-[3px]"
      >
        Compartilhar no WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </section>
  )
}
