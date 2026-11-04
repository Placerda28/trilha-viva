'use client'

import { useState } from 'react'
import { linkWhatsApp } from '@/lib/afiliados-campos'
import { painelVazio } from '@/lib/afiliados-painel'
import { BotaoCopiar } from '../CodigoLink'
import AvisarPorEmail from './AvisarPorEmail'
import Avisos from './Avisos'
import CartoesDinheiro from './CartoesDinheiro'
import GanhosMes from './GanhosMes'
import GraficoVendas from './GraficoVendas'
import InicioVazio from './InicioVazio'
import NivelCard from './NivelCard'
import { ComparaMes, UltimasVendas } from './UltimasVendas'

// Código e link sempre à mão, em uma faixa baixa: o painel grande de cópia fica
// para o estado vazio.
function CodigoCompacto({ codigo, link }) {
  return (
    <div className="card-line flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-[13.5px] text-ink-muted">Seu código</p>
        <p className="figs text-[26px] font-extrabold leading-none tracking-[0.02em] text-ink">{codigo}</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
        <BotaoCopiar texto={link} rotulo="o link" titulo="Copiar link" claro className="w-full sm:w-auto" />
        <a href={linkWhatsApp(link)} target="_blank" rel="noopener noreferrer" className="btn-ink min-h-11 px-5 py-3 text-[14.5px]">
          WhatsApp<span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </div>
  )
}

export default function Inicio({ d, codigo, link, nome, config, avisarCadaVenda, irPara }) {
  // O saque pedido nesta visita trava o botão sem esperar a página recarregar.
  const [pedido, setPedido] = useState(null)
  const dados = pedido
    ? { ...d, saque: { pode: false, valor: d.saque.valor, motivo: 'Você já tem um saque em análise (pedido agora há pouco).' } }
    : d
  const primeiroNome = String(nome || '').trim().split(' ')[0]

  if (painelVazio(d)) {
    return (
      <div className="space-y-6">
        <Avisos avisos={d.avisos} />
        <InicioVazio d={d} codigo={codigo} link={link} primeiroNome={primeiroNome} />
        <AvisarPorEmail inicial={avisarCadaVenda} />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Avisos avisos={d.avisos} />
      <CodigoCompacto codigo={codigo} link={link} />
      <NivelCard d={dados} />
      <GanhosMes d={dados} config={config} />
      <CartoesDinheiro d={dados} config={config} irPara={irPara} onPedido={setPedido} />
      <GraficoVendas d={dados} />
      <ComparaMes d={dados} />
      <UltimasVendas itens={dados.ultimasVendas} irPara={irPara} />
      <AvisarPorEmail inicial={avisarCadaVenda} />
    </div>
  )
}
