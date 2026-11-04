'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { limparCodigoDigitado } from '@/lib/afiliados-campos'
import { codigoDoCookie, cookieDoRefApagado, refDoEndereco } from '@/lib/afiliados-ref'

// Estado do campo, para o CheckoutForm. O código vem do ?ref= do endereço ou do
// cookie tv_ref; a pessoa pode apagar ou trocar, e o que está no campo na hora de
// enviar é o que vale.
export function useIndicacao() {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [aviso, setAviso] = useState(null) // { texto, url }
  const veioPreenchido = useRef(false)

  // Chamar ao abrir a página, com a busca do endereço.
  const iniciar = useCallback((busca) => {
    const indicado = refDoEndereco(busca)?.codigo || codigoDoCookie(document.cookie)
    if (!indicado) return
    veioPreenchido.current = true
    setAberto(true)
    setValor(indicado)
  }, [])

  // Código a mandar no checkout. Campo vazio de propósito apaga o cookie, para o
  // servidor não voltar a usá-lo.
  function codigoParaEnvio() {
    const codigo = limparCodigoDigitado(valor)
    if (!codigo && veioPreenchido.current) {
      try {
        document.cookie = cookieDoRefApagado(window.location.protocol === 'https:')
      } catch {
        /* cookie bloqueado: segue sem ele */
      }
    }
    return codigo
  }

  // Se o servidor mandou um aviso sobre o código, mostra e dá tempo de ler antes
  // de abrir o pagamento. Devolve true se segurou o redirecionamento.
  function mostrarAviso(dados) {
    if (!dados.aviso_afiliado) return false
    setAviso({ texto: String(dados.aviso_afiliado), url: dados.url })
    setTimeout(() => {
      window.location.href = dados.url
    }, 3500)
    return true
  }

  return { aberto, setAberto, valor, setValor, aviso, iniciar, codigoParaEnvio, mostrarAviso }
}

export function AvisoIndicacao({ aviso, textoFraco }) {
  if (!aviso) return null
  return (
    <div role="status" className={`text-center text-[13px] leading-relaxed ${textoFraco}`}>
      <p>{aviso.texto} Abrindo o pagamento…</p>
      <a href={aviso.url} className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4">
        Ir agora
      </a>
    </div>
  )
}

// Código de quem indicou a compra: opcional e discreto, atrás de um link logo
// abaixo do cupom. Só registra quem indicou; não mexe no preço. O estado fica no
// CheckoutForm. Chega aberto e preenchido quando o código veio do cookie tv_ref.
export default function CheckoutIndicacao({ id, escuro, rotuloCls, campoCls, aberto, setAberto, valor, setValor }) {
  const campo = useRef(null)
  const abriuPorClique = useRef(false)

  useEffect(() => {
    if (aberto && abriuPorClique.current) campo.current?.focus()
  }, [aberto])

  const textoFraco = escuro ? 'text-white/70' : 'text-ink-muted'

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          abriuPorClique.current = true
          setAberto(true)
        }}
        className={`!mt-0 inline-flex min-h-[44px] items-center text-[13.5px] font-semibold underline underline-offset-4 ${escuro ? 'text-white/80 hover:text-white' : 'text-ink-muted hover:text-ink'}`}
      >
        Tem código de quem te indicou?
      </button>
    )
  }

  return (
    <div>
      <label htmlFor={`${id}-indicacao`} className={rotuloCls}>
        Código de quem te indicou
      </label>
      <input
        ref={campo}
        id={`${id}-indicacao`}
        name="codigo_afiliado"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={15}
        value={valor}
        onChange={(e) => setValor(limparCodigoDigitado(e.target.value))}
        placeholder="Digite o código"
        aria-describedby={`${id}-indicacao-ajuda`}
        className={`${campoCls} uppercase tracking-[0.04em]`}
      />
      <p id={`${id}-indicacao-ajuda`} className={`mt-2 text-[12.5px] ${textoFraco}`}>
        Opcional. Serve só para dar o crédito a quem te indicou.
      </p>
    </div>
  )
}
