// Amostra pública do acervo Trilha Viva.
// O pacote completo contém mais de 4.000 multitracks (VS).
// Para adicionar músicas, basta acrescentar uma linha "Título|Artista" abaixo.
const RAW = `
Bênçãos Que Não Têm Fim|Isadora Pompeo
Raridade|Anderson Freire
Ousado Amor|Isaías Saad
Deserto|Maria Marçal
Um Novo Dia|Get Worship
Se Eu Não Te Ouvir|Sarah Farias
Bondade de Deus|Isaías Saad
Quem É Esse?|Julliany Souza
Acalma Meu Coração|Anderson Freire
Tu És|Fhop Music
Era a Mão de Deus|Kailane Frauches
Passa Lá em Casa Jesus|Kailane Frauches
Os Sonhos de Deus|Gabriela Rocha
A Vitória Chegou|Luanna Dourado
Jeová Jireh|Aline Barros
Enche-me|Isaías Saad
Cuido dos Detalhes|André e Felipe
Grandes Coisas|Fernandinho
Ninguém Explica Deus|Preto no Branco
Hino da Vitória|Cassiane
Cura|Maria Marçal
Casa do Pai|Aline Barros
Estamos de Pé|Marcus Salles
Lindo Momento|Julliany Souza
Coração Igual ao Teu|Diante do Trono
O Que Sua Glória Fez Comigo|Fernanda Brum
Mesmo Sem Entender|Thalles Roberto
Meu Universo|PG
Rendido Estou|Aline Barros
Aba|Kemuel
Vida Aos Sepulcros|Gabriela Rocha
Galileu|Fernandinho
Oh Quão Lindo Esse Nome É|Kemuel
Pode Morar Aqui|Theo Rubia
Restitui|Davi Sacer
Amigo Espírito Santo|Cassiane
Minha Calmaria|Gabriel Brito
Venha Ao Teu Reino|Davi Sacer
Sonhe Grande|Delino Marçal
Arde Outra Vez|Thalles Roberto
Yeshua|Casa Worship
Infinitamente Mais|Ton Carfi
A Resposta|Thalles Roberto
Jesus é o Caminho|Heloísa Rosa
O Céu É O Meu Lugar|Casa Worship
Coração de Joelhos|Samuel Miranda
Canção do Céu|Anderson Freire
Coração Valente|Anderson Freire
É Tudo Sobre Você|Morada
Quem Sou Eu?|PG
Creio em Ti|Anderson Freire
Pra Sempre|Fernandinho
Há um Lugar|Heloísa Rosa
Tempo|Luciano Camargo
Vim Falar com Deus|Delino Marçal
O Teu Amor|Kemuel
A Bênção|Aline Barros
Deus Não Desperdiça Suas Lágrimas|Paulo Neto
Colo de Maria|Ministério M3
Vem Cear Comigo|Gerson Rufino
Atraídos pelo Fogo|Casa Worship
A Tua Glória Faz|Fernanda Brum
Sua Paz|Isadora Pompeo
Minha Essência|André e Felipe
Eu Não Sou Mais Órfão|Gabriel Brito
Nada Além de Ti|Thalles Roberto
Eu Vou Passar pela Cruz|PG
Resultado|Isadora Pompeo
Primeiro Amor|Patricia Romania
Ele é Jesus|Luciano Camargo
És Real Pra Mim|Fernanda Brum
Prodigus|Ministério M3
Atrai Meu Coração|Nani Azevedo
Coração de Pedra|Ministério M3
Quero Mergulhar|Ministério M3
Digno é o Senhor|Gabriel Brito
Grande É o Senhor|Gabriel Brito
Meu Barquinho|Nani Azevedo
Ouço Deus Me Chamar|Fernanda Brum
Deus de Futuro|Sarah Farias
Meu Prazer|PG
Cantem Os Anjos|Ministério M3
Todo Poderoso|Áquila
Não Pare de Adorar|Babi Garcia
Incomparável Amor|Gabriel Brito
Eu Vou Correr|Heloísa Rosa
Enquanto Eu Te Espero|Gabriel Brito
A Mensagem da Cruz|Nani Azevedo
Faço e Refaço|Alisson Santos
Todos Um|Kemuel
Céu|Gabriela Rocha
Sobrevivi|Sarah Farias
Você Tem Um Pai|Leandro Borges
Jesus Tu És Santo|Casa Worship
Lugar Secreto|Gabriela Rocha
Dia e Noite|Gabriela Gomes
Deus e Eu|Leandro Borges
A Casa É Sua|Casa Worship
Tá Chorando Por Quê?|Ton Carfi
Mais de Ti|Luma Elpidio
Vem a Mim|Luma Elpidio
Graça|Luma Elpidio
O Que Fizeram de Você|Preto no Branco
Não Pare|Midian Lima
Deixa Eu Te Usar|Sarah Farias
Me Atraiu|Gabriela Rocha
Depois do Fim|Discopraise
Milagres|Discopraise
Vivo Está|Isaías Saad
Favor de Deus|Discopraise
Cura-me|Discopraise
Sonda-me, Usa-me|Discopraise
Não Temerei|Discopraise
Lindo|Ana Nóbrega
Eu Grito|Discopraise
Sou Um Milagre|Discopraise
Ele Vem|Luma Elpidio
Lado do Altar|Casa Worship
Algo Novo|Kemuel
Volte a Sonhar|Elaine Martins
Atos 2|Gabriela Rocha
Eu Te Vejo Em Tudo|Casa Worship
Que Eu Possa Ver|Ministério Zoe
De Dentro Pra Fora|Julia Vitória
Tua Presença|Paulo Neto
Teu Amor|Ana Nóbrega
Oceanos|Ana Nóbrega
Minha Morada|Isadora Pompeo
Teu Santo Nome|Gabriela Rocha
Aquieta Minh'alma|Ministério Zoe
Adorador|Damares
O Guarda|Marquinhos Gomes
Aonde Quer Que Eu Vá|Marquinhos Gomes
O Não de Deus|Ton Carfi
Em Adoração|Damares
O Tempo Passa|Ton Carfi
Vem|Julia Vitória
Sou Humano|Bruna Karla
Porque Eu Te Amei|Ton Carfi
Não Vou Duvidar|Marquinhos Gomes
Cicatrizes|Bruna Karla
Não Há Deus Maior|Marquinhos Gomes
Estado de Graça|Preto no Branco
Aliança|Isadora Pompeo
Jardim|Ministério Zoe
É Você|Ton Carfi
Eu Te Agradeço|Preto no Branco
Diante de Ti|Julliany Souza
Israel|Preto no Branco
Deus de Detalhes|Pr. Lucas
Espera Só Mais um Pouquinho|Ton Carfi
Sacrifício e Adoração|Damares
Me Ajude a Melhorar|Eli Soares
Eu Te Senti|Preto no Branco
Leva-me Além|Luma Elpidio
Enquanto Eu Viver|Ministério Zoe
Santo|Fernandinho
Diz|Gabriela Rocha
Vai|Gerson Rufino
Adoração|Gabriela Rocha
O Poder da Cruz|Ministério Zoe
A Ele a Glória|Gabriela Rocha
Vai Passar|Gerson Rufino
Liberta-me de Mim|Luma Elpidio
Ore|Ton Carfi
Há um Vinho Novo|Ministério Zoe
Em Teus Braços|Laura Souguellis
Basta uma Palavra|Gerson Rufino
Sabor de Mel|Damares
`.trim()

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const ADORACAO = ['adora', 'santo', 'presenca', 'presença', 'teu amor', 'lugar secreto', 'oceanos', 'aquieta', 'em teus braços', 'sonda', 'enche', 'atrai', 'quero mergulhar', 'coração de joelhos', 'digno', 'jardim', 'yeshua', 'teu santo nome', 'o teu amor', 'minha morada']
const CELEBRACAO = ['vitória', 'celebra', 'grandes coisas', 'hino', 'cantem', 'todo poderoso', 'a ele a glória', 'sonhe grande', 'um novo dia', 'vai passar', 'sou um milagre', 'atos 2', 'alegria', 'ele vem']
const MINISTRACAO = ['cura', 'deserto', 'milagre', 'restitui', 'sobrevivi', 'não temerei', 'liberta', 'cicatrizes', 'acalma', 'espera', 'depois do fim', 'favor de deus', 'volte a sonhar', 'era a mão de deus', 'deus de futuro']

function categoria(title) {
  const t = title.toLowerCase()
  if (ADORACAO.some((k) => t.includes(k))) return 'Adoração'
  if (CELEBRACAO.some((k) => t.includes(k))) return 'Celebração'
  if (MINISTRACAO.some((k) => t.includes(k))) return 'Ministração'
  return 'Congregacional'
}

const seen = new Set()

export const songs = RAW.split('\n')
  .map((line) => {
    const [title, artist] = line.split('|').map((s) => s.trim())
    if (!title || !artist) return null
    const slug = slugify(`${title}-${artist}`)
    if (seen.has(slug)) return null
    seen.add(slug)
    const h = hash(slug)
    return {
      slug,
      title,
      artist,
      categoria: categoria(title),
      hue: h % 360,
      hue2: ((h % 360) + 40 + (h % 60)) % 360,
      seed: h % 997,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))

export const artists = [...new Set(songs.map((s) => s.artist))].sort((a, b) =>
  a.localeCompare(b, 'pt-BR')
)

export const categorias = [...new Set(songs.map((s) => s.categoria))].sort()

export function getSong(slug) {
  return songs.find((s) => s.slug === slug)
}

export function relatedSongs(song, n = 6) {
  const sameArtist = songs.filter((s) => s.artist === song.artist && s.slug !== song.slug)
  const sameCat = songs.filter(
    (s) => s.categoria === song.categoria && s.artist !== song.artist && s.slug !== song.slug
  )
  return [...sameArtist, ...sameCat].slice(0, n)
}
