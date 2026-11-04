import { dataBr } from '@/lib/afiliados-painel'
import Icone from '../Icone'
import { moeda } from '../formato'
import { urlComprovante } from './apiSaques'
import { quemPagou, textoEspera, urgente } from './saquesUtil'

// Uma linha da lista de saques. Pendente tem os botões e a espera (vermelha e
// com fio na borda depois de 3 dias); pago e recusado só informam.
// No celular e no tablet o cartão empilha; só de 1280 px em diante vira uma linha de 4 colunas.

const COLUNAS = 'xl:grid xl:grid-cols-[minmax(0,1fr)_7.5rem_11.5rem_auto] xl:items-center xl:gap-6'
const COLUNAS_FIM = 'xl:grid xl:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.3fr)] xl:items-start xl:gap-6'

function Quem({ s }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[16px] font-semibold leading-snug text-ink">{s.nome}</p>
      <p className="mt-0.5 text-[13.5px] text-ink-muted">
        Código <span className="figs font-semibold text-ink">{s.codigo}</span>
      </p>
      <p className="figs text-[13.5px] text-ink-muted">Pedido em {dataBr(s.pedido_em)}</p>
    </div>
  )
}

const Valor = ({ s }) => (
  <p className="figs shrink-0 text-[24px] font-extrabold leading-none tracking-[-0.02em] text-ink xl:text-right">{moeda(s.valor_centavos)}</p>
)

function Pendente({ s, aoPagar, aoRecusar }) {
  const atrasado = urgente(s.dias_esperando)
  return (
    <li className={'relative px-4 py-4 sm:px-5 ' + COLUNAS}>
      {atrasado && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-signal" />}
      <div className="flex items-start justify-between gap-4 xl:contents">
        <Quem s={s} />
        <Valor s={s} />
      </div>
      <p className={'figs mt-3 flex items-center gap-1.5 text-[14.5px] xl:mt-0 ' + (atrasado ? 'font-bold text-signal-deep' : 'text-ink-muted')}>
        <Icone nome="relogio" tamanho={16} className="shrink-0" />
        {atrasado && <span className="sr-only">Atrasado. </span>}
        {textoEspera(s.dias_esperando)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm xl:mt-0 xl:flex xl:max-w-none">
        <button type="button" onClick={() => aoRecusar(s)} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px]">
          Recusar
          <span className="sr-only">, {s.nome}</span>
        </button>
        <button type="button" onClick={() => aoPagar(s)} className="btn-ink min-h-11 !px-6 !py-2.5 !text-[14.5px]">
          Pagar
          <span className="sr-only">, {s.nome}</span>
        </button>
      </div>
    </li>
  )
}

function Encerrado({ s }) {
  const pago = quemPagou(s) === 'pago'
  return (
    <li className={'px-4 py-4 sm:px-5 ' + COLUNAS_FIM}>
      <div className="flex items-start justify-between gap-4 xl:contents">
        <Quem s={s} />
        <Valor s={s} />
      </div>
      <div className="mt-3 min-w-0 xl:mt-0">
        {pago ? (
          <>
            <p className="figs flex items-center gap-1.5 text-[14.5px] font-semibold text-ink">
              <Icone nome="confere" tamanho={16} className="shrink-0" />
              Pago{s.pago_em ? ' em ' + dataBr(s.pago_em) : ''}
            </p>
            {s.comprovante ? (
              <a
                href={urlComprovante(s.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="link-signal -ml-1 min-h-11 px-1 !text-[14.5px]"
              >
                Ver comprovante
                <Icone nome="externo" tamanho={15} />
                <span className="sr-only">de {s.nome} (abre em outra aba)</span>
              </a>
            ) : (
              <p className="text-[13.5px] text-ink-muted">Sem comprovante anexado.</p>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[14.5px] font-semibold text-signal-deep">
              <Icone nome="x" tamanho={16} className="shrink-0" />
              Recusado
            </p>
            {s.pago_por && <p className="text-[13.5px] text-ink-muted">Recusado por {s.pago_por}.</p>}
            {s.nota && (
              <p className="mt-1.5 break-words border-l-2 border-signal pl-3 text-[14.5px] leading-[1.5] text-ink">
                <span className="text-ink-muted">Motivo: </span>
                {s.nota}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  )
}

export default function SaqueLinha({ saque, aoPagar, aoRecusar }) {
  return quemPagou(saque) === 'pendente' ? <Pendente s={saque} aoPagar={aoPagar} aoRecusar={aoRecusar} /> : <Encerrado s={saque} />
}
