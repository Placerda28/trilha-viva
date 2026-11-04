'use client'

import { useState } from 'react'
import { mascaraCpf } from '@/lib/afiliados-campos'
import { nomeTipoPix } from '@/lib/afiliados-painel'
import Icone from '../Icone'
import { moeda } from '../formato'
import { useApiSaques } from './apiSaques'
import BotaoCopiar from './BotaoCopiar'
import Comprovante from './Comprovante'
import Gaveta from './Gaveta'
import ResultadoSaque from './ResultadoSaque'
import { valorParaCopiar } from './saquesUtil'

// O momento de pagar: a chave Pix para copiar, o comprovante para anexar e o
// botão que só acende depois do anexo. É uma sequência de verdade, por isso os
// passos são numerados; o número vira um visto quando o passo termina.

function Passo({ n, titulo, feito, children }) {
  return (
    <section aria-labelledby={'passo-' + n}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={
            'figs grid h-7 w-7 shrink-0 place-items-center rounded-sm text-[13.5px] font-bold ' +
            (feito ? 'bg-ink text-white' : 'border border-ink text-ink')
          }
        >
          {feito ? <Icone nome="confere" tamanho={16} /> : n}
        </span>
        <h3 id={'passo-' + n} className="text-[16px] font-bold text-ink">
          {titulo}
          {feito && <span className="sr-only"> (concluído)</span>}
        </h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Dado({ rotulo, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="figs mt-0.5 break-words text-[15.5px] font-semibold text-ink">{valor}</dd>
    </div>
  )
}

export default function PagarSaque({ saque: s, aoFechar, aoMudou, aoRecusar }) {
  const api = useApiSaques()
  const [caminho, setCaminho] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null) // { email: boolean }
  const pix = s.pix || {}
  const creditos = s.creditos || []

  async function marcarPago() {
    setSalvando(true)
    setErro('')
    const r = await api.pagar(s.id, caminho)
    setSalvando(false)
    if (r.status === 404) return setErro('Sua sessão acabou. Entre de novo para continuar.')
    if (!r.ok) return setErro(r.status === 0 ? 'Falha de conexão. Confira a internet e tente de novo.' : r.dados?.erro || 'Não consegui registrar o pagamento. Tente de novo.')
    setFeito({ email: Boolean(r.dados?.email_enviado) })
    aoMudou()
  }

  return (
    <Gaveta lateral travada={enviando || salvando} aoFechar={aoFechar} titulo={feito ? 'Saque pago' : 'Pagar saque'}>
      {feito ? (
        <ResultadoSaque
          titulo="Pagamento registrado."
          enviado={feito.email}
          nome={s.nome}
          complemento=", com o comprovante em anexo"
          aoFechar={aoFechar}
        />
      ) : (
        <div className="space-y-7 px-4 py-5 sm:px-6">
          <div>
            <p className="text-[13.5px] text-ink-muted">
              Valor para <strong className="font-semibold text-ink">{s.nome}</strong>, código{' '}
              <span className="figs font-semibold text-ink">{s.codigo}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="figs text-[36px] font-extrabold leading-none tracking-[-0.025em] text-ink">{moeda(s.valor_centavos)}</p>
              <BotaoCopiar texto={valorParaCopiar(s.valor_centavos)} rotulo="Copiar valor" rotuloCopiado="Valor copiado" />
            </div>
          </div>

          <Passo n={1} titulo="Faça o Pix">
            <div className="rounded bg-ink p-4 text-white">
              <p className="text-[13.5px] text-white/70">{pix.tipo_chave === 'aleatoria' ? 'Chave Pix aleatória' : 'Chave Pix' + (nomeTipoPix(pix.tipo_chave) ? ' do tipo ' + nomeTipoPix(pix.tipo_chave) : '')}</p>
              <p className={'figs mt-1.5 break-all font-bold leading-snug tracking-[0.01em] ' + (String(pix.chave || '').length > 32 ? 'text-[19px]' : 'text-[22px]')}>{pix.chave}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <BotaoCopiar escuro texto={String(pix.chave || '')} rotulo="Copiar chave" rotuloCopiado="Chave copiada" />
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dado rotulo="Titular" valor={pix.titular_nome || '—'} />
              <Dado rotulo="CPF do titular" valor={pix.titular_cpf ? mascaraCpf(pix.titular_cpf) : '—'} />
            </dl>
            <p className="mt-3 text-[13.5px] leading-[1.5] text-ink-muted">Confira no app do banco se o nome do titular bate antes de confirmar o Pix.</p>

            {creditos.length > 0 && (
              <div className="mt-5">
                <p className="text-[14px] font-semibold text-ink">Créditos incluídos neste saque</p>
                <ul tabIndex={0} aria-label="Créditos incluídos" className="mt-2 max-h-44 divide-y divide-line overflow-y-auto rounded border border-line">
                  {creditos.map((c, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-[14.5px]">
                      <span className="min-w-0 break-words text-ink">{c.descricao}</span>
                      <span className="figs shrink-0 font-semibold text-ink">{moeda(c.valor_centavos)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Passo>

          <Passo n={2} titulo="Anexe o comprovante" feito={Boolean(caminho)}>
            <Comprovante saqueId={s.id} enviado={Boolean(caminho)} aoEnviar={setCaminho} aoOcupar={setEnviando} />
          </Passo>

          <Passo n={3} titulo="Marque como pago">
            <button
              type="button"
              onClick={marcarPago}
              disabled={!caminho || salvando || enviando}
              aria-describedby="ajuda-pagar"
              className="btn-ink min-h-12 w-full disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-muted disabled:hover:bg-mist"
            >
              {salvando ? 'Registrando…' : 'Marcar como pago'}
            </button>
            <p id="ajuda-pagar" className="mt-2.5 text-[14px] leading-[1.5] text-ink-muted">
              {caminho
                ? 'O afiliado recebe um e-mail avisando do pagamento, com o comprovante em anexo.'
                : 'O botão acende quando o comprovante for enviado.'}
            </p>
            {erro && (
              <p role="alert" className="mt-3 flex gap-2 text-[14.5px] leading-[1.5] text-signal-deep">
                <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0" />
                {erro}
              </p>
            )}
          </Passo>

          <div className="border-t border-line pt-4">
            <button type="button" onClick={aoRecusar} disabled={salvando || enviando} className="link-quiet min-h-11 text-[14.5px] font-semibold disabled:opacity-40">
              Não vai pagar? Recusar este pedido
            </button>
          </div>
        </div>
      )}
    </Gaveta>
  )
}
