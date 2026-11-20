'use client'

import { useUsuario } from '@/components/usuario'
import { BotaoCompra } from '@/components/ds'
import { priceBRL, site } from '@/lib/site'

// Esconde o conteúdo de venda de quem já tem o pacote. As páginas são estáticas
// (o servidor não sabe quem está olhando): nasce visível, e some depois que o
// navegador confirma o estado em /api/conta/estado (components/usuario.js).
export default function SemPacote({ children }) {
  return useUsuario() === 'com-pacote' ? null : children
}

// O botão de compra do alto das páginas de catálogo, com a linha de preço.
export function CompraNoTopo({ linha = 'todas as músicas' }) {
  return (
    <SemPacote>
      <div className="flex flex-[0_1_300px] flex-col gap-1.5">
        <BotaoCompra bloco />
        <span className="figs text-center text-[14px] text-text-3">
          {priceBRL(site.price)} · pagamento único · {linha}
        </span>
      </div>
    </SemPacote>
  )
}
