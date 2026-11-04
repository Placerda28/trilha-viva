import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diaMes, dataBr, rotuloMes, rotuloMesCurto, mesesParaFiltro, reaisSinal, corMetal, contraste,
  posicoesDaBarra, alinhamento, textoRitmo, textoDias, serieDoMes, resumoGrafico, situacaoVenda,
  linkInterno, painelVazio, vendasTxt,
} from '../../lib/afiliados-painel.js'

const NIVEIS = [
  { nome: 'Bronze', vendas_minimas: 1, valor_por_venda_centavos: 1500, cor: '#b45309' },
  { nome: 'Prata', vendas_minimas: 20, valor_por_venda_centavos: 2000, cor: '#94a3b8' },
  { nome: 'Ouro', vendas_minimas: 50, valor_por_venda_centavos: 3000, cor: '#eab308' },
]

test('datas: dia do calendário fica; UTC passa para Brasília', () => {
  assert.equal(diaMes('2026-12-08'), '08/12')
  assert.equal(dataBr('2026-12-08'), '08/12/2026')
  // 01:30 UTC de 05/11 ainda é 04/11 em Brasília
  assert.equal(diaMes('2026-11-05 01:30:00'), '04/11')
  assert.equal(dataBr('2026-11-05 12:00:00'), '05/11/2026')
  assert.equal(diaMes(''), '')
  assert.equal(diaMes('lixo'), '')
})

test('rótulos de mês e filtro', () => {
  assert.equal(rotuloMes('2026-11'), 'Novembro/2026')
  assert.equal(rotuloMesCurto('2026-10'), 'Out/26')
  assert.equal(rotuloMes('xx'), '')
  assert.deepEqual(mesesParaFiltro('2026-02', 3), ['2026-02', '2026-01', '2025-12'])
})

test('dinheiro com sinal (negativo com centavos não quebra)', () => {
  assert.equal(reaisSinal(1500), '+R$ 15')
  assert.equal(reaisSinal(-1550), '−R$ 15,50')
  assert.equal(reaisSinal(0), 'R$ 0')
})

test('metal: contraste do traço sobre o selo passa de 3 nos três níveis', () => {
  for (const n of NIVEIS) {
    const m = corMetal(n.cor)
    assert.ok(contraste(m.texto, m.base) >= 3, `${n.nome} base`)
    assert.ok(contraste(m.texto, m.brilho) >= 3 || contraste(m.texto, m.claro) >= 3, `${n.nome} brilho`)
  }
  assert.equal(corMetal('lixo').base, '#8A8A8A')
})

test('barra: marcos 1, 20 e 50 na escala de 0 a 50', () => {
  const b = posicoesDaBarra(NIVEIS, 27)
  assert.equal(b.max, 50)
  assert.equal(b.atual, 54)
  assert.deepEqual(b.marcos.map((m) => m.pct), [2, 40, 100])
  assert.equal(posicoesDaBarra(NIVEIS, 80).atual, 100)
  assert.equal(posicoesDaBarra(NIVEIS, 0).atual, 0)
  assert.equal(alinhamento(2), 'inicio')
  assert.equal(alinhamento(40), 'meio')
  assert.equal(alinhamento(100), 'fim')
})

test('ritmo e dias em português simples', () => {
  assert.equal(textoRitmo(2), '2 vendas por dia')
  assert.equal(textoRitmo(1.5), '1,5 vendas por dia')
  assert.equal(textoRitmo(1), '1 venda por dia')
  assert.equal(textoRitmo(0.25), '1 venda a cada 4 dias')
  assert.equal(textoRitmo(null), '')
  assert.equal(textoDias(12), 'Faltam 12 dias')
  assert.equal(textoDias(1), 'Falta 1 dia')
  assert.equal(textoDias(0), 'Último dia do mês')
  assert.equal(vendasTxt(1), '1 venda')
})

test('série do mês: um item por dia, zero onde não houve venda', () => {
  const s = serieDoMes('2026-11', [{ dia: '2026-11-03', vendas: 2 }, { dia: '2026-11-30', vendas: 5 }])
  assert.equal(s.length, 30)
  assert.equal(s[2].vendas, 2)
  assert.equal(s[0].vendas, 0)
  assert.equal(serieDoMes('2028-02', []).length, 29)
  const r = resumoGrafico(s, 'novembro')
  assert.equal(r.total, 7)
  assert.equal(r.melhor.dia, 30)
  assert.match(resumoGrafico(serieDoMes('2026-11', []), 'novembro').texto, /Nenhuma venda/)
})

test('situação das vendas', () => {
  assert.equal(situacaoVenda({ situacao: 'liberando', situacaoEm: '2026-11-06 03:00:00' }).texto, 'Liberando em 06/11')
  assert.equal(situacaoVenda({ situacao: 'paga', situacaoEm: '2026-11-02' }).texto, 'Paga em 02/11')
  assert.equal(situacaoVenda({ situacao: 'cancelada' }).texto, 'Cancelada (reembolso)')
  assert.equal(situacaoVenda({ situacao: 'disponivel' }).chave, 'disponivel')
})

test('link de aviso: só caminho do próprio site', () => {
  assert.equal(linkInterno('/minha-conta/afiliado#saques'), '/minha-conta/afiliado#saques')
  assert.equal(linkInterno('//evil.com'), '')
  assert.equal(linkInterno('https://evil.com'), '')
  assert.equal(linkInterno('/\\evil.com'), '')
})

test('painel vazio só para afiliado sem nada', () => {
  assert.equal(painelVazio({ vendasValidas: 0, ultimasVendas: [], cartoes: { jaRecebido: 0 } }), true)
  assert.equal(painelVazio({ vendasValidas: 0, ultimasVendas: [], cartoes: { jaRecebido: 900 } }), false)
  assert.equal(painelVazio({ vendasValidas: 0, ultimasVendas: [], cartoes: {}, mesPassado: { vendas: 3 } }), false)
})
