'use client'

import { useState } from 'react'
import { mesesParaFiltro, nomeDoMes, rotuloMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { useDados } from './api'
import { Carregando, Falhou } from './Carregando'
import { VendaLinhas, VendaTabela } from './ListaVendas'
import { Selo } from './Situacao'

function Numero({ rotulo, valor, ajuda }) {
  return (
    <div>
      <dt className="flex min-h-[2.4rem] items-start gap-1 text-[14px] leading-[1.3] text-ink-muted">
        <span className="pt-0.5">{rotulo}</span> {ajuda}
      </dt>
      <dd className="figs mt-1.5 text-[32px] font-extrabold leading-none tracking-[-0.025em] text-ink">{valor}</dd>
    </div>
  )
}

function Legenda() {
  return (
    <details className="mt-4 border-t border-line pt-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-[14.5px] font-semibold text-ink">O que cada situação quer dizer</summary>
      <ul className="space-y-3 pb-3 pt-1 text-[14.5px] leading-[1.5] text-ink-muted">
        <li><Selo chave="liberando" texto="Liberando em DD/MM" /> <span className="block pt-1.5">Esperando o prazo de segurança. Na data indicada ela fica disponível.</span></li>
        <li><Selo chave="disponivel" texto="Disponível" /> <span className="block pt-1.5">Já pode entrar num pedido de saque.</span></li>
        <li><Selo chave="em_saque" texto="Em saque" /> <span className="block pt-1.5">Está dentro de um saque que você pediu e ainda não foi pago.</span></li>
        <li><Selo chave="paga" texto="Paga em DD/MM" /> <span className="block pt-1.5">Já caiu na sua conta por Pix.</span></li>
        <li><Selo chave="cancelada" texto="Cancelada (reembolso)" /> <span className="block pt-1.5">A compra foi devolvida, por isso não conta para a meta nem rende comissão.</span></li>
      </ul>
    </details>
  )
}

export default function Vendas({ mesAtual }) {
  const [mes, setMes] = useState(mesAtual)
  const { dados, erro, carregando, recarregar } = useDados(`/api/afiliados/vendas?mes=${mes}`)
  const nome = nomeDoMes(mes).toLowerCase()

  return (
    <div className="space-y-5">
      <div className="card-line px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label htmlFor="filtro-mes" className="block text-[14px] font-semibold text-ink">Mês</label>
            <select
              id="filtro-mes"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded border border-line bg-white px-3.5 py-2.5 text-[16px] font-semibold text-ink focus:border-ink focus:outline-none sm:w-60"
            >
              {mesesParaFiltro(mesAtual).map((m) => (
                <option key={m} value={m}>{rotuloMes(m)}</option>
              ))}
            </select>
          </div>
        </div>
        {dados && (
          <dl className="mt-6 grid grid-cols-3 gap-4">
            <Numero rotulo="Vendas" valor={dados.resumo.total} ajuda={<Ajuda titulo="Vendas do mês"><p>Todas as compras feitas pelo seu código neste mês, inclusive as que foram devolvidas depois.</p></Ajuda>} />
            <Numero rotulo="Canceladas" valor={dados.resumo.canceladas} ajuda={<Ajuda titulo="Vendas canceladas"><p>Compras que foram devolvidas ao comprador. Elas saem da sua conta e da sua meta.</p></Ajuda>} />
            <Numero rotulo="Contam para a meta" valor={dados.resumo.validas} ajuda={<Ajuda titulo="Contam para a meta"><p>É o total de vendas menos as canceladas. É esse número que define o seu nível no mês.</p></Ajuda>} />
          </dl>
        )}
        <Legenda />
      </div>

      {carregando && !dados ? (
        <Carregando />
      ) : erro ? (
        <Falhou onTentar={recarregar} />
      ) : dados.itens.length === 0 ? (
        <div className="card-line px-5 py-10 text-center">
          <p className="text-[17px] font-bold text-ink">Nenhuma venda em {nome}.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-[1.55] text-ink-muted">Quando alguém comprar pelo seu link, a venda aparece aqui.</p>
        </div>
      ) : (
        <div className="card-line px-5 sm:px-8" aria-busy={carregando}>
          <div className="md:hidden"><VendaLinhas itens={dados.itens} /></div>
          <div className="hidden md:block"><VendaTabela itens={dados.itens} /></div>
        </div>
      )}
    </div>
  )
}
