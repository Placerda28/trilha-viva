'use client'

import { useState } from 'react'
import { dataHora } from './formato'

// Parte "Resultado" da sub-aba WhatsApp: o estado (ligar, pausar, retomar) e
// os quadros de números.

const ESTADOS = {
  aguardando_modelo: {
    titulo: 'Aguardando aprovação da Meta',
    texto: 'Nenhum cliente recebe ainda. Quando a Meta aprovar o modelo, um teste vai para o seu celular e o e-mail do suporte recebe o botão LIGAR.',
  },
  teste_enviado: {
    titulo: 'Teste enviado — falta ligar',
    texto: 'Confira a mensagem de teste no seu celular. Se estiver tudo certo, ligue aqui ou pelo link do e-mail.',
  },
  ativo: {
    titulo: 'Ligado',
    texto: 'Quem abandona o carrinho recebe a 1ª mensagem 3 h depois e depois 1 por semana, até 9 (das 9h às 20h, nunca no dia de um e-mail). Um resumo chega por e-mail todo dia.',
  },
  pausado: {
    titulo: 'Pausado',
    texto: 'Nenhum cliente recebe lembrete pelo WhatsApp. As conversas continuam funcionando.',
  },
}

export function EstadoWhatsapp({ estado, onMudou }) {
  const [enviando, setEnviando] = useState('')
  const [erro, setErro] = useState('')
  const info = ESTADOS[estado.estado] || ESTADOS.aguardando_modelo

  async function mudar(acao) {
    setErro('')
    setEnviando(acao)
    try {
      const res = await fetch('/api/gestao/whatsapp/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const dados = await res.json().catch(() => null)
      if (res.status === 404) setErro('Sua sessão acabou. Entre de novo.')
      else if (!res.ok || !dados?.ok) setErro(dados?.erro || 'Não consegui mudar agora. Tente de novo.')
      else onMudou()
    } catch {
      setErro('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando('')
  }

  const botao = (acao, rotulo, principal) => (
    <button
      type="button"
      onClick={() => mudar(acao)}
      disabled={Boolean(enviando)}
      className={(principal ? 'btn-ink' : 'btn-quiet') + ' !px-5 !py-2.5 !text-[14.5px] disabled:opacity-60'}
    >
      {enviando === acao ? 'Aguarde…' : rotulo}
    </button>
  )

  return (
    <div className="mb-5 rounded border border-line bg-white px-4 py-4 sm:px-5">
      <p className="text-[13px] text-ink-muted">WhatsApp</p>
      <p className="mt-0.5 text-[17px] font-bold text-ink">{info.titulo}</p>
      <p className="mt-1 text-[13.5px] text-ink-muted">{info.texto}</p>
      {estado.atualizado_por && estado.atualizado_em && (
        <p className="figs mt-1 text-[12.5px] text-ink-faint">
          Última mudança: {dataHora(estado.atualizado_em)} · {estado.atualizado_por}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {estado.estado === 'teste_enviado' && botao('ligar', 'Ligar', true)}
        {(estado.estado === 'ativo' || estado.estado === 'teste_enviado') && botao('pausar', 'Pausar', estado.estado === 'ativo')}
        {estado.estado === 'pausado' && botao('retomar', 'Retomar', true)}
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-[13.5px] text-signal-deep">
          {erro}
        </p>
      )}
    </div>
  )
}

export function Total({ rotulo, valor, detalhe, className = '' }) {
  return (
    <div className={'bg-white px-4 py-4 sm:px-5 ' + className}>
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{valor}</dd>
      {detalhe && <dd className="figs mt-0.5 text-[13px] text-ink-muted">{detalhe}</dd>}
    </div>
  )
}

export function porcentagem(parte, todo) {
  return todo ? Math.round((parte / todo) * 100) + '%' : '—'
}
