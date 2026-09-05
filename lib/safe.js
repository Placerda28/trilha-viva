// Escapes usados nos dois pontos do site onde a gente monta markup na mão:
// o JSON-LD embutido em <script> e o HTML do e-mail de liberação.

/**
 * Serializa um objeto para dentro de <script type="application/ld+json">.
 *
 * JSON.stringify não escapa `<`, então um título contendo `</script>` fecharia
 * a tag e o resto viraria HTML executável. Aqui os caracteres perigosos viram
 * escapes \uXXXX — que o parser de JSON entende exatamente como os originais,
 * então o dado chega igual ao Google e ao navegador. U+2028 e U+2029 entram
 * junto porque são quebras de linha válidas em JSON e inválidas em JavaScript.
 */
// U+2028 e U+2029 sao separadores de linha: validos dentro de uma string JSON,
// mas terminadores de linha em JavaScript. Escritos por codigo de caractere de
// proposito -- os dois sao invisiveis, e ja aconteceu de a sequencia de escape
// virar o caractere cru no caminho ate o repositorio, deixando um literal de
// regex quebrado que ninguem enxerga lendo o arquivo.
const SEPARADOR_DE_LINHA = String.fromCharCode(0x2028)
const SEPARADOR_DE_PARAGRAFO = String.fromCharCode(0x2029)

export function ldJson(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(SEPARADOR_DE_LINHA)
    .join('\\u2028')
    .split(SEPARADOR_DE_PARAGRAFO)
    .join('\\u2029')
}

/** Escapa texto para ir dentro de um nó de HTML (usado no e-mail). */
export function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Só deixa passar URL http(s). O link do acervo vem de DRIVE_URL, mas se um dia
 * essa variável for preenchida errado, um `javascript:` não vira link clicável.
 */
export function safeUrl(valor) {
  try {
    const u = new URL(String(valor))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return escapeHtml(u.toString())
  } catch {
    return ''
  }
}
