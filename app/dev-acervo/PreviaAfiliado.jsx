'use client'

import { ApiProvider } from '@/components/afiliados/painel/api'
import AfiliadoConta from '@/components/conta/afiliado/AfiliadoConta'
import AfiliadoNovo from '@/components/conta/afiliado/AfiliadoNovo'

// Só para a prévia de desenvolvimento (/dev-acervo): o painel do afiliado com
// dados de mentira e uma "API" que responde na hora, sem banco nem sessão.
const NIVEIS = [
  { id: 1, nome: 'Bronze', cor: '#B87333', vendas_minimas: 10, valor_por_venda_centavos: 1500 },
  { id: 2, nome: 'Prata', cor: '#9CA3AF', vendas_minimas: 20, valor_por_venda_centavos: 2000 },
  { id: 3, nome: 'Ouro', cor: '#D4A017', vendas_minimas: 50, valor_por_venda_centavos: 3000 },
]

const SAQUES = [
  { id: 2, valor_centavos: 18000, status: 'pago', pedido_em: '2026-10-08 14:00:00', pago_em: '2026-10-09 15:00:00', nota: null, temComprovante: true },
  { id: 1, valor_centavos: 9000, status: 'recusado', pedido_em: '2026-09-08 14:00:00', pago_em: null, nota: 'A chave Pix não bate com o CPF do cadastro.', temComprovante: false },
]

async function apiDeMentira(caminho, opcoes = {}) {
  const ok = (corpo) => ({ ok: true, status: 200, corpo })
  if (caminho.startsWith('/api/afiliados/saques')) return ok({ ok: true, itens: SAQUES, proximoSaqueEm: null })
  if (caminho === '/api/afiliados/saque') return ok({ ok: true, valor_centavos: 22500, pedido_em: '2026-11-20 15:00:00' })
  if (caminho === '/api/afiliados/pix' && !opcoes.method) return ok({ ok: true, pix: null, bloqueado: false, motivo: null })
  if (caminho.startsWith('/api/afiliados/')) return ok({ ok: true })
  return { ok: false, status: 404, corpo: null }
}

function dadosDeMentira(estado) {
  return {
    mes: '2026-11',
    diasRestantes: 10,
    nivel: NIVEIS[1],
    proximo: NIVEIS[2],
    faltam: 27,
    vendasValidas: 23,
    niveis: NIVEIS,
    aReceber: { mes: '2026-11', valor: 46000, liberaEm: '2026-12-08' },
    aReceberMesAnterior: null,
    disponivel: 22500,
    emSaque: 0,
    jaRecebido: 18000,
    saque:
      estado === 'sem-pix'
        ? { pode: false, valor: 22500, motivo: 'Cadastre sua chave Pix para sacar', abreEm: null }
        : { pode: true, valor: 22500, motivo: null, abreEm: null },
    mesPassado: { mes: '2026-10', vendas: 15, nivel: NIVEIS[0], total: 22500 },
    ultimasVendas: [],
    vendasPorDia: [],
    avisos: [{ id: 1, tipo: 'nivel', titulo: 'Você chegou ao nível Prata', texto: 'Todas as vendas do mês passam a valer R$ 20.', link: '/afiliados' }],
  }
}

export default function PreviaAfiliado({ estado = 'ativo' }) {
  return (
    <ApiProvider value={apiDeMentira}>
      {estado === 'novo' ? (
        <AfiliadoNovo nome="Ana Souza" niveis={NIVEIS} aberto />
      ) : (
        <AfiliadoConta
          afiliado={{ codigo: 'ANASOUZA', status: estado === 'pendente' ? 'pendente' : estado === 'suspenso' ? 'suspenso' : 'ativo', link: 'https://trilhaviva.org/?ref=ANASOUZA' }}
          painel={{ dados: estado === 'pendente' ? null : dadosDeMentira(estado), avisarCadaVenda: true, config: { diaFechamento: 8 } }}
          emailSuporte="trilhaviva.suporte@gmail.com"
        />
      )}
    </ApiProvider>
  )
}
