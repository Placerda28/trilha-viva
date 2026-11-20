'use client'

import { useEffect, useState } from 'react'
import { Botao, Icone } from '@/components/ds'

// Telas de estado das páginas de senha (MUDANÇAS §6): cartão de "link enviado",
// "Este link venceu" e "Senha trocada". Sem moldura vermelha: o vermelho fica
// para o botão de compra.

export const TITULO = 'font-semi-condensed text-[clamp(36px,5vw,48px)] font-[800] leading-none tracking-[-0.02em]'

// Quadrado de 48 px: cheio (pronto) ou só com a borda (espera, aviso).
function Selo({ cheio, children }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 items-center justify-center ${cheio ? 'bg-ink text-white' : 'box-border border border-ink'}`}
    >
      {children}
    </span>
  )
}

// "Enviar de novo" só vale depois de 60 s: o servidor aceita um pedido por
// minuto por conta, e antes disso a segunda tentativa não faria nada.
const ESPERA_REENVIO = 60

export function LinkEnviado({ titulo, texto, extra, onReenviar }) {
  const [falta, setFalta] = useState(ESPERA_REENVIO)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (falta <= 0) return undefined
    const t = setTimeout(() => setFalta((f) => f - 1), 1000)
    return () => clearTimeout(t)
  }, [falta])

  async function reenviar() {
    setEnviando(true)
    await onReenviar()
    setEnviando(false)
    setFalta(ESPERA_REENVIO)
  }

  return (
    <div role="status" className="flex flex-col gap-2.5 border border-ink p-5">
      <Icone nome="email" tamanho={28} traco={1.5} />
      <strong className="text-[18px] font-[650] [overflow-wrap:anywhere]">{titulo}</strong>
      <span className="text-[15px] leading-[1.5] text-text-2">
        {texto} Não chegou? Olhe a caixa de spam.
      </span>
      {extra}
      <Botao
        variante="contorno"
        tamanho="sm"
        className="mt-1 self-start"
        onClick={reenviar}
        carregando={enviando}
        disabled={falta > 0}
      >
        {falta > 0 ? `Enviar de novo em ${falta} s` : 'Enviar de novo'}
      </Botao>
    </div>
  )
}

// Link de criar senha (ou de redefinir) vencido, usado ou ausente.
export function LinkVencido({ modo }) {
  const redefinir = modo === 'redefinir'
  return (
    <div className="flex flex-col gap-3.5">
      <Selo>
        <Icone nome="relogio" tamanho={24} />
      </Selo>
      <h1 className={TITULO}>Este link venceu</h1>
      <p className="text-[16px] leading-[1.5] text-text-2 [text-wrap:pretty]">
        Por segurança, o link de {redefinir ? 'trocar a senha' : 'criar senha'} vale por pouco tempo e só abre uma vez.
        Peça um novo e ele chega no seu e-mail.
      </p>
      <Botao href={redefinir ? '/recuperar' : '/primeiro-acesso'} tamanho="lg" bloco>
        Pedir um link novo
      </Botao>
    </div>
  )
}

// Depois de salvar a senha nova. A API já abre a sessão, então o caminho é a conta.
export function SenhaTrocada() {
  return (
    <div role="status" className="flex flex-col gap-3.5">
      <Selo cheio>
        <Icone nome="check" tamanho={26} traco={2} />
      </Selo>
      <h1 className={TITULO}>Senha trocada</h1>
      <p className="text-[16px] leading-[1.5] text-text-2">Você já está na sua conta com a senha nova.</p>
      <Botao href="/minha-conta/acervo" tamanho="lg" bloco>
        Abrir Minhas VS
      </Botao>
    </div>
  )
}
