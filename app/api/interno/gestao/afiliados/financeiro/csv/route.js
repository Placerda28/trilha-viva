import { getDB } from '@/lib/d1'
import { gerarCsv } from '@/lib/gestao/csv'
import { validarPeriodo } from '@/lib/gestao/datas'
import { cabecalhosPrivados, naoEncontrado, soAdmin } from '@/lib/gestao/permissao'
import { gravarRegistro } from '@/lib/gestao/registro'
import { LIMITE_CSV, TIPOS_CSV, dadosCsv } from '@/lib/afiliados/gestao-financeiro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const erro = (corpo, status) => Response.json({ ok: false, ...corpo }, { status, headers: cabecalhosPrivados })

const get = async (req, admin) => {
  const q = new URL(req.url).searchParams
  const tipo = String(q.get('tipo') || '')
  if (!TIPOS_CSV.includes(tipo)) return erro({ erro: 'Tipo inválido. Use comissoes, saques_pagos ou resumo_mensal.', campo: 'tipo' }, 400)
  const periodo = validarPeriodo(q.get('de'), q.get('ate'))
  if (!periodo.ok) return erro({ erro: periodo.erro }, 400)
  const db = getDB()
  if (!db) return erro({ erro: 'Banco indisponível no momento.' }, 503)

  const dados = await dadosCsv(db, tipo, periodo)
  if (dados.excedeu) return erro({ erro: `O período tem mais de ${LIMITE_CSV} linhas. Escolha um período menor.` }, 400)
  // Quem exportou fica registrado (o CSV de saques tem CPF e chave Pix).
  await gravarRegistro(db, {
    quem: String(admin.cliente.email || '').trim().toLowerCase(),
    acao: 'afiliados_exportar',
    alvo: tipo,
    detalhe: { tipo, de: periodo.de, ate: periodo.ate, linhas: dados.linhas.length },
  })
  return new Response(gerarCsv(dados.cabecalho, dados.linhas), {
    headers: {
      ...cabecalhosPrivados,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="afiliados-${tipo.replace('_', '-')}-${periodo.de}-a-${periodo.ate}.csv"`,
    },
  })
}

export const GET = soAdmin(get)
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
