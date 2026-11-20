'use client'

import { useState } from 'react'
import { Botao, Campo } from '@/components/ds'
import { EMAIL_SUPORTE } from '@/lib/site'
import TituloConta, { SecaoTitulo } from './TituloConta'

// Ajuda (/minha-conta/ajuda). Usa a rota que já existia, POST /api/conta/relatar
// ({ nome, email, descricao }): o assunto escolhido vai no começo da descrição.
const ASSUNTOS = ['Download das VS', 'Palco', 'Pagamento ou reembolso', 'Pedir uma música', 'Outro assunto']
const LINK = 'inline-flex min-h-11 items-center text-[15px] text-ink underline underline-offset-[3px]'

export default function AjudaConta({ nome = '', email = '' }) {
  const [assunto, setAssunto] = useState(ASSUNTOS[0])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (texto.trim().length < 10) {
      setErro('Conte um pouco mais: o que você estava fazendo e o que apareceu na tela.')
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/conta/relatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, descricao: `Assunto: ${assunto}\n\n${texto.trim()}` }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok || !dados.ok) {
        setErro(dados.erro || 'Não conseguimos enviar agora. Tente de novo em instantes.')
      } else {
        setEnviado(true)
      }
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo="Ajuda" subtitulo="Conte o que aconteceu ou fale com a gente." />
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
        <section aria-labelledby="h-relatar" className="flex min-w-[min(100%,360px)] max-w-[560px] flex-[2_1_360px] flex-col gap-4">
          <SecaoTitulo id="h-relatar">Relatar um problema</SecaoTitulo>
          {enviado ? (
            <div role="status" className="flex flex-col gap-1.5 border border-ink p-5">
              <strong className="text-[17px] font-[650]">Recebemos sua mensagem</strong>
              <span className="text-[15px] leading-[1.5] text-text-2">
                Respondemos em {email}. Se precisar mandar outro detalhe, responda o e-mail que chegar.
              </span>
            </div>
          ) : (
            <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="a-assunto" className="text-[15px] font-semibold">
                  Sobre o quê?
                </label>
                <select
                  id="a-assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className="h-12 w-full rounded-control border border-field-border bg-white px-3 text-[16px] text-ink hover:border-ink"
                >
                  {ASSUNTOS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <Campo
                multilinha
                rotulo="O que aconteceu?"
                rows={6}
                placeholder="Conte o que você estava fazendo e o que apareceu na tela."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                erro={erro}
                campoClassName="resize-y"
              />
              <Botao type="submit" carregando={enviando} className="self-start px-[22px]">
                Enviar
              </Botao>
            </form>
          )}
        </section>
        <aside className="flex min-w-[min(100%,240px)] flex-[1_1_240px] flex-col gap-1">
          <SecaoTitulo className="mb-1.5">Contato</SecaoTitulo>
          <a href={`mailto:${EMAIL_SUPORTE}`} className={`${LINK} break-all font-semibold`}>
            {EMAIL_SUPORTE}
          </a>
          <a href="/faq" className={LINK}>
            Dúvidas frequentes
          </a>
          <a href="/como-usar" className={LINK}>
            Como usar multitrack
          </a>
          <a href="/palco/ajuda" className={LINK}>
            Ajuda do Palco
          </a>
          <a href="/termos" className={LINK}>
            Termos de uso
          </a>
        </aside>
      </div>
    </div>
  )
}
