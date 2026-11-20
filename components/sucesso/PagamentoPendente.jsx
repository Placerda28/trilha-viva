'use client'

import { Botao } from '@/components/ds'
import { Cabeca } from './Pecas'

// Espera do pagamento (MUDANÇAS §5): três momentos da mesma tela.
//   confirmando   ainda não veio a primeira resposta
//   pendente      o Mercado Pago ainda não confirmou (Pix pago no app do banco, por
//                 exemplo): a página confere sozinha a cada 3 s
//   esgotado      passaram os 3 minutos sem confirmar: a conferência automática parou
//
// A barra anda enquanto confere; com "reduzir movimento" fica parada.
const CSS = `@keyframes tv-barra{0%{left:-40%}100%{left:100%}}
.tv-barra{animation:tv-barra 1.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.tv-barra{animation:none;left:0}}`

function Destino({ state }) {
  return state.emailMascarado ? (
    <strong className="font-[650] text-ink">{state.emailMascarado}</strong>
  ) : (
    'informado na compra'
  )
}

export default function PagamentoPendente({ momento, state, onVerificar }) {
  const conferindo = momento !== 'esgotado'
  const zap = state.whatsapp ? ' e no WhatsApp' : ''
  return (
    <>
      {momento === 'confirmando' && (
        <Cabeca tipo="espera" titulo="Confirmando seu pagamento…">
          Só um instante. Estamos conferindo com o Mercado Pago.
        </Cabeca>
      )}
      {momento === 'pendente' && (
        <Cabeca tipo="espera" rotulo="Aguardando o pagamento" titulo="Falta só a confirmação do pagamento.">
          Assim que o Mercado Pago confirmar, o acesso é liberado e o link chega em <Destino state={state} />
          {zap}. Esta página atualiza sozinha.
        </Cabeca>
      )}
      {momento === 'esgotado' && (
        <Cabeca tipo="espera" titulo="Ainda não recebemos a confirmação">
          Assim que o pagamento cair, você recebe o link de acesso no e-mail <Destino state={state} />
          {zap}. Confira também a caixa de spam.
        </Cabeca>
      )}

      {conferindo && (
        <div role="status" className="flex flex-col gap-2.5">
          <style>{CSS}</style>
          <div aria-hidden="true" className="relative h-[3px] overflow-hidden bg-line">
            <span className="tv-barra absolute inset-y-0 w-[40%] bg-ink" />
          </div>
          <span className="text-[15px] text-text-2">
            {momento === 'confirmando' ? 'Pode deixar esta página aberta. Ela segue sozinha.' : 'Verificando o pagamento…'}
          </span>
        </div>
      )}

      {momento !== 'confirmando' && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Botao variante="contorno" onClick={onVerificar}>
            {conferindo ? 'Já paguei, verificar agora' : 'Já paguei, conferir de novo'}
          </Botao>
          <a
            href="/assinar"
            className="inline-flex min-h-11 items-center text-[16px] font-semibold text-ink underline underline-offset-4 hover:decoration-2"
          >
            Ainda não paguei, voltar ao pagamento
          </a>
        </div>
      )}
    </>
  )
}
