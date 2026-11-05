'use client'

import { useState } from 'react'
import { Campo, classeCampo } from '../lista/Pecas'
import BotaoCopiar from '../BotaoCopiar'
import { CODIGO_VALIDO, limparCodigo } from '../afiliadosUtil'
import GavetaAcao from './GavetaAcao'

// Trocar o código quebra os links que o afiliado já divulgou, então a gaveta
// pede duas coisas: o código novo e a confirmação forte (digitar o código
// atual). O servidor só responde com o aviso, o link novo e os cliques do
// código antigo depois de trocar; esses três aparecem na tela de "feito".

export default function TrocarCodigo({ a, aoFechar, aoMudou }) {
  const [novo, setNovo] = useState('')
  const [confirma, setConfirma] = useState('')
  const erroNovo = !CODIGO_VALIDO.test(novo) ? 'Use de 4 a 15 letras e números, sem espaço.' : novo === a.codigo ? 'Esse já é o código atual.' : ''
  const erroConfirma = limparCodigo(confirma) !== a.codigo ? `Digite ${a.codigo} para confirmar.` : ''
  return (
    <GavetaAcao
      id={a.id}
      acao="trocar_codigo"
      titulo="Trocar código"
      tituloFeito="Código trocado"
      descricao={`${a.nome} usa hoje o código ${a.codigo}.`}
      rotulo="Trocar código agora"
      perigo
      corpo={erroNovo || erroConfirma ? null : { codigo: novo }}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={(d) => (
        <div className="space-y-4">
          <p className="text-[15px] font-semibold text-ink">
            O código de {a.nome} agora é <span className="figs">{d.codigo}</span>.
          </p>
          {d.aviso && <p className="border-l-2 border-signal pl-3 text-[15px] leading-[1.55] text-ink">{d.aviso}</p>}
          <p className="text-[14.5px] text-ink-muted">
            Cliques nos últimos 30 dias com o código antigo ({d.codigo_antigo}):{' '}
            <strong className="figs text-ink">{d.cliques_30d_com_o_codigo_antigo ?? 0}</strong>.
          </p>
          <div>
            <p className="text-[14.5px] font-semibold text-ink">Link novo</p>
            <p className="figs mt-1 break-all rounded border border-line bg-paper px-3 py-2.5 text-[14.5px] text-ink">{d.link_novo}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <BotaoCopiar texto={d.link_novo} rotulo="Copiar link novo" rotuloCopiado="Link copiado" />
            </div>
            <p className="mt-2 text-[13.5px] text-ink-muted">Mande este link para o afiliado: é o único que passa a valer.</p>
          </div>
        </div>
      )}
    >
      {(tocou) => (
        <>
          <div className="border-l-2 border-signal pl-3 text-[14.5px] leading-[1.55] text-ink">
            <p className="font-semibold">Isto quebra os links que ele já divulgou.</p>
            <p className="mt-1">
              Os links com o código {a.codigo} deixam de registrar cliques e vendas, e o cookie de quem já clicou também. O código antigo fica reservado para sempre, e as vendas que já existem continuam dele.
            </p>
          </div>
          <Campo id="codigo-novo" rotulo="Código novo" ajuda="De 4 a 15 letras e números." erro={tocou ? erroNovo : ''}>
            <input
              id="codigo-novo"
              value={novo}
              onChange={(e) => setNovo(limparCodigo(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(tocou && erroNovo)}
              className={classeCampo(tocou && erroNovo) + ' figs font-bold tracking-[0.03em]'}
            />
          </Campo>
          <Campo id="codigo-confirma" rotulo={`Para confirmar, digite o código atual (${a.codigo})`} erro={tocou ? erroConfirma : ''}>
            <input
              id="codigo-confirma"
              value={confirma}
              onChange={(e) => setConfirma(limparCodigo(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(tocou && erroConfirma)}
              className={classeCampo(tocou && erroConfirma) + ' figs font-bold tracking-[0.03em]'}
            />
          </Campo>
        </>
      )}
    </GavetaAcao>
  )
}
