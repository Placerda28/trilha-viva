'use client'

import { Botao } from '@/components/ds'
import ContaForm from '@/components/ContaForm'
import { Cabeca } from './Pecas'

// Pagamento aprovado (MUDANÇAS §5): "Pronto. As 2.000 VS são suas.", os três
// passos, o convite do Palco e o resumo do pedido.
//
// O passo 1 depende de quem a pessoa é:
//   senha    pagou e ainda não tem conta: cria a senha aqui mesmo, nesta tela (a
//            chave da compra no endereço vale 24 h; o formulário é o da /criar-senha)
//   entrar   já tem conta: abre Minhas VS (se está logada) ou entra primeiro
//
// `convite` é o ConvitePalco (variante sucesso), montado no servidor porque a
// chave do Palco só é lida lá.

const PASSO = 'grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-1 border-t py-5'
const NUM = 'text-[15px] font-bold tabular-nums'

function Passo({ n, destaque, children }) {
  return (
    <li className={`${PASSO} ${destaque ? 'border-ink' : 'border-line'}`}>
      <span className={`${NUM} ${destaque ? '' : 'text-text-3'}`}>{n}</span>
      <div className="flex min-w-0 flex-col gap-2.5">{children}</div>
    </li>
  )
}

const T = 'text-[18px] font-[650]'
const D = 'text-[16px] leading-[1.5] text-text-2'

// Só mostra a linha de que o servidor mandou o dado: nada de número, data ou
// valor inventado (se /api/acesso passar a devolver `forma`, `aprovadoEm`,
// `valor` e `pedido`, as linhas aparecem sozinhas).
function linhasDoPedido(state, paymentId) {
  const dataBR = state.aprovadoEm
    ? new Date(state.aprovadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
    : ''
  return [
    state.pedido ? ['Pedido', `nº ${state.pedido}`] : null,
    ['Produto', 'Pacote 2.000 VS'],
    ['Pagamento', [state.forma, paymentId ? `Mercado Pago nº ${paymentId}` : 'Mercado Pago'].filter(Boolean).join(' · ')],
    dataBR ? ['Data', dataBR] : null,
    state.valor != null ? ['Valor', Number(state.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), true] : null,
  ].filter(Boolean)
}

export default function PagamentoAprovado({ state, passo, paymentId, convite }) {
  const destino = state.email || state.emailMascarado
  const criaAqui = passo === 'senha'
  return (
    <>
      <Cabeca tipo="ok" rotulo="Pagamento aprovado" titulo="Pronto. As 2.000 VS são suas.">
        {criaAqui && state.mailed ? (
          <>
            Mandamos o comprovante e o link de acesso para <strong className="font-[650] text-ink">{destino}</strong>.
          </>
        ) : (
          <>
            Pagamento confirmado
            {destino && (
              <>
                {' '}
                para <strong className="font-[650] text-ink">{destino}</strong>
              </>
            )}
            .
          </>
        )}
      </Cabeca>

      <ol className="flex flex-col border-b border-line">
        <Passo n="1" destaque>
          {criaAqui ? (
            <>
              <strong className={T}>Crie sua senha</strong>
              <span className={D}>É com ela que você entra na sua conta e baixa as VS.</span>
              <ContaForm modo="criar" emailFixo={state.email || ''} embutido />
              <span className="text-[14px] leading-[1.5] text-text-3">
                {state.mailed
                  ? 'Se você fechar esta página antes de terminar, tudo bem: enviamos o mesmo link para o seu e-mail.'
                  : 'Termine agora, nesta tela. Se fechar antes, use "Primeiro acesso" na página de entrada com este mesmo e-mail.'}
              </span>
            </>
          ) : (
            // Sempre "Entrar", mesmo com sessão aberta: a sessão do navegador pode
            // ser de outra conta que não a do e-mail da compra.
            <>
              <strong className={T}>Entre na sua conta</strong>
              <span className={D}>Você já tem uma senha com este e-mail. Entre para abrir as VS.</span>
              <Botao href="/entrar?ja=1" tamanho="md" className="self-start">
                Entrar
              </Botao>
            </>
          )}
        </Passo>
        <Passo n="2">
          <strong className={T}>Baixe as músicas do próximo culto</strong>
          <span className={D}>Até 30 por dia. O acesso é vitalício: volte e baixe de novo quando precisar.</span>
        </Passo>
        <Passo n="3">
          <strong className={T}>Monte no seu programa</strong>
          <span className={D}>Clique e guia no fone, o resto no PA.</span>
          <a
            href="/como-usar"
            className="inline-flex min-h-11 items-center self-start text-[16px] font-semibold text-ink underline underline-offset-4 hover:decoration-2"
          >
            Ver como usar
          </a>
        </Passo>
      </ol>

      {convite}

      <section aria-labelledby="h-pedido" className="flex flex-col gap-3">
        <h2 id="h-pedido" className="font-semi-condensed text-[20px] font-bold">
          Resumo do pedido
        </h2>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] border-t border-line text-[15px]">
          {linhasDoPedido(state, paymentId).map(([rotulo, valor, forte]) => (
            <div key={rotulo} className="contents">
              <dt className={`border-b border-line py-3 pr-6 ${forte ? 'font-[650]' : 'text-text-3'}`}>{rotulo}</dt>
              <dd className={`border-b border-line py-3 text-right tabular-nums [overflow-wrap:anywhere] ${forte ? 'font-[650]' : ''}`}>
                {valor}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
