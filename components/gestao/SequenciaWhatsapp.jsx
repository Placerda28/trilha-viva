'use client'

import { useState } from 'react'
import { dataHora } from './formato'

// A sequência de WhatsApp de uma pessoa no mesmo desenho dos e-mails: 9
// casas e, embaixo, a última enviada e a próxima (ou por que parou).
// Cores: escura = lida; meio-tom = entregue, ainda não lida; contorno =
// enviada sem confirmação ou a próxima; vermelha = não entregue (tocar mostra
// o código); apagada = ainda não.

export const MOTIVO_WHATSAPP = {
  comprou: 'comprou',
  descadastro: 'pediu para sair',
  nao_entregue: 'não entregue',
  nao_le: 'não lê',
  respondeu: 'respondeu',
  fim: 'recebeu as 9',
  gestao: 'parado pela gestão',
}

const CASA = {
  lido: 'border-ink bg-ink text-white',
  entregue: 'border-mist-deep bg-mist-deep text-ink',
  enviado: 'border-ink text-ink',
  falhou: 'border-signal-deep bg-signal-deep text-white',
}

const ROTULO = { lido: 'lida', entregue: 'entregue', enviado: 'enviada', falhou: 'não entregue' }

// Hora da leitura: só HH:MM quando foi no mesmo dia do envio.
function quando(envio, status) {
  const a = dataHora(envio)
  const b = dataHora(status)
  return a.slice(0, 10) === b.slice(0, 10) ? b.slice(11) : b
}

function Entrega({ m }) {
  if (m.situacao === 'lido') return <>{' · lido' + (m.situacao_em ? ' ' + quando(m.enviado_em, m.situacao_em) : '')}</>
  if (m.situacao === 'entregue') return <>{' · entregue'}</>
  if (m.situacao === 'falhou') return <span className="text-signal-deep">{' · não entregue'}</span>
  return null
}

export default function SequenciaWhatsapp({ w }) {
  const [aberta, setAberta] = useState(null)
  const total = w.total || 9
  const porNumero = new Map((w.mensagens || []).map((m) => [m.numero, m]))
  const ultima = (w.mensagens || []).at(-1)
  const erro = aberta ? porNumero.get(aberta) : null

  return (
    <div>
      <ol className="flex gap-1" aria-label={(w.enviadas || 0) + ' de ' + total + ' mensagens de WhatsApp enviadas'}>
        {Array.from({ length: total }, (_, i) => {
          const numero = i + 1
          const m = porNumero.get(numero)
          const base = 'figs flex h-6 w-6 items-center justify-center rounded-sm border text-[12px] font-semibold '
          if (m?.situacao === 'falhou') {
            return (
              <li key={numero}>
                <button
                  type="button"
                  onClick={() => setAberta(aberta === numero ? null : numero)}
                  aria-expanded={aberta === numero}
                  title={numero + 'ª não entregue' + (m.erro ? ' · código ' + m.erro : '')}
                  className={base + CASA.falhou}
                >
                  {numero}
                </button>
              </li>
            )
          }
          const cls = m
            ? CASA[m.situacao] || CASA.enviado
            : numero === w.proximo_numero
              ? 'border-ink text-ink'
              : 'border-line text-ink-faint'
          const titulo = m
            ? numero + 'ª ' + (ROTULO[m.situacao] || 'enviada') + ' · enviada em ' + dataHora(m.enviado_em)
            : numero === w.proximo_numero
              ? numero + 'ª prevista para ' + dataHora(w.proximo_em)
              : numero + 'ª: ainda não'
          return (
            <li key={numero} title={titulo} className={base + cls}>
              {numero}
            </li>
          )
        })}
      </ol>
      <ul className="figs mt-1.5 space-y-0.5 text-[12.5px] text-ink-muted">
        {ultima && (
          <li>
            {ultima.numero}º enviado {dataHora(ultima.enviado_em)}
            <Entrega m={ultima} />
          </li>
        )}
        {erro && (
          <li className="text-signal-deep">
            {erro.numero}º não entregue{erro.erro ? ' · código ' + erro.erro : ''}
          </li>
        )}
        {w.motivo ? (
          <li className="text-ink">Encerrado: {MOTIVO_WHATSAPP[w.motivo] || w.motivo}</li>
        ) : (
          w.proximo_em && (
            <li className="text-ink">
              {w.proximo_numero}º previsto {dataHora(w.proximo_em)}
            </li>
          )
        )}
      </ul>
    </div>
  )
}
