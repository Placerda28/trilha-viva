export const tools = [
  {
    slug: 'reaper',
    name: 'REAPER',
    badge: 'Recomendado',
    platform: 'Windows · macOS · Linux',
    price: 'Avaliação completa de 60 dias · licença pessoal a partir de US$ 60',
    url: 'https://www.reaper.fm/',
    summary:
      'O melhor custo-benefício para igreja. É leve, roda bem até em notebook antigo e deixa você mandar clique e guia para uma saída e o mix da banda para outra em poucos cliques.',
    why: [
      'Roteamento de saídas livre: clique + guia no fone, instrumentos no PA',
      'Marcadores e regiões para montar o setlist inteiro em um projeto só',
      'Instalador pequeno, abre em segundos, quase não usa CPU',
      'Atalhos de teclado e ações customizadas para o operador',
    ],
  },
  {
    slug: 'ableton-live',
    name: 'Ableton Live',
    badge: 'Padrão de mercado',
    platform: 'Windows · macOS',
    price: 'Pago (a versão Lite costuma vir junto com interfaces de áudio)',
    url: 'https://www.ableton.com/',
    summary:
      'O mais usado por bandas grandes e igrejas com equipe de áudio dedicada. A Session View organiza a ministração inteira em cenas, com passagem automática de uma música para a outra.',
    why: [
      'Session View: cada música vira uma cena, disparada no tempo certo',
      'Follow Actions para emendar louvores sem parar o culto',
      'Ecossistema enorme de tutoriais em português',
      'Ótimo quando a igreja também usa luz e vídeo sincronizados',
    ],
  },
  {
    slug: 'prime',
    name: 'Prime (Loop Community)',
    badge: 'Melhor no iPad',
    platform: 'iPad · iPhone · macOS',
    price: 'App gratuito, com planos pagos para mais nuvem e recursos',
    url: 'https://loopcommunity.com/prime-multitrack-app',
    summary:
      'Feito para quem quer subir no palco só com um tablet. Você envia os seus próprios arquivos pela nuvem do app e monta o setlist tocando na tela.',
    why: [
      'Interface pensada para o culto, não para o estúdio',
      'Clique sai no canal esquerdo e os instrumentos no direito — dá para usar até com um cabo P2 em Y',
      'Aceita áudio próprio via Prime Cloud',
      'Setlist compartilhado com a equipe',
    ],
  },
  {
    slug: 'waveform-free',
    name: 'Waveform Free',
    badge: 'Grátis',
    platform: 'Windows · macOS · Linux',
    price: 'Gratuito, sem limite de faixas',
    url: 'https://www.tracktion.com/products/waveform-free',
    summary:
      'A opção zero real para começar hoje. Faixas ilimitadas, abre WAV e MP3 numa boa e serve para ensaiar com o multitrack antes de investir em algo maior.',
    why: [
      'Sem custo e sem limite de faixas',
      'Bom para ensaio em casa e para o músico estudar a própria parte',
      'Roda em Linux, útil em máquinas antigas reaproveitadas',
    ],
  },
  {
    slug: 'cantabile',
    name: 'Cantabile Lite',
    badge: 'Só ao vivo',
    platform: 'Windows',
    price: 'Edição Lite gratuita',
    url: 'https://www.cantabilesoftware.com/',
    summary:
      'Não é um estúdio, é um tocador de palco. Se o objetivo é só rodar as trilhas ao vivo com estabilidade e nada mais, ele é mais simples que uma DAW completa.',
    why: [
      'Interface enxuta, difícil de errar no meio do culto',
      'Feito para músico que toca e opera ao mesmo tempo',
      'Leve, com foco em não travar durante a apresentação',
    ],
  },
  {
    slug: 'studio-one',
    name: 'PreSonus Studio One',
    badge: 'Alternativa',
    platform: 'Windows · macOS',
    price: 'Pago, com versão de entrada',
    url: 'https://www.presonus.com/',
    summary:
      'Boa escolha para quem já grava a igreja e quer usar o mesmo programa para produzir e para tocar ao vivo, com arraste e solte muito direto.',
    why: [
      'Fluxo de trabalho de arrastar e soltar bem intuitivo',
      'Integra com mesas digitais PreSonus usadas em igreja',
      'Serve para gravar o culto e reaproveitar as trilhas',
    ],
  },
]

export const steps = [
  {
    n: '01',
    title: 'Baixe o pacote e escolha a música',
    body: 'Depois da compra, o acervo abre direto no seu Google Drive. Cada música vem numa pasta com os canais separados em WAV/MP3, mais o clique e a guia.',
  },
  {
    n: '02',
    title: 'Arraste os canais para o seu programa',
    body: 'Abra o REAPER (ou o programa que você escolheu), crie um projeto novo e arraste todos os arquivos da pasta. Eles entram alinhados, cada um na sua faixa.',
  },
  {
    n: '03',
    title: 'Separe o que vai para o fone e o que vai para o PA',
    body: 'Mande clique e guia para a Saída 1 (fone do baterista e da equipe) e o mix dos instrumentos para a Saída 2 (mesa de som). Use uma interface com pelo menos 4 saídas.',
  },
  {
    n: '04',
    title: 'Tire o que a banda já toca',
    body: 'Tem baterista? Mute a bateria da trilha. Tem guitarrista? Mute a guitarra. O multitrack existe para completar o time, não para substituir ninguém.',
  },
  {
    n: '05',
    title: 'Ensaie com o clique antes do culto',
    body: 'Passe a música inteira com a banda ouvindo o clique e a guia. Ajuste o volume de cada canal, salve o projeto e leve pronto para o domingo.',
  },
]

export const usos = [
  {
    title: 'Culto de domingo',
    body: 'Complete a banda com os instrumentos que faltam — pads, sopros, cordas, segunda guitarra — sem precisar de mais músicos no palco.',
  },
  {
    title: 'Ensaio da equipe',
    body: 'Cada músico ensaia em casa ouvindo só o próprio canal, ou tirando o próprio canal e tocando por cima. O ensaio presencial rende muito mais.',
  },
  {
    title: 'Banda pequena',
    body: 'Voz e violão viram uma banda completa. Com clique e guia no fone, dois músicos sustentam o louvor inteiro.',
  },
  {
    title: 'Célula, culto de jovens e eventos',
    body: 'Onde não cabe a banda inteira, o multitrack sai no som da casa com qualidade de gravação.',
  },
  {
    title: 'Live e transmissão',
    body: 'Áudio limpo e separado por canal facilita a mixagem da transmissão e evita o som abafado da câmera.',
  },
  {
    title: 'Escola de música da igreja',
    body: 'O aluno estuda com a faixa original isolada, no tom que ele consegue cantar, e vai ganhando confiança antes de subir no palco.',
  },
]
