import Icone from './Icone'
import { ACOES } from './Registro'
import { moeda } from './formato'

// Hora relativa ("há 12 min"). `agora` entra de fora para o servidor e o
// navegador contarem a partir do mesmo instante.
export function haQuanto(em, agora) {
  const min = Math.max(0, Math.round((new Date(agora).getTime() - new Date(em).getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'há ' + h + ' h'
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : 'há ' + d + ' dias'
}

// Transforma os acontecimentos de /api/gestao/painel (tipo compra, lead,
// recuperado ou equipe) em frases para a lista.
export function itensDaAtividade(lista) {
  return lista.map((a, i) => {
    const quem = a.nome || a.email || 'Alguém'
    let texto
    if (a.tipo === 'compra') texto = quem + ' comprou' + (a.valor_centavos == null ? '' : ' por ' + moeda(a.valor_centavos))
    else if (a.tipo === 'lead') texto = quem + ' pediu a VS grátis'
    else if (a.tipo === 'recuperado') texto = 'Carrinho de ' + quem + ' recuperado: comprou depois do lembrete'
    else texto = (a.quem || 'A equipe').split('@')[0] + ' ' + (ACOES[a.acao] || a.acao || 'fez uma ação') + (a.alvo && a.acao !== 'senha_trocada' ? ' ' + a.alvo : '')
    return { id: a.tipo + '-' + a.em + '-' + i, tipo: a.tipo, texto, em: a.em }
  })
}

const ICONES = { compra: 'vendas', lead: 'leads', recuperado: 'carrinhos', equipe: 'equipe' }

// Os últimos acontecimentos misturados: compra paga, lead novo, carrinho
// recuperado e ação da equipe. itens: [{ id, tipo, texto, em }] (veja itensDaAtividade).
export default function Atividade({ itens, agora }) {
  return (
    <section aria-labelledby="atividade-recente" className="rounded-md border border-line bg-white">
      <h2 id="atividade-recente" className="px-4 pb-1 pt-4 text-[16px] font-bold tracking-[-0.01em] text-ink sm:px-5 sm:pt-5">
        Atividade recente
      </h2>
      {itens.length === 0 ? (
        <p className="px-4 pb-5 pt-2 text-[14.5px] text-ink-muted sm:px-5">Ainda não houve movimento.</p>
      ) : (
        <ul className="mt-2">
          {itens.map((i) => (
            <li key={i.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 sm:px-5">
              <Icone nome={ICONES[i.tipo] || 'registro'} tamanho={18} className="shrink-0 text-ink-muted" />
              <p className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink">{i.texto}</p>
              <time dateTime={i.em} className="figs shrink-0 text-[13px] text-ink-muted">
                {haQuanto(i.em, agora)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
