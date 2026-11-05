import test from 'node:test'
import assert from 'node:assert/strict'
import {
  acoesDisponiveis, centavosParaCampo, consultaDaLista, detalheDaAcao, dirPadrao, filtrosAtivos, FILTROS_VAZIOS, grauDoNivel, limparCodigo,
  mesPorExtenso, mesSeguinte, percentual, reaisParaCentavos, situacaoLancamento, textoFaltam, textoFechamento, validarConfig, validarNiveis,
} from '../../components/gestao/afiliados/afiliadosUtil.js'

test('valor em campo de texto vira centavos sem conta com decimais', () => {
  assert.equal(reaisParaCentavos('89,90'), 8990)
  assert.equal(reaisParaCentavos('R$ 1.234,5'), 123450)
  assert.equal(reaisParaCentavos('50'), 5000)
  assert.equal(reaisParaCentavos('0,07'), 7)
  assert.equal(reaisParaCentavos('1,234'), null)
  assert.equal(reaisParaCentavos('abc'), null)
  assert.equal(reaisParaCentavos(''), null)
  assert.equal(reaisParaCentavos('-5'), null)
  assert.equal(centavosParaCampo(8990), '89,90')
  assert.equal(centavosParaCampo(5000), '50')
  assert.equal(centavosParaCampo(5), '0,05')
})

test('consulta da lista só leva o que foi escolhido', () => {
  assert.equal(consultaDaLista(FILTROS_VAZIOS), '')
  const f = { ...FILTROS_VAZIOS, q: ' ana ', status: 'ativo', nivel: 'sem', saldo: true, perto: true, ordem: 'faltam', dir: 'asc' }
  assert.equal(consultaDaLista(f, 3), 'q=ana&status=ativo&nivel=sem&ordem=faltam&dir=asc&saldo=1&perto=1&pagina=3')
  assert.equal(filtrosAtivos(f), 3)
  assert.equal(dirPadrao('nome'), 'asc')
  assert.equal(dirPadrao('vendas'), 'desc')
})

test('selo e texto do que falta para subir', () => {
  const niveis = [{ id: 2, vendas_minimas: 20 }, { id: 1, vendas_minimas: 1 }, { id: 3, vendas_minimas: 50 }]
  assert.equal(grauDoNivel({ id: 1 }, niveis), 1)
  assert.equal(grauDoNivel({ id: 3 }, niveis), 3)
  assert.equal(grauDoNivel(null, niveis), 0)
  assert.equal(textoFaltam({ proximo: 'Prata', faltam: 1 }), '1 venda para o Prata')
  assert.equal(textoFaltam({ proximo: 'Ouro', faltam: 7 }), '7 vendas para o Ouro')
  assert.equal(textoFaltam({ proximo: null, nivel: { id: 3 } }), 'No nível máximo')
  assert.equal(percentual(12.5), '12,5%')
  assert.equal(percentual(null), '—')
})

test('meses e status do fechamento', () => {
  assert.equal(mesSeguinte('2026-11'), '2026-12')
  assert.equal(mesSeguinte('2026-12'), '2027-01')
  assert.equal(mesPorExtenso('2026-12'), 'dezembro de 2026')
  assert.equal(textoFechamento({ status: 'rodado', rodou_em: '2026-11-08T11:10:00Z' }), 'Rodado em 08/11')
  assert.equal(textoFechamento({ status: 'parcial', faltam: 3 }), 'Parcial: faltam 3')
  assert.equal(textoFechamento({ status: 'pendente', liberado: true }), 'Pendente')
})

test('a tabela de níveis é conferida com as mesmas regras do servidor', () => {
  const ok = [{ nome: 'Bronze', vendas: '1', valor: '15', cor: '#b45309' }, { nome: 'Prata', vendas: '20', valor: '20', cor: '' }]
  const r = validarNiveis(ok)
  assert.deepEqual(r.niveis, [
    { nome: 'Bronze', vendas_minimas: 1, valor_por_venda_centavos: 1500, cor: '#b45309' },
    { nome: 'Prata', vendas_minimas: 20, valor_por_venda_centavos: 2000 },
  ])
  const ruim = validarNiveis([{ nome: 'A', vendas: '5', valor: '10', cor: 'azul' }, { nome: 'a', vendas: '5', valor: '10', cor: '' }])
  assert.equal(ruim.niveis, null)
  assert.ok(ruim.erros[0].cor)
  assert.ok(ruim.erros[1].nome) // repetido
  assert.ok(ruim.erros[1].vendas) // não cresce
  assert.ok(ruim.erros[1].valor) // não cresce
  assert.equal(validarNiveis([]).niveis, null)
  assert.ok(validarNiveis(Array.from({ length: 11 }, () => ok[0])).geral)
})

test('configurações: dia do fechamento, saque mínimo em reais e sem carência nem intervalo', () => {
  const base = { dia_fechamento: '8', saque_minimo: '50', aprovacao_automatica: false, programa_aberto: true }
  assert.deepEqual(validarConfig(base).valores, { dia_fechamento: 8, saque_minimo_centavos: 5000, aprovacao_automatica: false, programa_aberto: true })
  assert.ok(validarConfig({ ...base, dia_fechamento: '29' }).erros.dia_fechamento)
  assert.equal(validarConfig({ ...base, dia_fechamento: '' }).valores, null)
  assert.ok(validarConfig({ ...base, saque_minimo: '10001' }).erros.saque_minimo_centavos)
  // campos que saíram do contrato não voltam para o POST, mesmo que a tela mande
  assert.equal('carencia_dias' in validarConfig({ ...base, carencia_dias: '15' }).valores, false)
  assert.equal('intervalo_saque_dias' in validarConfig({ ...base, intervalo_saque_dias: '15' }).valores, false)
})

test('ações da ficha por status e papel', () => {
  assert.deepEqual(acoesDisponiveis('pendente', false), ['aprovar', 'anotar'])
  assert.deepEqual(acoesDisponiveis('ativo', true), ['suspender', 'travar_nivel', 'trocar_codigo', 'ajuste', 'anotar'])
  assert.deepEqual(acoesDisponiveis('suspenso', true), ['reativar', 'travar_nivel', 'trocar_codigo', 'ajuste', 'anotar'])
  assert.deepEqual(acoesDisponiveis('ativo', false), ['anotar'])
  assert.equal(limparCodigo(' ab-c1 d2 '), 'ABC1D2')
})

test('extrato e histórico de ações', () => {
  const agora = new Date('2026-11-05T12:00:00Z')
  assert.equal(situacaoLancamento({ status: 'pendente', disponivel_em: '2026-11-19T12:00:00Z' }, agora), 'Libera em 19/11')
  assert.equal(situacaoLancamento({ status: 'pendente', disponivel_em: '2026-11-01T12:00:00Z' }, agora), 'Disponível')
  assert.equal(situacaoLancamento({ status: 'cancelada' }, agora), 'Cancelado')
  assert.equal(detalheDaAcao('afiliado_suspenso', { motivo: 'fraude' }), 'Motivo: fraude')
  assert.equal(detalheDaAcao('afiliado_codigo_trocado', { de: 'A', para: 'B' }), 'De A para B')
  assert.equal(detalheDaAcao('afiliado_ajuste', { valor_centavos: -2000, motivo: 'duplicado' }), '−R$ 20. Motivo: duplicado')
  assert.equal(detalheDaAcao('x', null), '')
})
