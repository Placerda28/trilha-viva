import test from 'node:test'
import assert from 'node:assert/strict'
import {
  agruparDias, corDoNivel, fracao, linkSeguro, mesCurto, mesLongo, ordenarNiveis, pctTexto, resumoGravidades, rotuloDoLink, separarAviso, urlResolver,
} from '../../components/gestao/afiliados/painelUtil.js'

test('meses e porcentagens em português', () => {
  assert.equal(mesCurto('2026-10'), 'out/26')
  assert.equal(mesLongo('2026-03'), 'março de 2026')
  assert.equal(pctTexto(95.3), '95,3%')
  assert.equal(pctTexto(0), '0,0%')
  assert.equal(pctTexto(null), '—')
})

test('fracao: pct do servidor vira fração e null continua null', () => {
  assert.equal(fracao({ pct: 12.4 }), 0.124)
  assert.equal(fracao({ pct: null }), null)
  assert.equal(fracao(undefined), null)
})

test('níveis: Bronze, Prata e Ouro primeiro; cor por nome ou cinza fixo', () => {
  assert.deepEqual(ordenarNiveis(['Ouro', 'Diamante', 'Bronze', 'Prata']), ['Bronze', 'Prata', 'Ouro', 'Diamante'])
  assert.equal(corDoNivel('bronze'), '#A0521D')
  assert.equal(corDoNivel('Diamante', 0), '#0D0D0D')
})

test('aviso de vendas sem taxa é separado da frase', () => {
  const { principal, aviso } = separarAviso('De 01/10 a 05/10, tudo certo. Atenção: 3 vendas antigas não têm a taxa.')
  assert.equal(principal, 'De 01/10 a 05/10, tudo certo.')
  assert.equal(aviso, 'Atenção: 3 vendas antigas não têm a taxa.')
  assert.deepEqual(separarAviso('Sem aviso.'), { principal: 'Sem aviso.', aviso: '' })
})

test('agruparDias: até 92 dias uma coluna por dia; depois semanas e blocos de 30', () => {
  const serie = (n) => Array.from({ length: n }, (_, i) => ({ dia: `d${i}`, rotulo: `r${i}`, diretas: 1, afiliados: 2 }))
  assert.equal(agruparDias(serie(30), ['diretas', 'afiliados']).length, 30)
  const semanas = agruparDias(serie(100), ['diretas', 'afiliados'])
  assert.equal(semanas.length, 15)
  assert.equal(semanas[0].diretas, 7)
  assert.equal(semanas[14].afiliados, 4)
  assert.equal(agruparDias(serie(731), ['diretas']).length, 25)
})

test('alertas: link só do painel de afiliados, chave codificada no caminho', () => {
  assert.equal(linkSeguro('/gestao/afiliados/lista?afiliado=7'), '/gestao/afiliados/lista?afiliado=7')
  assert.equal(linkSeguro('https://exemplo.com'), '/gestao/afiliados/alertas')
  assert.equal(linkSeguro('/gestao/afiliadosX'), '/gestao/afiliados/alertas')
  assert.equal(rotuloDoLink('/gestao/afiliados/saques'), 'Abrir saques')
  assert.equal(urlResolver('saque_atrasado:11'), '/api/gestao/afiliados/alertas/saque_atrasado%3A11/resolver')
  assert.deepEqual(resumoGravidades({ alta: 2, media: 0, baixa: 1 }).map((g) => g.id), ['alta', 'baixa'])
})
