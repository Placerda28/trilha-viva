// Ponte local para avaliar modelos da Workers AI com o login do wrangler deste PC,
// sem criar token. Uso: npx wrangler dev --config scripts/instagram-ia-ponte/wrangler.jsonc
// e depois: node scripts/instagram-ia-avaliar.mjs --ponte http://127.0.0.1:8799
// So roda local (wrangler dev); nunca publicar este Worker.
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('so POST', { status: 405 })
    try {
      const { modelo, entrada } = await request.json()
      const resultado = await env.AI.run(modelo, entrada)
      return Response.json({ ok: true, resultado })
    } catch (erro) {
      return Response.json({ ok: false, erro: String(erro?.message || erro) }, { status: 500 })
    }
  },
}
