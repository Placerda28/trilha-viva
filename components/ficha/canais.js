// A lista de canais da ficha no formato do quadro `Canais` (components/Canais.jsx).
// Os NOMES vêm da lista real da música (lib/ficha.js). O nível de cada barra é
// só desenho (um nível típico do instrumento), não uma medida do arquivo.
const NIVEL = {
  Clique: 62,
  Guia: 46,
  Bateria: 84,
  Baixo: 70,
  'Teclado / Piano': 58,
  Pads: 40,
  'Vocal principal': 66,
  Loops: 52,
}
const FONE = ['Clique', 'Guia']

export const canaisDoQuadro = (nomes) =>
  nomes.map((nome) => ({
    nome,
    dest: FONE.includes(nome) ? 'FONE' : 'PA',
    n: NIVEL[nome] ?? 56,
    sinal: FONE.includes(nome),
  }))
