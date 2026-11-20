'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao, Icone } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { diaMes } from '@/lib/afiliados-painel'
import { enviar, useHttp } from '@/components/afiliados/painel/api'
import { valorEmReais } from '@/lib/conta-pedidos'

// "Pedir pagamento por Pix": a mesma regra e a mesma rota do botão Sacar
// anterior (POST /api/afiliados/saque, 1 pedido por ciclo, do saldo inteiro).
// Bloqueado, mostra o motivo que o servidor mandou e, quando há um passo óbvio,
// o atalho para ele.
export default function PedirSaque({ saque, onPix, onPedido }) {
  const chamar = useHttp()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState('')

  async function confirmar() {
    setEnviando(true)
    setErro('')
    const r = await enviar(chamar, '/api/afiliados/saque', {})
    setEnviando(false)
    if (r.ok && r.corpo?.ok) {
      setAberto(false)
      setFeito(r.corpo.pedido_em || new Date().toISOString().slice(0, 19).replace('T', ' '))
      onPedido?.()
      router.refresh()
      return
    }
    setErro(r.corpo?.motivo || r.corpo?.erro || 'Não deu para pedir o pagamento agora. Tente de novo em instantes.')
  }

  if (feito) {
    return (
      <p role="status" className="mt-auto flex items-center gap-2 bg-surface px-3.5 py-3 text-[15px] font-semibold">
        <Icone nome="relogio" tamanho={18} />
        Pedido feito em {diaMes(feito)}. Pagamento em análise.
      </p>
    )
  }

  if (!saque.pode) {
    const motivo = saque.motivo || 'O pedido de pagamento está indisponível no momento.'
    const querPix = /chave pix/i.test(motivo)
    return (
      <div className="mt-auto flex flex-col gap-2">
        <Botao disabled aria-describedby="motivo-saque">
          Pedir pagamento por Pix
        </Botao>
        <p id="motivo-saque" className="text-[14px] leading-[1.5] text-text-2">
          {motivo}
        </p>
        {querPix && onPix && (
          <button type="button" onClick={onPix} className="min-h-11 self-start text-[15px] font-semibold underline underline-offset-[3px]">
            Cadastrar chave Pix
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <Botao onClick={() => setAberto(true)} className="mt-auto">
        Pedir pagamento por Pix
      </Botao>
      <Dialog open={aberto} onOpenChange={(v) => !enviando && setAberto(v)}>
        <DialogContent className="max-w-[min(460px,calc(100vw-2rem))] gap-3.5 rounded-none border-ink p-6 shadow-[0_12px_32px_rgba(0,0,0,.25)]">
          <DialogTitle className="font-semi-condensed pr-10 text-[24px] font-bold leading-[1.1]">
            Pedir o pagamento de {valorEmReais(saque.valor)}?
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-[1.55] text-text-2">
            O pedido leva o valor inteiro e vai por Pix para a chave que você cadastrou. O pagamento vale uma vez por mês.
            Enquanto o pedido estiver em análise, os dados Pix ficam travados para alteração.
          </DialogDescription>
          {erro && (
            <p role="alert" className="border border-red-text bg-red-tint px-3.5 py-3 text-[15px] font-semibold">
              {erro}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2.5">
            <Botao onClick={confirmar} carregando={enviando} tamanho="lg" className="flex-[1_1_180px]">
              Confirmar pedido
            </Botao>
            <Botao variante="contorno" onClick={() => setAberto(false)} disabled={enviando} tamanho="lg" className="flex-[1_1_140px]">
              Cancelar
            </Botao>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
