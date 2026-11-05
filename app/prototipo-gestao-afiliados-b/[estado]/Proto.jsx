'use client'

import { useState } from 'react'
import Casca from '@/components/gestao/Casca'
import { ApiAfiliadosContexto } from '@/components/gestao/afiliados/apiAfiliados'
import Config from '@/components/gestao/afiliados/config/Config'
import Ficha from '@/components/gestao/afiliados/ficha/Ficha'
import Lista from '@/components/gestao/afiliados/lista/Lista'
import Metas from '@/components/gestao/afiliados/metas/Metas'
import { criarApi } from './apiFalsa'

// PROTÓTIPO TEMPORÁRIO: as telas de Afiliados, Metas e Configurações dentro da
// casca da gestão, sem login nem banco. Estados: b-lista, b-ficha (Master),
// b-ficha-membro, b-ficha-pendente, b-metas, b-metas-membro, b-config, b-config-membro.
// A lista aceita ?afiliado=<id>, como em produção.
const BASE = '/prototipo-gestao-afiliados-b/b-lista'

export default function Proto({ estado }) {
  const membro = estado.endsWith('-membro')
  const [api] = useState(() => criarApi({ master: !membro }))
  const avisos = { ok: true, whatsapp_esperando: 2, afiliados_saques_pendentes: 3, afiliados_alertas: 2 }
  const master = !membro
  const tela = estado.startsWith('b-ficha') ? (
    <Ficha id={estado === 'b-ficha-pendente' ? '6' : '2'} master={master} voltar={BASE} />
  ) : estado.startsWith('b-metas') ? (
    <Metas master={master} />
  ) : estado.startsWith('b-config') ? (
    <Config master={master} />
  ) : (
    <Lista master={master} base={BASE} />
  )
  return (
    <ApiAfiliadosContexto.Provider value={api}>
      <style>{'[data-cta-compra],[data-site-chrome]{display:none!important}'}</style>
      <Casca papel={membro ? 'membro' : 'master'} email={membro ? 'equipe@trilhaviva.org' : 'paulo@trilhaviva.org'} avisos={avisos} ativo="/gestao/afiliados" titulo="Afiliados" onSair={() => {}}>
        {tela}
      </Casca>
    </ApiAfiliadosContexto.Provider>
  )
}
