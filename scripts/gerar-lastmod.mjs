// Executar na raiz: node scripts/gerar-lastmod.mjs; saída usada apenas no build.
import { pathToFileURL } from 'node:url'
import { extrairLinhas, git, gravarJson, lerJson, linhasAtuais } from './achar-redirects.mjs'

export function* versoesCatalogo() {
  const commits = git('log', '--reverse', '--format=%H %cs', '--', 'lib/catalog.js', 'lib/catalog-dados-*.js').trim().split('\n')
  for (const registro of commits) {
    const [commit, data] = registro.trim().split(' ')
    const codigo = git('show', `${commit}:lib/catalog.js`)
    const partes = [...codigo.matchAll(/from '\.\/(catalog-dados-\d+\.js)'/g)]
    // Só considera partes conectadas ao catálogo naquele commit, não arquivos em preparação.
    const linhas = partes.length
      ? partes.flatMap(([, arquivo]) => extrairLinhas(git('show', `${commit}:lib/${arquivo}`)))
      : extrairLinhas(codigo)
    yield { data, linhas }
  }
}

export function calcularDatas(atuais, historico, existentes, hoje) {
  const assinaturas = new Map(atuais.map((linha) => [linha[0], JSON.stringify(linha)]))
  const datas = {}
  let anteriores = new Map()
  for (const { data, linhas } of historico) {
    const versao = new Map(linhas.map((linha) => [linha[0], JSON.stringify(linha)]))
    for (const [slug, assinatura] of assinaturas) {
      if (versao.get(slug) === assinatura && anteriores.get(slug) !== assinatura) datas[slug] = data
      else if (versao.get(slug) !== assinatura) delete datas[slug]
    }
    anteriores = versao
  }
  return Object.fromEntries(atuais.map(([slug]) => {
    // Uma edição local de música já versionada não pode herdar a data da linha antiga.
    if (anteriores.has(slug) && anteriores.get(slug) !== assinaturas.get(slug)) return [slug, hoje]
    // shortcut: sem versão no git, preserva a data por slug; guardar assinaturas
    // adicionais será necessário se houver edições repetidas antes do primeiro commit.
    return [slug, datas[slug] || existentes[slug] || hoje]
  }))
}

export function gerarLastmod() {
  const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const datas = calcularDatas(linhasAtuais(), versoesCatalogo(), lerJson('lastmod'), hoje)
  gravarJson('lastmod', datas)
  console.log(`${Object.keys(datas).length} datas gravadas; primeira ${Object.values(datas).sort()[0]}, última ${Object.values(datas).sort().at(-1)}.`)
  return datas
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) gerarLastmod()
