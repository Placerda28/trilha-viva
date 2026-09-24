export function formaDoMP(pagamento) {
  const metodo = String(pagamento?.payment_method_id || '').toLowerCase()
  const tipo = String(pagamento?.payment_type_id || '').toLowerCase()
  // O Mercado Pago pode identificar o Pix pelo método ou apenas pela família
  // bank_transfer, dependendo do ponto da vida do pagamento.
  if (metodo === 'pix' || tipo === 'bank_transfer') return 'pix'
  if (tipo === 'credit_card' || tipo === 'debit_card' || tipo === 'prepaid_card') return 'cartao'
  return 'outro'
}

function dadosDaCompra(linha) {
  if (Object.hasOwn(linha, 'compra_id')) {
    return {
      id: linha.compra_id,
      origem: linha.compra_origem,
      forma: linha.compra_forma,
      definir(forma) {
        linha.compra_forma = forma
      },
    }
  }
  return {
    id: linha.id,
    origem: linha.stripe_session_id,
    forma: linha.forma_pagamento,
    definir(forma) {
      linha.forma_pagamento = forma
    },
  }
}

// Os imports são feitos só quando há trabalho de cache. Assim formaDoMP segue
// pura e pode ser testada pelo Node sem carregar Next/OpenNext.
export async function preencherFormas(linhas, maximoMp = 5) {
  const candidatas = (linhas || []).map(dadosDaCompra).filter((c) => c.id && !c.forma)
  if (!candidatas.length) return { consultas_mp: 0 }

  const { getDB, executar } = await import('@/lib/d1')
  const db = getDB()
  if (!db) return { consultas_mp: 0 }

  const stripe = candidatas.filter(
    (c) => String(c.origem || '').startsWith('cs_live_') || String(c.origem || '').startsWith('cs_test_')
  )
  await Promise.all(
    stripe.map(async (compra) => {
      const resultado = await executar(
        db,
        'UPDATE compras SET forma_pagamento = ? WHERE id = ? AND forma_pagamento IS NULL',
        'cartao',
        compra.id
      )
      // Mesmo que outra requisição tenha gravado primeiro, esta linha já pode
      // exibir o valor conhecido sem fazer uma leitura extra do banco.
      if (resultado) compra.definir('cartao')
    })
  )

  const mercadoPago = candidatas
    .filter((c) => String(c.origem || '').startsWith('mp_'))
    .slice(0, Math.max(0, Math.min(5, Number(maximoMp) || 0)))
  if (!mercadoPago.length) return { consultas_mp: 0 }

  const { buscarPagamento } = await import('@/lib/mercadopago')

  await Promise.all(
    mercadoPago.map(async (compra) => {
      const pagamentoId = String(compra.origem).slice(3)
      try {
        const forma = formaDoMP(await buscarPagamento(pagamentoId))
        const resultado = await executar(
          db,
          'UPDATE compras SET forma_pagamento = ? WHERE id = ? AND forma_pagamento IS NULL',
          forma,
          compra.id
        )
        if (resultado) compra.definir(forma)
      } catch (erro) {
        // Uma indisponibilidade da operadora não pode derrubar a gestão.
        console.warn('gestao forma mp', pagamentoId, erro?.message)
      }
    })
  )

  return { consultas_mp: mercadoPago.length }
}
