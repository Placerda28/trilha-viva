import { moeda, moedaCurta, numero } from '../../formato'
import Colunas, { montarTabela } from '../graficos/Colunas'
import Funil, { tabelaDoFunil } from '../graficos/Funil'
import Origem, { semVendas, tabelaDaOrigem } from '../graficos/Origem'
import Quadro from '../graficos/Quadro'
import TopAfiliados, { tabelaDoTop } from '../graficos/TopAfiliados'
import { agruparDias, corDoNivel, mesCurto, mesLongo, ordenarNiveis } from '../painelUtil'

// Os sete gráficos do Dashboard (especificação 6.4). Preto e cinza para as
// séries comuns; vermelho só na linha do lucro e nos destaques; bronze, prata e
// ouro só na distribuição por nível. Cada um tem a tabela com os mesmos números.

const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const INK = '#0D0D0D'
const CINZA = '#8A8A8A'
const VERMELHO = '#E5152D'

const doMes = (m) => ({ chave: m.mes, rotulo: mesCurto(m.mes), titulo: mesLongo(m.mes) })

function VendasPorDia({ serie }) {
  const pontos = agruparDias(serie, ['diretas', 'afiliados']).map((d) => ({
    chave: d.chave,
    rotulo: d.rotulo,
    titulo: d.tituloTabela,
    valores: { diretas: d.diretas, afiliados: d.afiliados },
  }))
  const series = [
    { id: 'diretas', nome: 'Vendas diretas', cor: CINZA },
    { id: 'afiliados', nome: 'Por afiliado', cor: INK },
  ]
  const total = serie.reduce((t, d) => t + d.diretas + d.afiliados, 0)
  const longo = serie.length > 92
  return (
    <Quadro
      titulo="Vendas por dia: diretas e por afiliado"
      texto={longo ? 'Período longo: cada coluna soma ' + (serie.length > 400 ? '30 dias' : 'uma semana') + '.' : 'Cada coluna é um dia, no horário de Brasília.'}
      legenda={series.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }))}
      vazio={total === 0 ? 'Nenhuma venda neste período.' : ''}
      tabela={montarTabela({ primeira: longo ? 'Período' : 'Dia', pontos, series, formatar: numero })}
      className="xl:col-span-2"
    >
      <Colunas pontos={pontos} series={series} formatar={numero} curto={(v) => COMPACTO.format(v)} inteiro margemEsq={40} rotuloGeral="Vendas por dia, diretas e por afiliado." />
    </Quadro>
  )
}

function ReceitaCusto({ mensal }) {
  const pontos = mensal.map((m) => ({ ...doMes(m), valores: { receita: m.receita_liquida_centavos, custo: m.custo_centavos } }))
  const series = [
    { id: 'receita', nome: 'Receita líquida', cor: INK },
    { id: 'custo', nome: 'Custo do programa', cor: CINZA },
  ]
  const linha = { id: 'lucro', nome: 'Lucro', cor: VERMELHO, valores: mensal.map((m) => m.lucro_centavos) }
  const vazio = mensal.every((m) => !m.receita_liquida_centavos && !m.custo_centavos)
  return (
    <Quadro
      titulo="Receita líquida e custo por mês, com o lucro"
      texto="Receita e custo em colunas; a linha vermelha é o lucro (receita menos custo), na mesma escala em reais."
      legenda={[...series.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor })), { id: 'lucro', nome: 'Lucro', cor: VERMELHO, linha: true }]}
      vazio={vazio ? 'Nenhuma venda por afiliado nestes meses.' : ''}
      tabela={montarTabela({ primeira: 'Mês', pontos, series, linha, formatar: moeda })}
    >
      <Colunas pontos={pontos} series={series} modo="agrupado" linha={linha} formatar={moeda} curto={moedaCurta} margemEsq={64} rotuloGeral="Receita líquida e custo por mês, com a linha do lucro." />
    </Quadro>
  )
}

function Niveis({ dist }) {
  const nomes = ordenarNiveis(dist.niveis)
  const series = nomes.map((nome, i) => ({ id: nome, nome, cor: corDoNivel(nome, i) }))
  const pontos = dist.meses.map((m) => ({ ...doMes(m), valores: m.contagens }))
  const vazio = dist.meses.every((m) => Object.values(m.contagens).every((v) => !v))
  return (
    <Quadro
      titulo="Afiliados em cada nível, mês a mês"
      texto="Quantos afiliados ficaram em Bronze, Prata e Ouro. Mês fechado vale o fechamento."
      legenda={series.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }))}
      vazio={vazio ? 'Nenhum afiliado com venda nestes meses.' : ''}
      tabela={montarTabela({ primeira: 'Mês', pontos, series, formatar: numero })}
    >
      <Colunas pontos={pontos} series={series} formatar={numero} curto={(v) => COMPACTO.format(v)} inteiro margemEsq={36} rotuloGeral="Afiliados em cada nível, mês a mês." />
    </Quadro>
  )
}

function Novos({ novos }) {
  const pontos = novos.map((m) => ({ ...doMes(m), valores: { novos: m.novos } }))
  const series = [{ id: 'novos', nome: 'Novos afiliados', cor: INK }]
  return (
    <Quadro
      titulo="Novos afiliados por mês"
      texto="Cadastros feitos em cada mês."
      vazio={novos.every((m) => !m.novos) ? 'Nenhum cadastro nestes meses.' : ''}
      tabela={montarTabela({ primeira: 'Mês', pontos, series, formatar: numero })}
    >
      <Colunas pontos={pontos} series={series} formatar={numero} curto={(v) => COMPACTO.format(v)} inteiro margemEsq={36} rotuloGeral="Novos afiliados por mês." />
    </Quadro>
  )
}

export default function Graficos({ series: s }) {
  const f = s.funil
  const origem = s.origem
  return (
    <section aria-labelledby="titulo-graficos" className="mt-6">
      <h2 id="titulo-graficos" className="text-[20px] font-bold tracking-[-0.015em] text-ink">Gráficos</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <VendasPorDia serie={s.vendas_por_dia} />
        <ReceitaCusto mensal={s.receita_custo_mensal} />
        <Niveis dist={s.distribuicao_niveis} />
        <Quadro
          titulo="Do clique à venda"
          texto="Cliques nos links de afiliado, checkouts iniciados e vendas no período."
          vazio={f.cliques + f.checkouts + f.vendas + f.estornos.total === 0 ? 'Nenhum clique nem venda por afiliado neste período.' : ''}
          tabela={tabelaDoFunil(f)}
        >
          <Funil funil={f} />
        </Quadro>
        <Quadro
          titulo="Os 10 que mais venderam"
          texto="Por número de vendas no período. Toque no nome para abrir a ficha."
          vazio={s.top_afiliados.length === 0 ? 'Nenhum afiliado vendeu neste período.' : ''}
          tabela={tabelaDoTop(s.top_afiliados)}
        >
          <TopAfiliados top={s.top_afiliados} />
        </Quadro>
        <Novos novos={s.novos_afiliados_por_mes} />
        <Quadro
          titulo="Forma de pagamento"
          texto="Pix e cartão nas vendas por afiliado, comparados com todas as vendas."
          vazio={semVendas(origem.forma_pagamento) ? 'Nenhuma venda neste período.' : ''}
          tabela={tabelaDaOrigem(origem.forma_pagamento)}
        >
          <Origem forma={origem.forma_pagamento} />
        </Quadro>
        <Quadro
          titulo="Código digitado ou link"
          texto="Como o comprador chegou ao código do afiliado."
          semDado={origem.codigo_digitado_vs_link === null ? 'O sistema ainda não guarda como o código chegou à compra, por isso esta comparação não tem números.' : ''}
        />
      </div>
    </section>
  )
}
