'use client'

import { useState } from 'react'
import Casca from '@/components/gestao/Casca'
import Saques from '@/components/gestao/afiliados/Saques'
import { ApiSaquesContexto } from '@/components/gestao/afiliados/apiSaques'
import { criarApiFalsa } from './fixtures'

// PROTÓTIPO TEMPORÁRIO: a tela de Saques dentro da casca da gestão, sem login
// nem banco. A API falsa responde no lugar de /api/gestao/afiliados/saques.
export default function Proto({ variante, semContador = false }) {
  const [api] = useState(() => criarApiFalsa(variante))
  const avisos = { ok: true, whatsapp_esperando: 2, afiliados_saques_pendentes: semContador ? 0 : 3 }
  return (
    <ApiSaquesContexto.Provider value={api}>
      <style>{'[data-cta-compra],[data-site-chrome]{display:none!important}'}</style>
      <Casca papel="master" email="paulo@trilhaviva.org" avisos={avisos} ativo="/gestao/afiliados" titulo="Saques dos afiliados" onSair={() => {}}>
        <Saques />
      </Casca>
    </ApiSaquesContexto.Provider>
  )
}
