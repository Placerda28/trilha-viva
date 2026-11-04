'use client'

import { useCallback } from 'react'
import { ApiProvider } from '@/components/afiliados/painel/api'
import { ganhos, pix, saques, vendas } from './fixtures'

// PROTÓTIPO TEMPORÁRIO: responde no lugar de /api/afiliados/* com os dados falsos.
export default function ApiFalsa({ variante, children }) {
  const chamar = useCallback(async (caminho, opcoes = {}) => {
    await new Promise((r) => setTimeout(r, 120))
    const [rota, consulta = ''] = caminho.split('?')
    const post = opcoes.method === 'POST'
    const corpo = post ? JSON.parse(opcoes.body || '{}') : null
    const ok = (c) => ({ ok: true, status: 200, corpo: c })
    if (rota.endsWith('/vendas')) return ok(vendas(variante, new URLSearchParams(consulta).get('mes')))
    if (rota.endsWith('/ganhos')) return ok(ganhos(variante))
    if (rota.endsWith('/saques')) return ok(saques(variante))
    if (rota.endsWith('/pix') && !post) return ok(pix(variante))
    if (rota.endsWith('/pix') && post) {
      if (corpo.senha !== 'senha123') return { ok: false, status: 401, corpo: { ok: false, erro: 'Senha incorreta.', campo: 'senha' } }
      return ok({ ok: true, pix: { tipo_chave: corpo.tipo_chave, chave_mascarada: '***', titular_nome: corpo.titular_nome, titular_cpf_mascarado: '***.***.***-**' } })
    }
    if (rota.endsWith('/saque')) return ok({ ok: true, valor_centavos: 24000, pedido_em: '2026-11-20 12:00:00' })
    if (rota.endsWith('/preferencias')) return ok({ ok: true, avisar_cada_venda: corpo.avisar_cada_venda })
    if (rota.endsWith('/avisos')) return ok({ ok: true })
    return { ok: false, status: 404, corpo: null }
  }, [variante])
  return <ApiProvider value={chamar}>{children}</ApiProvider>
}
