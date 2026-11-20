'use client'

import { useCallback, useState } from 'react'
import { Aviso } from '@/components/ds'
import { EMAIL_SUPORTE } from '@/lib/site'
import TituloConta from '../TituloConta'
import { AvisarCadaVenda, AvisosAfiliado } from './AvisosAfiliado'
import { CartaoMes, CartaoReceber } from './CartoesAfiliado'
import DetalhesAfiliado from './DetalhesAfiliado'
import PagamentosAfiliado from './PagamentosAfiliado'
import SeuLink from './SeuLink'

const CONFIG_PADRAO = { diaFechamento: 8 }
const SUBTITULO = 'Seu link, suas vendas do mês e seus pagamentos.'

// Afiliado, para quem já tem código (MUDANÇAS §7): o painel atual com o visual
// novo. Mesmos dados (dadosDoPainel), mesmas regras e mesmas rotas /api/afiliados/*.
//   status: 'ativo' | 'pendente' | 'suspenso'   (pendente e suspenso sem painel)
export default function AfiliadoConta({ afiliado, painel = {}, emailSuporte = EMAIL_SUPORTE }) {
  const { dados, config, avisarCadaVenda } = painel
  const cfg = { ...CONFIG_PADRAO, ...(config || {}) }
  const [abertos, setAbertos] = useState({})
  const [versao, setVersao] = useState(0)
  const mudar = useCallback((id, aberto) => setAbertos((a) => (a[id] === aberto ? a : { ...a, [id]: aberto })), [])
  const abrirPix = useCallback(() => {
    setAbertos((a) => ({ ...a, pix: true }))
    setTimeout(() => document.getElementById('detalhe-pix')?.scrollIntoView({ block: 'start' }), 50)
  }, [])

  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo="Afiliado" subtitulo={SUBTITULO} />

      {afiliado.status === 'pendente' && (
        <div role="status" className="flex max-w-[640px] items-start gap-3.5 border border-ink p-5">
          <div className="flex flex-col gap-1">
            <strong className="text-[17px] font-[650]">Cadastro recebido</strong>
            <span className="text-[15px] leading-[1.5] text-text-2">
              Estamos conferindo seus dados. Avisamos no seu e-mail quando o seu link estiver liberado.
            </span>
          </div>
        </div>
      )}
      {afiliado.status === 'suspenso' && (
        <Aviso variante="erro" titulo="Sua conta de afiliado está suspensa.">
          Fale com a gente em{' '}
          <a href={`mailto:${emailSuporte}`} className="font-semibold underline underline-offset-[3px]">
            {emailSuporte}
          </a>
          .
        </Aviso>
      )}

      {dados && <AvisosAfiliado avisos={dados.avisos} />}
      <SeuLink codigo={afiliado.codigo} link={afiliado.link} />

      {dados && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
            <CartaoMes d={dados} />
            <CartaoReceber d={dados} onPix={abrirPix} onPedido={() => setVersao((v) => v + 1)} />
          </div>
          <PagamentosAfiliado key={versao} />
          <AvisarCadaVenda inicial={avisarCadaVenda} />
          <DetalhesAfiliado dados={dados} config={cfg} abertos={abertos} onMudar={mudar} />
        </>
      )}
    </div>
  )
}
