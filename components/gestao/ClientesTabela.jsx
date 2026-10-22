import { dataHora, moeda, numero, FORMAS } from './formato'
import { formatarCelular } from '@/lib/gestao/csv'
import { SeloTeste } from './AcaoGestao'
import { rotuloOrigem } from '@/lib/rastreio'

// Uma linha por cliente (ou por compra, na tela de período). No computador é
// uma tabela; no celular, uma lista em que cada cliente é um bloco — sete
// colunas não cabem em 375 px sem rolar de lado. Um clique na linha abre o
// Detalhe do cliente (`onAbrir(id)`), onde ficam as ações.

function Forma({ forma }) {
  if (!forma) return <span className="text-ink-faint">—</span>
  return <span>{FORMAS[forma] || forma}</span>
}

function Marcas({ c }) {
  const status = c.compra?.status
  return (
    <>
      {c.teste && <SeloTeste />}
      {c.bloqueado && (
        <span className="rounded-sm border border-signal-deep px-1.5 py-0.5 text-[11.5px] font-semibold text-signal-deep">
          Bloqueado
        </span>
      )}
      {status && status !== 'pago' && (
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-muted">
          {status}
        </span>
      )}
    </>
  )
}

function Whatsapp({ telefone }) {
  if (!telefone) return <span className="figs block text-[13.5px] text-ink-faint">—</span>
  return (
    <a
      href={'https://wa.me/55' + telefone}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="figs block min-h-[32px] w-fit text-[13.5px] text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
      aria-label={'Abrir conversa no WhatsApp com ' + formatarCelular(telefone)}
    >
      {formatarCelular(telefone)}
    </a>
  )
}

function Nome({ c, whatsapp, onAbrir }) {
  const conteudo = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{c.nome || 'Sem nome'}</span>
        <Marcas c={c} />
      </span>
      <span className="block break-all text-[13.5px] text-ink-muted">{c.email}</span>
    </>
  )
  return (
    <>
      {onAbrir ? (
        <button
          type="button"
          onClick={() => onAbrir(c.id)}
          aria-label={'Abrir o detalhe de ' + (c.nome || c.email)}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {conteudo}
        </button>
      ) : (
        conteudo
      )}
      {whatsapp && <Whatsapp telefone={c.telefone} />}
    </>
  )
}

// Origem da venda: o anúncio (utm_content), senão a campanha, senão a fonte.
// Compra sem nenhum registro de rastreio é de antes de 12/10/2026: traço, para
// não parecer venda "direta".
function OrigemCompra({ compra }) {
  if (!compra || (!compra.utm_source && !compra.meta)) {
    return <span className="text-ink-faint" title="Compra anterior ao registro da origem">—</span>
  }
  return <span className="break-all">{rotuloOrigem(compra)}</span>
}

function MetaCompra({ meta }) {
  if (!meta) return <span className="text-ink-faint">—</span>
  if (meta === 'ok') return <span className="whitespace-nowrap text-ink">✓ enviado</span>
  // Compra de teste não vai para a Meta, de propósito.
  if (meta === 'teste') return <span className="whitespace-nowrap text-ink-muted">não enviado (teste)</span>
  return (
    <span className="whitespace-nowrap text-signal-deep" title={'Código: ' + meta}>
      ✗ falhou
    </span>
  )
}

const chave = (c, i) => (c.compra?.id || 'c') + '-' + c.id + '-' + i

// onAbrir: abre o Detalhe do cliente (clique na linha). Sem ele a linha não clica.
// rastreio: só a aba Período passa (colunas Origem e Meta).
export default function ClientesTabela({ itens, whatsapp = false, onAbrir, rastreio = false }) {
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded border border-line bg-white md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
              <th scope="col" className="px-4 py-3 font-semibold">Compra</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Valor</th>
              <th scope="col" className="px-4 py-3 font-semibold">Forma</th>
              <th scope="col" className="px-4 py-3 font-semibold">Cupom</th>
              {rastreio && <th scope="col" className="px-4 py-3 font-semibold">Origem</th>}
              {rastreio && <th scope="col" className="px-4 py-3 font-semibold">Meta</th>}
              <th scope="col" className="px-4 py-3 font-semibold">Senha</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((c, i) => (
              <tr
                key={chave(c, i)}
                onClick={onAbrir ? () => onAbrir(c.id) : undefined}
                className={'align-top ' + (onAbrir ? 'cursor-pointer transition-colors duration-150 hover:bg-paper/50' : '')}
              >
                <td className="max-w-[320px] px-4 py-3.5">
                  <Nome c={c} whatsapp={whatsapp} onAbrir={onAbrir} />
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink-muted">{dataHora(c.compra?.em)}</td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-right text-ink">
                  {c.compra ? moeda(c.compra.valor_centavos) : '—'}
                </td>
                <td className="px-4 py-3.5 text-ink">
                  <Forma forma={c.compra?.forma} />
                </td>
                <td className="px-4 py-3.5 text-ink">
                  {c.compra?.cupom || <span className="text-ink-faint">—</span>}
                </td>
                {rastreio && (
                  <td className="max-w-[160px] px-4 py-3.5 text-ink">
                    <OrigemCompra compra={c.compra} />
                  </td>
                )}
                {rastreio && (
                  <td className="px-4 py-3.5">
                    <MetaCompra meta={c.compra?.meta} />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3.5">
                  {c.tem_senha ? (
                    <span className="text-ink">Criou</span>
                  ) : (
                    <span className="text-ink-muted">Não criou</span>
                  )}
                </td>
                <td className="figs px-4 py-3.5 text-right text-ink">{numero(c.downloads)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white md:hidden">
        {itens.map((c, i) => (
          <li
            key={chave(c, i)}
            onClick={onAbrir ? () => onAbrir(c.id) : undefined}
            className={'px-4 py-4 ' + (onAbrir ? 'cursor-pointer' : '')}
          >
            <Nome c={c} whatsapp={whatsapp} onAbrir={onAbrir} />
            <dl className="figs mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div>
                <dt className="text-ink-muted">Compra</dt>
                <dd className="text-ink">{dataHora(c.compra?.em)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Valor</dt>
                <dd className="text-ink">
                  {c.compra ? moeda(c.compra.valor_centavos) : '—'}
                  {c.compra?.forma && <> · <Forma forma={c.compra.forma} /></>}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Senha</dt>
                <dd className="text-ink">{c.tem_senha ? 'Criou' : 'Não criou'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Downloads</dt>
                <dd className="text-ink">{numero(c.downloads)}</dd>
              </div>
              {rastreio && c.compra && (
                <>
                  <div>
                    <dt className="text-ink-muted">Origem</dt>
                    <dd className="text-ink">
                      <OrigemCompra compra={c.compra} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Meta</dt>
                    <dd>
                      <MetaCompra meta={c.compra.meta} />
                    </dd>
                  </div>
                </>
              )}
              {c.compra?.cupom && (
                <div className="col-span-2">
                  <dt className="text-ink-muted">Cupom</dt>
                  <dd className="text-ink">{c.compra.cupom}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
