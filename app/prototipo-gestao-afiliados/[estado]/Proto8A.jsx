'use client'

import { useState } from 'react'
import Casca from '@/components/gestao/Casca'
import Alertas from '@/components/gestao/afiliados/alertas/Alertas'
import Dashboard from '@/components/gestao/afiliados/dashboard/Dashboard'
import Financeiro from '@/components/gestao/afiliados/financeiro/Financeiro'
import { instalarFetchFalso } from './fixtures8a'

// PROTÓTIPO TEMPORÁRIO (Fase 8A): Dashboard, Financeiro e Alertas na casca da
// gestão, com o fetch trocado por respostas falsas (fixtures8a.js).
const TELAS = {
  dashboard: [Dashboard, '/gestao/afiliados/dashboard', 'Dashboard dos afiliados'],
  'dashboard-vazio': [Dashboard, '/gestao/afiliados/dashboard', 'Dashboard dos afiliados'],
  financeiro: [Financeiro, '/gestao/afiliados/financeiro', 'Financeiro dos afiliados'],
  alertas: [Alertas, '/gestao/afiliados/alertas', 'Alertas dos afiliados'],
  'alertas-vazio': [Alertas, '/gestao/afiliados/alertas', 'Alertas dos afiliados'],
}

export default function Proto8A({ estado }) {
  // Antes dos filhos buscarem: o fetch falso entra durante a renderização.
  useState(() => instalarFetchFalso(estado))
  const [Tela, ativo, titulo] = TELAS[estado]
  const avisos = { ok: true, whatsapp_esperando: 2, afiliados_saques_pendentes: 3, afiliados_alertas: estado === 'alertas-vazio' ? 0 : 4 }
  return (
    <>
      <style>{'[data-cta-compra],[data-site-chrome]{display:none!important}'}</style>
      <Casca papel="master" email="paulo@trilhaviva.org" avisos={avisos} ativo={ativo} titulo={titulo} onSair={() => {}}>
        <Tela />
      </Casca>
    </>
  )
}
