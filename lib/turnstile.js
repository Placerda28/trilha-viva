// Consulta o Turnstile (anti-robô da Cloudflare) e diz só o resultado: 'ok',
// 'sem_token', 'invalido' ou 'indisponivel'. Quem chama decide o que fazer com
// cada um: o cadastro da VS grátis falha fechado; o checkout segue a venda
// quando a Cloudflare está fora do ar. Sem dependências, para o checkout poder
// importar sem carregar o resto.
export async function consultarTurnstile(req, token, segredo, buscar = fetch) {
  if (typeof token !== 'string' || !token || token.length > 2048) return 'sem_token'
  try {
    const resposta = await buscar('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: segredo, response: token,
        remoteip: req.headers.get('cf-connecting-ip') || '' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!resposta.ok) throw new Error('Turnstile indisponível')
    const dados = await resposta.json()
    return dados.success === true && dados.hostname === new URL(req.url).hostname ? 'ok' : 'invalido'
  } catch {
    return 'indisponivel'
  }
}
