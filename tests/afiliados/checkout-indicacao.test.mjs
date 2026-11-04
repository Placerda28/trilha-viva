// O aviso do código de afiliado segura o redirecionamento por 3,5 s. O temporizador tem que
// morrer com o componente: senão o comprador que saiu da página é mandado ao pagamento antigo.
// (Sem renderizador React nos testes, a conferência é no código-fonte.)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fonte = readFileSync('components/CheckoutIndicacao.jsx', 'utf8')

test('o temporizador do redirecionamento é guardado e limpo ao desmontar', () => {
  assert.match(fonte, /temporizador\s*=\s*useRef\(/)
  assert.match(fonte, /useEffect\(\(\) => \(\) => clearTimeout\(temporizador\.current\), \[\]\)/)
  assert.match(fonte, /temporizador\.current = setTimeout\(/)
  assert.doesNotMatch(fonte.replace(/temporizador\.current = setTimeout\(/g, ''), /[^.\w]setTimeout\(/)
})
