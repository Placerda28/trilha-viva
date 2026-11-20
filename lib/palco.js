// Chave do Palco (redesenho de 20/11/2026).
//
// Enquanto o programa Palco não sai, o site mostra os blocos "Em breve". No dia
// do lançamento basta ligar PALCO_LANCADO=true e publicar de novo: todos os
// blocos "Em breve" trocam por "Lançado" (cabeçalho, rodapé, home, ficha da
// música, minha conta, /palco...).
//
// Lido de process.env no BUILD (o site é quase todo estático, então o valor é
// gravado na página). Mudar a variável só vale depois de um novo build/deploy,
// como as NEXT_PUBLIC_*. Sem a variável, o padrão é "não lançado".
//
// Para o código de cliente (Header, rodapé) a mesma chave vai com o prefixo
// NEXT_PUBLIC_: ver `.env.example`. As duas formas valem.

function ligado(v) {
  return /^(1|true|sim|on)$/i.test(String(v ?? '').trim())
}

export const PALCO_LANCADO = ligado(
  process.env.NEXT_PUBLIC_PALCO_LANCADO ?? process.env.PALCO_LANCADO
)

// Texto livre, ex.: "20/02". Vazio = sem data definida.
export const PALCO_DATA_LANCAMENTO = String(
  process.env.NEXT_PUBLIC_PALCO_DATA_LANCAMENTO ?? process.env.PALCO_DATA_LANCAMENTO ?? ''
).trim()

// "Lançamento em breve" ou "Lançamento em 20/02".
export function textoLancamento(data = PALCO_DATA_LANCAMENTO) {
  const d = String(data ?? '').trim()
  return `Lançamento em ${d || 'breve'}`
}

// Para quem recebe o estado por prop ('em-breve' | 'lancado'), como os
// componentes de design: um lugar só decide o nome.
export const palcoEstado = (lancado = PALCO_LANCADO) => (lancado ? 'lancado' : 'em-breve')
