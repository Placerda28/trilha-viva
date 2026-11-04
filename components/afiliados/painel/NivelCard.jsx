import { reais } from '@/lib/afiliados-campos'
import { alinhamento, diaMes, posicoesDaBarra, textoDias, textoRitmo, vendasTxt } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import Medalha from './Medalha'

const ALINHA = {
  inicio: 'left-0',
  meio: '-translate-x-1/2',
  fim: 'right-0',
}

// Painel preto com o selo, a barra com os marcos e o ritmo. É a peça que responde
// "em que nível estou e quanto falta" sem a pessoa precisar ler mais nada.
function Barra({ niveis, vendas }) {
  const b = posicoesDaBarra(niveis, vendas)
  const alAtual = alinhamento(b.atual)
  return (
    <div className="relative mt-9 pt-9" role="img" aria-label={`Progresso do mês: ${vendasTxt(vendas)}. Metas: ${b.marcos.map((m) => `${m.nome} com ${vendasTxt(m.vendas)}`).join(', ')}.`}>
      <div
        className={`absolute top-0 whitespace-nowrap text-[14px] font-bold text-white ${alAtual === 'meio' ? '-translate-x-1/2' : alAtual === 'fim' ? '-translate-x-full' : ''}`}
        style={{ left: `${b.atual}%` }}
        aria-hidden="true"
      >
        {vendasTxt(vendas)}
      </div>
      <div className="relative h-3 bg-white/15" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${b.atual}%` }} />
        {b.marcos.map((m) => (
          <span key={m.nome} className="absolute -top-1 bottom-[-4px] w-px bg-white/45" style={{ left: `${Math.min(m.pct, 99.6)}%` }} />
        ))}
        <span className="absolute -top-2 h-7 w-[4px] -translate-x-1/2 bg-signal" style={{ left: `${Math.min(Math.max(b.atual, 0.6), 99.4)}%` }} />
      </div>
      <div className="relative mt-3 h-11" aria-hidden="true">
        {b.marcos.map((m) => (
          <div
            key={m.nome}
            className={`absolute top-0 text-[13px] leading-[1.35] ${ALINHA[alinhamento(m.pct)]} ${alinhamento(m.pct) === 'fim' ? 'text-right' : alinhamento(m.pct) === 'inicio' ? 'text-left' : 'text-center'}`}
            style={alinhamento(m.pct) === 'meio' ? { left: `${m.pct}%` } : undefined}
          >
            <span className="block font-bold text-white">{m.nome}</span>
            <span className="block text-white/65">{m.vendas}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Frase({ d }) {
  const { nivel, proximo, faltam, seBaterProximo } = d
  if (nivel && !proximo) {
    return (
      <>
        <strong className="text-white">Você está no nível máximo!</strong> Cada venda vale <span className="whitespace-nowrap">{reais(nivel.valor_por_venda_centavos)}</span>.
      </>
    )
  }
  if (!proximo) return null
  return (
    <>
      <strong className="text-white">
        Faltam {vendasTxt(faltam)} para o {proximo.nome.toUpperCase()}.
      </strong>{' '}
      Aí todas as suas vendas do mês passam a valer <span className="whitespace-nowrap">{reais(proximo.valor_por_venda_centavos)}</span>.
      {seBaterProximo ? (
        <>
          {' '}
          Chegando às {proximo.vendas_minimas} vendas, seu mês rende{' '}
          <strong className="figs text-white">{reais(seBaterProximo.total)}</strong>.
        </>
      ) : null}
    </>
  )
}

export default function NivelCard({ d }) {
  const { nivel, proximo, niveis, vendasValidas, diasRestantes, ultimoDiaDoMes, ritmoNecessario } = d
  const ordenados = [...niveis].sort((a, b) => a.vendas_minimas - b.vendas_minimas)
  const grau = nivel ? ordenados.findIndex((n) => n.id === nivel.id || n.nome === nivel.nome) + 1 : 0
  const ritmo = proximo ? textoRitmo(ritmoNecessario) : ''
  const base = ordenados[0]
  return (
    <section className="panel overflow-hidden px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8" aria-labelledby="nivel-titulo">
      <div className="flex items-center gap-4 sm:gap-5">
        <Medalha cor={nivel?.cor} grau={grau} tamanho={72} titulo={nivel ? `Selo do nível ${nivel.nome}` : 'Sem nível ainda'} className="text-white" />
        <div className="min-w-0">
          <h2 id="nivel-titulo" className="text-[30px] font-extrabold leading-none tracking-[-0.025em] text-white sm:text-[38px]">
            {nivel ? `Nível ${nivel.nome}` : 'Sem nível ainda'}
          </h2>
          <p className="mt-2.5 text-[16px] leading-[1.4] text-white/80 sm:text-[17.5px]">
            {nivel ? 'Cada venda do mês ' : base ? `Com a primeira venda você entra no ${base.nome}: cada venda ` : ''}
            <span className="whitespace-nowrap">
              vale <strong className="figs text-white">{reais((nivel || base)?.valor_por_venda_centavos)}</strong>
              <Ajuda escuro titulo="Nível do mês">
                <p>O nível depende de quantas vendas você faz no mês. Ele vale para todas as vendas daquele mês, não só para as novas.</p>
                <p>No dia 1º o mês recomeça e você volta a contar do zero.</p>
              </Ajuda>
            </span>
          </p>
        </div>
      </div>

      <Barra niveis={niveis} vendas={vendasValidas} />

      <p className="mt-2 max-w-[44rem] text-[16px] leading-[1.6] text-white/75">
        <Frase d={d} />
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-5 text-[15px] text-white/80">
        <p className="font-semibold text-white">
          {textoDias(diasRestantes)} <span className="font-normal text-white/65">(até {diaMes(ultimoDiaDoMes)})</span>
        </p>
        {ritmo ? (
          <p>
            Para chegar ao {proximo.nome}: <span className="whitespace-nowrap"><strong className="text-white">{ritmo}</strong>
            <Ajuda escuro titulo="Ritmo necessário">
              <p>É a média de vendas por dia que você precisa fazer até o fim do mês para chegar ao próximo nível.</p>
              <p>Se o número parecer alto, tudo bem: o que você já vendeu continua valendo.</p>
            </Ajuda></span>
          </p>
        ) : null}
      </div>
    </section>
  )
}
