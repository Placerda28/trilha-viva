'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reais } from '@/lib/afiliados-campos'
import { diaMes } from '@/lib/afiliados-painel'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { enviar, useHttp } from './api'

// Botão "Sacar R$ X". Bloqueado, mostra o motivo numa frase (vem do servidor, com
// `abreEm` quando o saque só abre numa data) e, quando há um passo óbvio, o atalho
// para ele. Pedir saque abre uma confirmação. Regra: 1 saque por ciclo (do dia 8 ao dia 7), do saldo inteiro.
export default function SaqueBotao({ saque, irPara, onPedido }) {
  const chamar = useHttp()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState('pronto') // pronto | enviando | feito
  const [erro, setErro] = useState('')
  const rotulo = saque.valor > 0 ? `Sacar ${reais(saque.valor)}` : 'Sacar'

  async function confirmar() {
    setEstado('enviando')
    setErro('')
    const r = await enviar(chamar, '/api/afiliados/saque', {})
    if (r.ok && r.corpo?.ok) {
      setEstado('feito')
      onPedido?.(r.corpo)
      router.refresh()
      return
    }
    setEstado('pronto')
    setErro(r.corpo?.motivo || r.corpo?.erro || 'Não deu para pedir o saque agora. Tente de novo em instantes.')
  }

  function fechar(valor) {
    setAberto(valor)
    if (!valor) {
      setErro('')
      if (estado === 'feito') setEstado('pronto')
    }
  }

  if (saque.pode) {
    return (
      <>
        <button type="button" onClick={() => setAberto(true)} className="btn-signal mt-5 min-h-12 w-full">
          {rotulo}
        </button>
        <Dialog open={aberto} onOpenChange={fechar}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            {estado === 'feito' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Pedido enviado</DialogTitle>
                  <DialogDescription>
                    Seu saque de {reais(saque.valor)} está em análise. Você recebe por Pix na chave que cadastrou e acompanha tudo na aba Saques.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <button type="button" className="btn-ink min-h-11 px-6 py-3" onClick={() => { fechar(false); irPara?.('saques') }}>
                    Ver meus saques
                  </button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Pedir saque de {reais(saque.valor)}?</DialogTitle>
                  <DialogDescription>
                    O pedido leva o valor inteiro e vai por Pix para a chave que você cadastrou. O saque vale uma vez por mês. Enquanto o saque estiver em análise, os dados Pix ficam travados para alteração.
                  </DialogDescription>
                </DialogHeader>
                {erro && (
                  <p role="alert" className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] text-ink">
                    {erro}
                  </p>
                )}
                <DialogFooter>
                  <button type="button" className="btn-quiet min-h-11 px-6 py-3" onClick={() => fechar(false)} disabled={estado === 'enviando'}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-signal min-h-11 px-6 py-3 disabled:opacity-60" onClick={confirmar} disabled={estado === 'enviando'}>
                    {estado === 'enviando' ? 'Enviando…' : 'Confirmar saque'}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const motivo = saque.motivo || 'Saque indisponível no momento.'
  const abre = saque.abreEm ? diaMes(saque.abreEm) : ''
  // A data vem de `abreEm` (nunca do texto do motivo, que o servidor pode reescrever).
  const rotuloBloqueado = abre ? `Saque a partir de ${abre}` : rotulo
  const atalho = /chave pix/i.test(motivo)
    ? ['pix', 'Cadastrar chave Pix']
    : /em an[aá]lise|deste ciclo/i.test(motivo)
      ? ['saques', 'Ver meus saques']
      : null
  return (
    <>
      <button type="button" disabled aria-describedby="motivo-saque" className="btn mt-5 min-h-12 w-full cursor-not-allowed border border-line bg-paper text-ink-muted">
        {rotuloBloqueado}
      </button>
      <p id="motivo-saque" className="mt-3 text-[14.5px] leading-[1.55] text-ink">
        {motivo}
      </p>
      {atalho && (
        <button type="button" onClick={() => irPara?.(atalho[0])} className="link-signal mt-1 min-h-11">
          {atalho[1]}
        </button>
      )}
    </>
  )
}
