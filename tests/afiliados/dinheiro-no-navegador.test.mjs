// Fase 11, item 3: nenhum cálculo de dinheiro acontece no navegador.
// Varre os arquivos que vão para o cliente (components/afiliados, components/gestao/afiliados e lib/afiliados-*.js)
// atrás de conta (+ - * /) com valor em centavos. Formatar (centavos / 100 para texto), converter o que o admin digitou
// (reais -> centavos), medir barra de gráfico e comparar com limite são permitidos e estão na lista abaixo, com o motivo.
// Linha nova com conta de dinheiro faz o teste falhar: quem cria decide se vai para a lista ou para o servidor.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const listar = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? listar(p) : /\.(jsx?|mjs)$/.test(n) ? [p] : []
  })
const ARQUIVOS = [
  ...listar('components/afiliados'),
  ...listar('components/gestao/afiliados'),
  ...readdirSync('lib').filter((n) => /^afiliados-.*\.js$/.test(n)).map((n) => join('lib', n)),
]

const DIN = String.raw`(?:[cC]entavos|[vV]alor|[sS]aldo|[tT]otal|[bB]onus|[cC]omiss|[dD]isponivel|[gG]arantido|[lL]iquid|[lL]ucro|[cC]usto|[rR]eceita)`
const CONTA = new RegExp(String.raw`[\w$.\[\]?()]*${DIN}[\w$.\[\]?()]*\s+[-+*/]\s+[\w$(]|[\w$)\]]\s+[-+*/]\s+[\w$.]*${DIN}\b|${DIN}[^;]*(?:\* ?100|/ ?100)\b`)
const COMENTARIO_OU_MARCACAO = /^(\/\/|\*|\/\*|\{\/\*)|className|^import |aria-|\bid=|htmlFor|rotulo=|<\//

// [arquivo, trecho da linha, por que é permitido]
const PERMITIDAS = [
  ['components/afiliados/EscadaNiveis.jsx', 'valor_por_venda_centavos / maior', 'largura da barra (proporção visual), não aparece como valor'],
  ['components/gestao/afiliados/afiliadosUtil.js', '* 100 + Number(resto', 'o que o admin digitou em reais vira centavos para ENVIAR; o servidor revalida'],
  ['components/gestao/afiliados/afiliadosUtil.js', 'Math.floor(c / 100)', 'formata centavos de volta para o campo de texto'],
  ['components/gestao/afiliados/saquesUtil.js', '/ 100).toLocaleString', 'formata o valor do Pix para copiar'],
  ['components/gestao/afiliados/ficha/Ajuste.jsx', '-centavos', 'só o sinal do ajuste digitado; o servidor aplica e valida'],
  ['components/gestao/afiliados/graficos/Colunas.jsx', 'valores[s.id]', 'altura das colunas do gráfico'],
  ['components/gestao/afiliados/graficos/Colunas.jsx', 's.id + p.chave', 'só junta texto para a chave do React'],
  ['components/gestao/afiliados/dashboard/Graficos.jsx', 'f.cliques + f.checkouts + f.vendas', 'conta de eventos (não é dinheiro) só para decidir se o gráfico está vazio'],
  ['components/gestao/afiliados/graficos/Funil.jsx', 'f.vendas + f.estornos.total', 'conta de vendas (não é dinheiro): base da barra do funil'],
  ['components/gestao/afiliados/graficos/Funil.jsx', '(valor / base) * 100', 'largura da barra do funil (contagens de cliques, checkouts e vendas)'],
  ['components/gestao/afiliados/graficos/Origem.jsx', '(v / total) * 100', 'percentual de vendas por forma de pagamento (contagem)'],
  ['components/gestao/afiliados/apiSaques.js', 'e.loaded / e.total', 'progresso do envio do arquivo (bytes)'],
  ['lib/afiliados-simulador.js', 'depois.total - antes.total', 'montado NO BUILD da landing (server component); o navegador só recebe o número pronto'],
  ['lib/afiliados-simulador.js', '/ 100).replace', 'formata centavos em R$'],
  ['lib/afiliados-painel.js', 'Math.abs(c)', 'mostra o valor sem o sinal (formatação)'],
]
const permitida = (arq, linha) => PERMITIDAS.some(([a, trecho]) => arq.replaceAll('\\', '/') === a && linha.includes(trecho))

test('nenhuma conta de dinheiro em arquivo que vai para o navegador, fora da lista de formatação', () => {
  assert.ok(ARQUIVOS.length > 50, 'a varredura achou arquivos demais a menos')
  const suspeitas = []
  for (const arq of ARQUIVOS) {
    readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
      const t = linha.trim()
      if (!t || COMENTARIO_OU_MARCACAO.test(t) || !CONTA.test(t)) return
      if (!permitida(arq, t)) suspeitas.push(`${arq.replaceAll('\\', '/')}:${i + 1}: ${t.slice(0, 120)}`)
    })
  }
  assert.deepEqual(suspeitas, [])
})

test('a lista de exceções não tem linha morta (cada exceção ainda existe no código)', () => {
  for (const [arq, trecho] of PERMITIDAS) {
    assert.ok(readFileSync(arq, 'utf8').includes(trecho), `${arq}: "${trecho}" sumiu; tire da lista`)
  }
})

test('o simulador do navegador só lê a tabela pronta: não importa simular() nem calcularNivel()', () => {
  const fonte = readFileSync('components/afiliados/Simulador.jsx', 'utf8')
  assert.equal(/\bsimular\b|calcularNivel|tabelaDoSimulador/.test(fonte.replace(/^\s*\/\/.*$/gm, '')), false)
})
