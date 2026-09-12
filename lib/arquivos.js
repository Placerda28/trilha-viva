import { lerTexto } from '@/lib/b2'

// De qual arquivo é cada música.
//
// POR QUE ISSO NÃO MORA NO REPOSITÓRIO:
//
// São 772 caminhos, 69 KB. Colocar no código teria dois problemas. O pequeno é
// peso: o site carregaria uma tabela que só interessa na hora de um download.
// O grande é acoplamento — o mapa muda junto com o ACERVO (arquivo renomeado,
// música nova entrando), não junto com o código. Ficaria a cada ajuste do
// Drive um commit e um deploy do site inteiro, por causa de um nome de arquivo.
//
// Então o mapa mora dentro do próprio balde, em _catalogo/arquivos.json, ao
// lado das músicas que ele descreve. Some junto, volta junto: se o balde
// estiver fora do ar, o mapa não serve para nada mesmo.
//
// Para atualizar: rodar o gerar_catalogo.py e subir o arquivos.json para o
// balde. O site pega a versão nova em no máximo uma hora, sem deploy.

const CAMINHO = '_catalogo/arquivos.json'
const VALIDADE = 3600 * 1000

let cache = null

async function carregar() {
  if (cache && cache.expira > Date.now()) return cache.mapa

  const texto = await lerTexto(CAMINHO)
  if (!texto) {
    // Mantém o mapa velho se houver: uma falha momentânea do balde não pode
    // apagar o acervo da tela de quem está baixando.
    if (cache) return cache.mapa
    console.error('arquivos: nao consegui ler ' + CAMINHO)
    return null
  }

  try {
    const mapa = JSON.parse(texto)
    cache = { mapa, expira: Date.now() + VALIDADE }
    return mapa
  } catch (err) {
    console.error('arquivos: json invalido', err?.message)
    return cache ? cache.mapa : null
  }
}

export async function arquivosDe(slug) {
  const mapa = await carregar()
  if (!mapa) return []
  return mapa[slug] || []
}

// Quantas músicas o mapa conhece. Serve para a tela saber se o acervo já está
// disponível, sem precisar perguntar arquivo por arquivo.
export async function acervoPronto() {
  const mapa = await carregar()
  return Boolean(mapa && Object.keys(mapa).length > 0)
}
