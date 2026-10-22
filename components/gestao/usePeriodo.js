'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ATALHOS, diaPorExtenso, diasEntre, hojeBrasilia, intervaloDoAtalho } from './formato'

// O período global da gestão (plano 2.5). Mora na URL (?de=AAAA-MM-DD&ate=AAAA-MM-DD)
// e é lido no navegador: quem usa precisa estar dentro de <Suspense>, porque
// useSearchParams deixa a página dinâmica. Sem ?de e ?ate, vale "30 dias".
//
// Devolve { de, ate, atalho, rotulo, intervalo, valido, erro, consulta, mudar }:
//   atalho    'hoje' | '7d' | '30d' | 'mes' | 'mes-passado' | '' (datas escolhidas à mão)
//   rotulo    o nome do atalho ou "Datas" quando foram escolhidas à mão
//   intervalo "01/10/2026 a 22/10/2026", para mostrar ao lado
//   erro      texto em português quando a URL traz datas inválidas (De > Até, mais de 731 dias)
//   consulta  'de=...&ate=...' só se a URL já traz o período; é o que os links do menu levam
//   mudar     mudar({ de, ate }) grava na URL (replace, sem empilhar histórico)
export const MAX_DIAS = 731
const DIA = /^\d{4}-\d{2}-\d{2}$/

// Valida um par de datas e devolve o texto do erro, ou '' se estiver certo.
export function erroDoPeriodo(de, ate) {
  const real = (d) => DIA.test(d) && !Number.isNaN(new Date(d + 'T12:00:00Z').getTime())
  if (!real(de) || !real(ate)) return 'Escolha as duas datas.'
  if (de > ate) return 'A data inicial precisa ser igual ou anterior à final.'
  if (diasEntre(de, ate) > MAX_DIAS) return 'O período pode ter no máximo dois anos. Encurte as datas.'
  return ''
}

export function usePeriodo() {
  const router = useRouter()
  const params = useSearchParams()
  const deUrl = params.get('de')
  const ateUrl = params.get('ate')
  const comPeriodo = Boolean(deUrl && ateUrl)

  const base = useMemo(() => intervaloDoAtalho('30d', hojeBrasilia()), [])
  const de = comPeriodo ? deUrl : base.de
  const ate = comPeriodo ? ateUrl : base.ate
  const erro = comPeriodo ? erroDoPeriodo(de, ate) : ''

  const resto = params.toString()
  const mudar = useCallback(
    ({ de: novoDe, ate: novoAte }) => {
      const p = new URLSearchParams(resto)
      p.set('de', novoDe)
      p.set('ate', novoAte)
      router.replace('?' + p.toString(), { scroll: false })
    },
    [router, resto]
  )

  return useMemo(() => {
    const hoje = hojeBrasilia()
    const atalho = erro ? '' : (ATALHOS.find((a) => {
      const r = intervaloDoAtalho(a.id, hoje)
      return r.de === de && r.ate === ate
    })?.id ?? '')
    return {
      de,
      ate,
      atalho,
      rotulo: atalho ? ATALHOS.find((a) => a.id === atalho).rotulo : 'Datas',
      intervalo: erro ? '' : de === ate ? diaPorExtenso(de) : diaPorExtenso(de) + ' a ' + diaPorExtenso(ate),
      valido: !erro,
      erro,
      consulta: comPeriodo && !erro ? 'de=' + de + '&ate=' + ate : '',
      mudar,
    }
  }, [de, ate, erro, comPeriodo, mudar])
}
