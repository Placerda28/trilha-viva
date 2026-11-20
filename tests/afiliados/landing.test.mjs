// Landing pública /afiliados: textos da regra de 05/11, acesso rápido de quem já é afiliado
// e página estática (não lê banco, cookie nem searchParams).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voltaPermitida } from '../../lib/afiliados-campos.js'
import { ROTA_AFILIADO } from '../../components/afiliados/landing/rotas.js'

const ler = (p) => readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, '')
const PAGINA = ler('app/afiliados/page.js')
const SIM = ler('components/afiliados/Simulador.jsx')
const ESCADA = ler('components/afiliados/landing/EscadaMetas.jsx')

test('textos: sem prazo de 7 dias, sem garantido/bônus e sem cupom', () => {
  for (const [nome, fonte] of [['page', PAGINA], ['Simulador', SIM], ['EscadaMetas', ESCADA]]) {
    assert.doesNotMatch(fonte, /cupom|garantido|bônus de nível|carenciaDias|intervaloSaqueDias|7 dias/i, nome)
  }
})

test('regras: mês fecha no dia 8 com reembolsos descontados e Pix no CPF do afiliado', () => {
  assert.match(PAGINA, /O mês fecha no dia \$\{diaFechamento\} do mês seguinte, já descontando os reembolsos/)
  assert.match(PAGINA, /A partir do dia \$\{diaFechamento\} você pede o pagamento do mês anterior por Pix, uma vez por mês/)
  assert.match(PAGINA, /até o dia \$\{diaFechamento - 1\} do mês seguinte/)
  assert.doesNotMatch(PAGINA, /todo dia/)
  assert.match(PAGINA, /chave no CPF do próprio afiliado/)
})

test('acesso rápido: "Já sou afiliado" no topo e no fim; barra fixa do celular com "Quero ser afiliado"; tudo para a área do afiliado', () => {
  assert.equal(ROTA_AFILIADO, '/minha-conta/afiliado')
  assert.equal(voltaPermitida(ROTA_AFILIADO), ROTA_AFILIADO) // a volta do login é permitida
  assert.equal((PAGINA.match(/ROTULO_JA_SOU\}/g) || []).length, 2) // topo e chamada final
  assert.match(PAGINA, /Já sou afiliado: entrar na minha área/)
  assert.match(PAGINA, /<BarraAfiliado maximo=/)
  const barra = ler('components/afiliados/landing/BarraAfiliado.jsx')
  assert.match(barra, /Quero ser afiliado/)
  assert.match(barra, /href=\{ROTA_AFILIADO\}/)
})

test('a página segue estática: sem cookie, banco, searchParams nem dynamic', () => {
  assert.doesNotMatch(PAGINA, /cookies\(|headers\(|getDB|clienteAtual|searchParams|force-dynamic|export const dynamic/)
})

test('simulador: sem as linhas de garantido e bônus, com a frase "N vendas = Nível = R$ X no mês"', () => {
  assert.match(SIM, /= \$\{nomeNivel\} = \$\{moeda\(total\)\} no mês/)
})

test('movimento só com permissão: moeda (convite do acervo) e barra respeitam prefers-reduced-motion', () => {
  assert.match(ler('components/afiliados/landing/Moeda3D.jsx'), /prefers-reduced-motion: reduce/)
  const css = readFileSync('app/afiliados/landing.css', 'utf8')
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/)
  assert.match(css, /\.barra-afi\b/)
})

test('visual novo: medalhas preto e branco na landing, sem a moeda 3D colorida', () => {
  for (const [nome, fonte] of [['page', PAGINA], ['Simulador', SIM], ['EscadaMetas', ESCADA]]) {
    assert.doesNotMatch(fonte, /Moeda3D|corMetal|nivel\.cor|ouro\.cor|bronze\.cor/, nome)
  }
  assert.match(PAGINA, /MedalhaPB/)
})
