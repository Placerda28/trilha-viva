'use client'

import { Aviso, ListaCarregando, ListaErro } from '@/components/ds'
import { useDados } from '@/components/afiliados/painel/api'
import { dataBr, diaMes } from '@/lib/afiliados-painel'
import { valorEmReais } from '@/lib/conta-pedidos'
import { SecaoTitulo } from '../TituloConta'

// Pagamentos pedidos e recebidos (GET /api/afiliados/saques). O comprovante é o
// mesmo que o painel antigo entregava: só o do próprio afiliado.
const SITUACAO = {
  solicitado: { texto: 'Em análise', quadrado: 'border border-ink' },
  pago: { texto: 'Pago por Pix', quadrado: 'border border-ink bg-ink' },
  recusado: { texto: 'Recusado', quadrado: 'border border-red bg-red' },
}

function Linha({ s }) {
  const sit = SITUACAO[s.status] || SITUACAO.solicitado
  return (
    <li className="flex flex-col border-t border-line py-2">
      <div className="flex min-h-[52px] flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] tabular-nums">
        <span className="min-w-[min(100%,160px)] flex-[1_1_160px]">
          Pedido em {dataBr(s.pedido_em)}
          {s.status === 'pago' && s.pago_em && ` · pago em ${diaMes(s.pago_em)}`}
        </span>
        <span className="flex-[0_0_100px] font-[650]">{valorEmReais(s.valor_centavos)}</span>
        <span className="flex flex-[0_0_130px] items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 ${sit.quadrado}`} />
          {sit.texto}
        </span>
        {s.status === 'pago' && s.temComprovante && (
          <a
            href={`/api/afiliados/saques/${s.id}/comprovante`}
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-[3px]"
          >
            Comprovante
          </a>
        )}
      </div>
      {s.status === 'recusado' && s.nota && (
        <Aviso variante="erro" titulo="Motivo:" className="mb-2">
          {s.nota}
        </Aviso>
      )}
    </li>
  )
}

export default function PagamentosAfiliado() {
  const { dados, erro, carregando, recarregar } = useDados('/api/afiliados/saques')
  return (
    <section aria-labelledby="h-saques" className="flex flex-col gap-2.5">
      <SecaoTitulo id="h-saques">Pagamentos</SecaoTitulo>
      {carregando && !dados ? (
        <ListaCarregando linhas={2} rotulo="Carregando seus pagamentos" />
      ) : erro ? (
        <ListaErro titulo="Não conseguimos carregar seus pagamentos." onTentar={recarregar} />
      ) : dados.itens.length === 0 ? (
        <p className="border-y border-line py-4 text-[15px] text-text-3">
          Você ainda não pediu nenhum pagamento. Quando pedir, o acompanhamento aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col border-b border-line">
          {dados.itens.map((s) => (
            <Linha key={s.id} s={s} />
          ))}
        </ul>
      )}
      <a
        href="/afiliados#regras"
        className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold underline underline-offset-[3px]"
      >
        Regras do programa
      </a>
    </section>
  )
}
