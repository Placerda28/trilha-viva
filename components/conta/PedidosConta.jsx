'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { BotaoCompra, Icone, ListaCarregando, ListaErro } from '@/components/ds'
import { ROTULO_FORMA, dataBrasilia, valorEmReais } from '@/lib/conta-pedidos'
import TituloConta from './TituloConta'

// Pedidos (/minha-conta/pedidos). A lista vem pronta do servidor (uma consulta
// com LIMIT); "Tentar de novo" pede a página outra vez. Hoje só existe o pacote:
// as mensalidades do Palco entram aqui junto com a assinatura.
// O link "Comprovante" do desenho fica de fora: ainda não há rota que o entregue.

const SITUACAO = {
  pago: { texto: 'Pago', cheio: true },
  reembolsado: { texto: 'Reembolsado', cheio: false },
}

function Linha({ p }) {
  const s = SITUACAO[p.status] || SITUACAO.pago
  const forma = ROTULO_FORMA[p.forma]
  return (
    <li className="flex min-h-[84px] flex-wrap items-center gap-x-6 gap-y-2 border-t border-line py-3">
      <span className="flex min-w-[min(100%,240px)] flex-[1_1_240px] flex-col gap-[3px]">
        <strong className="text-[16px] font-[650]">Pacote 2.000 VS</strong>
        <span className="text-[14px] tabular-nums text-text-3">
          Pedido nº {p.id} · {dataBrasilia(p.criadoEm)}
          {forma && ` · ${forma}`}
        </span>
      </span>
      <span className="flex items-center gap-5 text-[15px] tabular-nums">
        <span className="font-[650]">{valorEmReais(p.valorCentavos)}</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 border border-ink ${s.cheio ? 'bg-ink' : ''}`} />
          {s.texto}
        </span>
      </span>
    </li>
  )
}

export default function PedidosConta({ itens, erro = false, carregando = false }) {
  const router = useRouter()
  const [tentando, tentar] = useTransition()
  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo="Pedidos" subtitulo="Suas compras e comprovantes." />
      {carregando || tentando ? (
        <ListaCarregando linhas={3} rotulo="Carregando seus pedidos" />
      ) : erro ? (
        <ListaErro titulo="Não conseguimos carregar seus pedidos." onTentar={() => tentar(() => router.refresh())}>
          Tente de novo em instantes. Se continuar, escreva em{' '}
          <a href="/minha-conta/ajuda" className="font-semibold underline underline-offset-[3px]">
            Ajuda
          </a>
          .
        </ListaErro>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-y border-line py-7">
          <Icone nome="recibo" tamanho={40} traco={1.5} className="text-text-3" />
          <strong className="text-[18px] font-[650]">Você ainda não fez nenhuma compra</strong>
          <BotaoCompra />
        </div>
      ) : (
        <>
          <ul className="flex flex-col border-b border-line">
            {itens.map((p) => (
              <Linha key={p.id} p={p} />
            ))}
          </ul>
          <p className="text-[14px] text-text-3">
            Garantia de 7 dias no pacote: para pedir o reembolso, escreva em{' '}
            <a href="/minha-conta/ajuda" className="font-semibold text-ink underline underline-offset-[3px]">
              Ajuda
            </a>
            .
          </p>
        </>
      )}
    </div>
  )
}
