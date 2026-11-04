// PROTÓTIPO TEMPORÁRIO (Fase 7 de afiliados, frontend): saques falsos no formato
// do contrato do backend, e uma API falsa que também mexe nos dados (pagar tira
// da fila e põe em "Pagos"). Apagar junto com a pasta do protótipo.
// Nomes, CPFs e chaves são inventados.

const PIX = {
  JOAO27: { tipo_chave: 'cpf', chave: '52998224725', titular_nome: 'João da Silva Santos', titular_cpf: '52998224725' },
  MARIA10: { tipo_chave: 'email', chave: 'maria.oliveira@exemplo.com', titular_nome: 'Maria Oliveira Lima', titular_cpf: '11144477735' },
  PEDRO88: { tipo_chave: 'aleatoria', chave: '7c1f0b6e-2a4d-4c8e-9b53-0e5d2f8a91c4', titular_nome: 'Pedro Henrique Alves', titular_cpf: '39053344705' },
}

function inicial() {
  return [
    {
      id: 11, afiliado_id: 1, nome: 'Pedro Henrique Alves', codigo: 'PEDRO88', valor_centavos: 31500, status: 'solicitado',
      pedido_em: '2026-10-30 14:20:00', dias_esperando: 5, pago_em: null, nota: null, pix: PIX.PEDRO88, comprovante: false,
      creditos: [
        { descricao: 'Comissão de 6 vendas (Bronze)', valor_centavos: 9000 },
        { descricao: 'Comissão de 13 vendas (Prata)', valor_centavos: 26000 },
        { descricao: 'Estorno de 1 venda de outubro', valor_centavos: -3500 },
      ],
    },
    {
      id: 12, afiliado_id: 1, nome: 'João da Silva Santos', codigo: 'JOAO27', valor_centavos: 24000, status: 'solicitado',
      pedido_em: '2026-11-02 21:05:00', dias_esperando: 2, pago_em: null, nota: null, pix: PIX.JOAO27, comprovante: false,
      creditos: [
        { descricao: 'Comissão de 12 vendas (Prata)', valor_centavos: 24000 },
      ],
    },
    {
      id: 13, afiliado_id: 1, nome: 'Maria Oliveira Lima', codigo: 'MARIA10', valor_centavos: 9000, status: 'solicitado',
      pedido_em: '2026-11-04 09:40:00', dias_esperando: 0, pago_em: null, nota: null, pix: PIX.MARIA10, comprovante: false,
      creditos: [{ descricao: 'Comissão de 6 vendas (Bronze)', valor_centavos: 9000 }],
    },
    {
      id: 5, afiliado_id: 1, nome: 'Ana Paula Ferreira', codigo: 'ANAP21', valor_centavos: 45000, status: 'pago',
      pedido_em: '2026-10-21 10:00:00', dias_esperando: null, pago_em: '2026-10-22 16:30:00', nota: null, pix: PIX.JOAO27, comprovante: true, creditos: [],
    },
    {
      id: 4, afiliado_id: 1, nome: 'Lucas Martins', codigo: 'LUCAS5', valor_centavos: 15000, status: 'pago',
      pedido_em: '2026-10-12 08:15:00', dias_esperando: null, pago_em: '2026-10-14 11:10:00', nota: null, pix: PIX.MARIA10, comprovante: true, creditos: [],
    },
    {
      id: 3, afiliado_id: 1, nome: 'Carla Nunes', codigo: 'CARLA77', valor_centavos: 6000, status: 'recusado',
      pedido_em: '2026-10-18 19:45:00', dias_esperando: null, pago_em: null, pago_por: 'paulo@trilhaviva.org',
      nota: 'A chave Pix está em nome de outra pessoa. Corrija os dados Pix na aba Dados Pix e peça de novo.',
      pix: PIX.PEDRO88, comprovante: false, creditos: [],
    },
  ]
}

const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms))
const pausa = 220

function resumoDe(itens) {
  const pend = itens.filter((s) => s.status === 'solicitado')
  const pagos = itens.filter((s) => s.status === 'pago')
  return {
    pendentes_qtd: pend.length,
    pendentes_valor_centavos: pend.reduce((t, s) => t + s.valor_centavos, 0),
    pagos_30d_qtd: pagos.length,
    pagos_30d_valor_centavos: pagos.reduce((t, s) => t + s.valor_centavos, 0),
    tempo_medio_horas: pagos.length ? 38.4 : null,
    recusados_30d_qtd: itens.filter((s) => s.status === 'recusado').length,
  }
}

// `variante`: 'normal' | 'vazio' | 'sem-armazenamento' | 'email-falha'
export function criarApiFalsa(variante) {
  let itens = variante === 'vazio' ? [] : inicial()
  const ok = (dados, status = 200) => ({ ok: status < 400, status, dados })
  return {
    async listar(status) {
      await ESPERA(pausa)
      const filtro = { pendentes: 'solicitado', pagos: 'pago', recusados: 'recusado' }[status]
      const lista = itens.filter((s) => !filtro || s.status === filtro)
      return ok({ ok: true, resumo: resumoDe(itens), itens: lista, pagina: 1, por_pagina: 20, total: lista.length })
    },
    async enviar(id, arquivo, aoProgresso) {
      for (const p of [0.15, 0.4, 0.7, 1]) {
        await ESPERA(160)
        aoProgresso(p)
      }
      if (variante === 'sem-armazenamento') return ok({ ok: false, erro: 'Armazenamento não configurado.' }, 503)
      return ok({ ok: true, caminho: `afiliados-comprovantes/${id}/${arquivo.name}` })
    },
    async pagar(id) {
      await ESPERA(pausa)
      itens = itens.map((s) => (s.id === id ? { ...s, status: 'pago', pago_em: '2026-11-04 15:00:00', comprovante: true } : s))
      return ok({ ok: true, email_enviado: variante !== 'email-falha' })
    },
    async recusar(id, motivo) {
      await ESPERA(pausa)
      itens = itens.map((s) => (s.id === id ? { ...s, status: 'recusado', nota: motivo } : s))
      return ok({ ok: true, email_enviado: variante !== 'email-falha' })
    },
  }
}
