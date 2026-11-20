// Textos e recortes da vitrine /palco (MUDANÇAS §9). Nada daqui muda com o estado
// "em breve" / "lançado", exceto onde a função recebe `emBreve`.

export const IMAGEM_PALCO = '/img/palco-ao-vivo.webp' // 1920 x 1080 (FASE1-COMPONENTES.md)

export const ALT_PRINT =
  'Tela Ao Vivo do Palco tocando A Alegria (Morada): a onda com as partes da música, a mesa com 13 canais (CLICK e GUIA marcados em vermelho), o setlist do culto de domingo e o pad.'

// Recorte do print: x0, y0, largura e altura em fração da imagem. Vira
// background-size / background-position (a posição em % é relativa ao que sobra).
const recorte = (x0, y0, w, h) => ({
  tam: `${100 / w}% auto`,
  pos: `${(x0 / (1 - w)) * 100}% ${(y0 / (1 - h)) * 100}%`,
})

export const RECURSOS = [
  {
    t: 'A música dividida em partes',
    d: 'Intro, verso, refrão, ponte. Pule para a parte que o ministro pedir ou repita o refrão quantas vezes precisar, sem perder o tempo.',
    alt: 'Onda da música com as partes Intro, Verso 1 e Refrão marcadas e o cursor vermelho tocando.',
    ...recorte(0.06, 0.1, 0.36, 0.4),
  },
  {
    t: 'Clique e guia no fone',
    d: 'Cada instrumento num canal, com volume, mudo e solo. O clique e a guia saem só para o fone da equipe; o resto vai para a mesa.',
    alt: 'Mesa de canais do Palco com BASS, BGVS, CLICK 146, DRUMS e guitarras.',
    ...recorte(0.06, 0.5, 0.36, 0.4),
  },
  {
    t: 'Setlist do culto',
    d: 'Monte a ordem do domingo antes e toque uma atrás da outra. Tom e andamento ficam salvos em cada música.',
    alt: 'Setlist Culto de domingo com cinco músicas, a primeira tocando.',
    ...recorte(0.745, 0.1, 0.255, 0.283),
  },
  {
    t: 'Pad para as transições',
    d: 'Um pad no tom da música para preencher a oração e a passagem entre um louvor e outro.',
    alt: 'Painel do pad ligado no tom de A, com as doze notas.',
    ...recorte(0.745, 0.68, 0.255, 0.283),
  },
]

export const EXTRAS = [
  { t: 'Tom e andamento', d: 'Mude o tom e o BPM da música inteira, com o clique acompanhando.' },
  { t: 'Rampa', d: 'Um toque para baixar o volume aos poucos e terminar a música junto com a banda.' },
  { t: 'Funciona sem internet', d: 'Depois de ativado, o Palco toca no culto mesmo sem sinal na igreja.' },
]

export const QUEM = [
  { t: 'Quem roda a VS no culto.', d: 'Baterista, tecladista ou o técnico de som que solta a trilha e manda o clique para a banda.' },
  { t: 'Ministro e líder de louvor.', d: 'Para montar o setlist do domingo e mudar o tom na hora.' },
  { t: 'Igreja com banda pequena.', d: 'A trilha completa os instrumentos que faltam, com a guia avisando cada parte.' },
]

export const INCLUSO = [
  'Clique e guia no fone, o resto na mesa',
  'Partes da música, setlist e pad',
  'Tom e andamento em cada música',
  'Funciona sem internet',
  'Até 2 computadores',
]

export const REQUISITOS = [
  ['Sistema', 'Windows 10 ou 11, 64 bits. Mac e celular vêm depois.'],
  ['Interface de áudio', 'Opcional. Com ela, o clique e a guia vão só para o fone e o resto vai para a mesa.'],
  ['Internet', 'Só para vincular à nuvem: a VS que você põe no setlist baixa e fica no computador. No culto, toca sem internet.'],
  ['Computadores', 'Uma assinatura ativa até 2 computadores. Você troca em Minha conta.'],
]

// Antes do lançamento não existe página de download nem "Me avise": a resposta do
// Mac e do celular manda para a lista de espera.
export function duvidas(emBreve) {
  return [
    {
      titulo: 'Preciso ter o pacote para usar o Palco?',
      conteudo: 'Não. Sem o pacote você testa 3 dias grátis e importa as suas próprias VS. Com o pacote, o teste é de 7 dias e as 2.000 VS já aparecem dentro do Palco.',
    },
    {
      titulo: 'O pacote e o Palco são a mesma compra?',
      conteudo: 'Não. O pacote é um pagamento único pelas 2.000 VS. O Palco é uma assinatura de R$ 19,90 por mês pelo programa.',
    },
    {
      titulo: 'Funciona sem internet?',
      conteudo: 'Funciona. A internet só serve para vincular o Palco à nuvem: a VS que você põe no setlist baixa e fica no computador. No culto, ele toca sem internet.',
    },
    {
      titulo: 'Preciso de interface de áudio?',
      conteudo: 'Não é obrigatório. Com uma interface de áudio, você manda o clique e a guia só para o fone e o resto para a mesa de som.',
    },
    {
      titulo: 'Funciona no Mac ou no celular?',
      conteudo: emBreve
        ? 'Ainda não. O Palco começa no Windows 10 e 11, 64 bits. Mac e celular vêm depois: na lista de espera, escolha onde você vai usar e avisamos quando a sua versão sair.'
        : 'Ainda não. Por enquanto o Palco é para Windows 10 e 11, 64 bits. Mac e celular vêm depois; deixe seu e-mail em "Me avise" na página de download.',
    },
    {
      titulo: 'Como cancelo a assinatura?',
      conteudo: 'Em Minha conta, na parte Assinatura. O Palco continua funcionando até o fim do mês que você já pagou.',
    },
  ]
}
