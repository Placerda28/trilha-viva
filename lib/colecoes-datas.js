// A faixa sazonal da home (ex.: Natal, de 01/11 a 25/12) aparece só no período.
// O dia é o de Brasília, como o resto do negócio (docs/architecture.md).
export function diaEmBrasilia(agora) {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(5)
}

export function faixaAtiva(faixa, agora) {
  if (!faixa) return false
  const dia = diaEmBrasilia(agora)
  return dia >= faixa.de && dia <= faixa.ate
}
