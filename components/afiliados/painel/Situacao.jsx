import { situacaoVenda } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'

// Cada situação tem cor (ponto), texto e fundo suave; o texto é sempre escuro
// sobre o fundo claro, então passa de AA sem depender da cor do ponto.
const TONS = {
  liberando: { ponto: '#D97706', fundo: '#FEF3C7', texto: '#6B3F00' },
  disponivel: { ponto: '#16A34A', fundo: '#DCFCE7', texto: '#0F4A26' },
  em_saque: { ponto: '#2563EB', fundo: '#DBEAFE', texto: '#183A8C' },
  paga: { ponto: '#FFFFFF', fundo: '#E7E8EB', texto: '#2B2B2B', aro: '#6B7280' },
  cancelada: { ponto: '#E5152D', fundo: '#FDEDEF', texto: '#8F0C1D' },
  solicitado: { ponto: '#D97706', fundo: '#FEF3C7', texto: '#6B3F00' },
  pago: { ponto: '#16A34A', fundo: '#DCFCE7', texto: '#0F4A26' },
  recusado: { ponto: '#E5152D', fundo: '#FDEDEF', texto: '#8F0C1D' },
}

export function Selo({ chave, texto, className = '' }) {
  const t = TONS[chave] || TONS.paga
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px] font-semibold leading-none ${className}`}
      style={{ background: t.fundo, color: t.texto }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: t.ponto, boxShadow: t.aro ? `inset 0 0 0 1.5px ${t.aro}` : undefined }}
        aria-hidden="true"
      />
      {texto}
    </span>
  )
}

export default function SituacaoVenda({ item }) {
  const s = situacaoVenda(item)
  return (
    <span className="inline-flex items-center gap-2">
      <Selo chave={s.chave} texto={s.texto} />
      {s.chave === 'cancelada' && (
        <Ajuda titulo="Venda cancelada">
          <p>A compra foi devolvida ao comprador, por isso ela não conta para a sua meta e a comissão sai.</p>
        </Ajuda>
      )}
    </span>
  )
}

export const ROTULO_SAQUE = { solicitado: 'Solicitado', pago: 'Pago', recusado: 'Recusado' }
