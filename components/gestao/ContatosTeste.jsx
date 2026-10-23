'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import { postarGestao, linkAcao } from './AcaoGestao'
import { Aviso, Esqueleto } from './Estados'
import { dataHora } from './formato'
import { formatarCelular } from '@/lib/gestao/csv'

// Lista de e-mails e celulares de teste. Carrinho e compra que vierem deles já
// nascem marcados como teste: não contam nos números, não recebem lembrete e
// não vão para a Meta.
export default function ContatosTeste() {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro } = useGestao('/api/gestao/testes', tentativa)
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  async function enviar(acao, alvo) {
    setMsg({ tipo: '', texto: '' })
    setSalvando(true)
    const r = await postarGestao('/api/gestao/testes', { acao, valor: alvo })
    setSalvando(false)
    if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro })
    if (acao === 'adicionar') setValor('')
    setMsg({ tipo: 'ok', texto: r.aviso || (acao === 'adicionar' ? 'Adicionado.' : 'Removido.') })
    setTentativa((n) => n + 1)
  }

  const itens = dados?.itens || dados?.contatos || []

  return (
    <section aria-labelledby="titulo-testes" className="mt-12">
      <h2 id="titulo-testes" className="text-[20px] font-bold text-ink">
        Contatos de teste
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
        Compras e carrinhos destes e-mails e celulares já nascem marcados como teste: não contam nas vendas, não recebem
        lembrete e não vão para a Meta. Adicionar aqui não muda o que já aconteceu; para isso, use &quot;Marcar como
        teste&quot; em Clientes ou na Recuperação.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valor.trim()) enviar('adicionar', valor.trim())
        }}
        className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="contato-teste" className="sr-only">
          E-mail ou celular de teste
        </label>
        <input
          id="contato-teste"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={254}
          autoComplete="off"
          spellCheck={false}
          placeholder="E-mail ou celular com DDD"
          className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <button type="submit" disabled={salvando || !valor.trim()} className="btn-ink whitespace-nowrap disabled:opacity-60">
          {salvando ? 'Salvando…' : 'Adicionar'}
        </button>
      </form>
      {msg.texto && (
        <p
          role={msg.tipo === 'erro' ? 'alert' : undefined}
          aria-live="polite"
          className={'mt-3 text-[13.5px] ' + (msg.tipo === 'erro' ? 'text-signal-deep' : 'text-ink')}
        >
          {msg.texto}
        </p>
      )}

      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto />
      ) : itens.length === 0 ? (
        <p className="mt-5 text-[14px] text-ink-muted">Nenhum contato de teste.</p>
      ) : (
        <ul className="mt-5 max-w-xl divide-y divide-line rounded border border-line bg-white">
          {itens.map((c) => (
            <li key={c.valor} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block break-all text-[14.5px] text-ink">
                  {c.tipo === 'telefone' ? formatarCelular(c.valor) : c.valor}
                </span>
                <span className="text-[12.5px] text-ink-muted">{c.tipo === 'telefone' ? 'Celular' : 'E-mail'}</span>
                {c.criado_por && <span className="block break-all text-[12.5px] text-ink-muted">
                  Adicionado por {c.criado_por}{c.criado_em ? ' em ' + dataHora(c.criado_em.replace(' ', 'T') + (c.criado_em.endsWith('Z') ? '' : 'Z')).slice(0, 5) : ''}
                </span>}
              </span>
              <button type="button" onClick={() => enviar('remover', c.valor)} disabled={salvando} className={linkAcao}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
