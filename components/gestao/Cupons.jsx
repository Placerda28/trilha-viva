'use client'

import { useState } from 'react'
import { useGestao } from './useGestao'
import Segmentos from './Segmentos'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { dataHora, hojeBrasilia, moeda, numero, somarDias } from './formato'
import { site } from '@/lib/site'

// Preço do pacote em centavos. A conta abaixo só serve para a prévia na tela:
// quem decide o preço cobrado é o servidor, na hora de abrir o pagamento.
const PRECO = Math.round(site.price * 100)
const MINIMO = 100

function precoFinal(tipo, valor) {
  const v = Number(valor) || 0
  const bruto = tipo === 'percentual' ? Math.round((PRECO * (100 - v)) / 100) : PRECO - v
  return Math.max(MINIMO, bruto)
}

function descricaoDesconto(c) {
  return c.tipo === 'percentual' ? c.valor + '%' : moeda(c.valor)
}

// O cupom está num destes estados, nesta ordem de prioridade.
function situacao(c) {
  if (!c.ativo) return { rotulo: 'Desativado', cor: 'border-line text-ink-muted' }
  if (c.vencido) return { rotulo: 'Vencido', cor: 'border-line text-ink-muted' }
  if (c.esgotado) return { rotulo: 'Esgotado', cor: 'border-line text-ink-muted' }
  return { rotulo: 'Ativo', cor: 'border-ink text-ink' }
}

// Só o dia (DD/MM/AAAA) de uma data ISO, no horário de Brasília.
const soDia = (iso) => dataHora(iso).slice(0, 10)

const TIPOS = [
  { id: 'percentual', rotulo: '% do preço' },
  { id: 'valor', rotulo: 'R$ de desconto' },
]

const formVazio = () => ({
  codigo: '',
  tipo: 'percentual',
  valor: '',
  valido_ate: somarDias(hojeBrasilia(), 30),
  limite_usos: '1',
})

function Campo({ id, rotulo, erro, dica, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] text-ink-muted">
        {rotulo}
      </label>
      <div className="mt-1">{children}</div>
      {erro ? (
        <p id={id + '-erro'} className="mt-1 text-[13px] text-signal-deep">
          {erro}
        </p>
      ) : dica ? (
        <p className="mt-1 text-[12.5px] text-ink-muted">{dica}</p>
      ) : null}
    </div>
  )
}

function NovoCupom({ onCriado }) {
  const [form, setForm] = useState(formVazio)
  const [erro, setErro] = useState({ campo: '', msg: '' })
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState('')
  const hoje = hojeBrasilia()

  const mudar = (nome) => (e) => {
    let valor = e.target.value
    // Código em maiúsculas e só com os caracteres que o servidor aceita: a
    // pessoa vê na hora o que vai ser gravado.
    if (nome === 'codigo') valor = valor.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    setForm((f) => ({ ...f, [nome]: valor }))
    if (erro.campo === nome) setErro({ campo: '', msg: '' })
    setOk('')
  }

  const valorCentavos =
    form.tipo === 'percentual'
      ? Number(form.valor)
      : Math.round(Number(String(form.valor).replace(',', '.')) * 100)
  const temValor = Number.isFinite(valorCentavos) && valorCentavos > 0
  const final = temValor ? precoFinal(form.tipo, valorCentavos) : PRECO

  async function criar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro({ campo: '', msg: '' })
    setOk('')
    try {
      const res = await fetch('/api/gestao/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: form.codigo,
          tipo: form.tipo,
          valor: valorCentavos,
          valido_ate: form.valido_ate,
          limite_usos: Number(form.limite_usos),
        }),
      })
      if (res.status === 404) {
        setErro({ campo: '', msg: 'Sua sessão acabou. Entre de novo para continuar.' })
        return
      }
      const dados = await res.json().catch(() => null)
      if (!res.ok || !dados?.ok) {
        setErro({ campo: dados?.campo || '', msg: dados?.erro || 'Não consegui criar o cupom agora.' })
        return
      }
      setOk('Cupom ' + dados.cupom.codigo + ' criado.')
      setForm(formVazio())
      onCriado()
    } catch {
      setErro({ campo: '', msg: 'Falha de conexão. Confira a internet e tente de novo.' })
    } finally {
      setEnviando(false)
    }
  }

  const classeCampo = (nome) =>
    'w-full rounded border bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none ' +
    (erro.campo === nome ? 'border-signal-deep' : 'border-line')
  const erroDe = (nome) => (erro.campo === nome ? erro.msg : '')

  return (
    <form onSubmit={criar} noValidate className="mt-8 rounded border border-line bg-white px-4 py-5 sm:px-6">
      <h2 className="text-[17px] font-bold text-ink">Novo cupom</h2>
      <p className="mt-1 text-[14px] text-ink-muted">
        Todo cupom tem data de validade e limite de usos. O preço nunca fica abaixo de {moeda(MINIMO)}.
      </p>

      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo id="c-codigo" rotulo="Código" erro={erroDe('codigo')} dica="Letras, números, - e _. De 4 a 40.">
          <input
            id="c-codigo"
            value={form.codigo}
            onChange={mudar('codigo')}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            placeholder="EX.: ENSAIO30"
            aria-invalid={erro.campo === 'codigo'}
            aria-describedby={erro.campo === 'codigo' ? 'c-codigo-erro' : undefined}
            className={classeCampo('codigo') + ' font-semibold tracking-[0.02em]'}
          />
        </Campo>

        <div>
          <p className="text-[13px] text-ink-muted">Desconto</p>
          <div className="mt-1 space-y-2">
            <Segmentos
              opcoes={TIPOS}
              valor={form.tipo}
              onEscolher={(id) => {
                setForm((f) => ({ ...f, tipo: id, valor: '' }))
                setOk('')
              }}
              rotulo="Tipo de desconto"
              tamanho="compacto"
            />
            <input
              id="c-valor"
              inputMode={form.tipo === 'percentual' ? 'numeric' : 'decimal'}
              value={form.valor}
              onChange={mudar('valor')}
              placeholder={form.tipo === 'percentual' ? 'Ex.: 30 (%)' : 'Ex.: 20,00 (R$)'}
              aria-label={form.tipo === 'percentual' ? 'Porcentagem de desconto' : 'Desconto em reais'}
              aria-invalid={erro.campo === 'valor'}
              className={classeCampo('valor')}
            />
            {erroDe('valor') && <p className="text-[13px] text-signal-deep">{erroDe('valor')}</p>}
          </div>
        </div>

        <Campo id="c-validade" rotulo="Vale até (inclusive)" erro={erroDe('valido_ate')} dica="Até 23h59 de Brasília.">
          <input
            id="c-validade"
            type="date"
            value={form.valido_ate}
            min={hoje}
            max={somarDias(hoje, 365)}
            onChange={mudar('valido_ate')}
            aria-invalid={erro.campo === 'valido_ate'}
            className={classeCampo('valido_ate')}
          />
        </Campo>

        <Campo id="c-limite" rotulo="Limite de usos" erro={erroDe('limite_usos')} dica="Quantas compras podem usar.">
          <input
            id="c-limite"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            value={form.limite_usos}
            onChange={mudar('limite_usos')}
            aria-invalid={erro.campo === 'limite_usos'}
            className={classeCampo('limite_usos')}
          />
        </Campo>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="figs text-[14.5px] text-ink" aria-live="polite">
          {temValor ? (
            <>
              Com este cupom o pacote sai por <strong>{moeda(final)}</strong>{' '}
              <span className="text-ink-muted">(de {moeda(PRECO)})</span>
              {final === MINIMO && <span className="text-ink-muted"> · preço mínimo aplicado</span>}
            </>
          ) : (
            <span className="text-ink-muted">Preencha o desconto para ver o preço final.</span>
          )}
        </p>
        <button type="submit" disabled={enviando} className="btn-ink !px-5 !py-3 !text-[14.5px] disabled:opacity-60">
          {enviando ? 'Criando...' : 'Criar cupom'}
        </button>
      </div>

      {erro.msg && !erro.campo && (
        <p role="alert" className="mt-3 text-[14px] text-signal-deep">
          {erro.msg}
        </p>
      )}
      {ok && (
        <p role="status" className="mt-3 text-[14px] font-semibold text-ink">
          {ok}
        </p>
      )}
    </form>
  )
}

// Desativar é definitivo, então pede confirmação ali mesmo, na linha, sem
// janela por cima da tela.
function Desativar({ cupom, onFeito }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function desativar() {
    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/gestao/cupons/desativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cupom.id }),
      })
      const dados = await res.json().catch(() => null)
      if (!res.ok || !dados?.ok) {
        setErro(res.status === 404 ? 'Sessão encerrada ou cupom inexistente.' : dados?.erro || 'Não consegui desativar.')
        return
      }
      onFeito()
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="link-quiet text-[13.5px] font-semibold">
        Desativar
      </button>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink-muted">Desativar de vez?</span>
      <button
        type="button"
        onClick={desativar}
        disabled={enviando}
        className="rounded border border-signal-deep px-2.5 py-1 text-[13px] font-semibold text-signal-deep transition-colors duration-150 hover:bg-signal-deep hover:text-white disabled:opacity-60"
      >
        {enviando ? 'Desativando...' : 'Sim, desativar'}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="text-[13px] text-ink-muted hover:text-ink">
        Cancelar
      </button>
      {erro && <span className="text-[13px] text-signal-deep">{erro}</span>}
    </span>
  )
}

// Link que já abre a compra com o cupom aplicado (o CheckoutForm lê ?cupom=).
function CopiarLink({ codigo }) {
  const [copiado, setCopiado] = useState(false)
  const link = site.url + '/assinar?cupom=' + encodeURIComponent(codigo)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        } catch {
          window.prompt('Copie o link:', link)
        }
      }}
      className="link-quiet text-[13.5px] font-semibold"
    >
      {copiado ? 'Link copiado' : 'Copiar link'}
    </button>
  )
}

function Etiqueta({ c }) {
  const s = situacao(c)
  return <span className={'rounded-sm border px-1.5 py-0.5 text-[11.5px] font-semibold ' + s.cor}>{s.rotulo}</span>
}

function Usos({ c }) {
  return (
    <>
      <span className="text-ink">
        {numero(c.usos)} de {numero(c.limite_usos)}
      </span>
      {c.reservas_ativas > 0 && (
        <span className="block text-[12.5px] text-ink-muted">{numero(c.reservas_ativas)} pagando agora</span>
      )}
    </>
  )
}

function Acoes({ c, onMudou }) {
  const valendo = c.ativo && !c.vencido && !c.esgotado
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
      {valendo && <CopiarLink codigo={c.codigo} />}
      {c.ativo ? <Desativar cupom={c} onFeito={onMudou} /> : null}
    </span>
  )
}

function Lista({ itens, onMudou }) {
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded border border-line bg-white md:block">
        <table className="w-full text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Cupom</th>
              <th scope="col" className="px-4 py-3 font-semibold">Desconto</th>
              <th scope="col" className="px-4 py-3 font-semibold">Usos</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Faturamento</th>
              <th scope="col" className="px-4 py-3 font-semibold">Vale até</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-4 py-3.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tracking-[0.02em] text-ink">{c.codigo}</span>
                    <Etiqueta c={c} />
                  </span>
                  <span className="block text-[12.5px] text-ink-muted">
                    criado por {c.criado_por} · {soDia(c.criado_em)}
                  </span>
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink">
                  {descricaoDesconto(c)}
                  <span className="block text-[12.5px] text-ink-muted">sai por {moeda(precoFinal(c.tipo, c.valor))}</span>
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5">
                  <Usos c={c} />
                </td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-right text-ink">{moeda(c.faturamento_centavos)}</td>
                <td className="figs whitespace-nowrap px-4 py-3.5 text-ink-muted">{soDia(c.valido_ate)}</td>
                <td className="px-4 py-3.5">
                  <Acoes c={c} onMudou={onMudou} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white md:hidden">
        {itens.map((c) => (
          <li key={c.id} className="px-4 py-4">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tracking-[0.02em] text-ink">{c.codigo}</span>
              <Etiqueta c={c} />
            </span>
            <dl className="figs mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div>
                <dt className="text-ink-muted">Desconto</dt>
                <dd className="text-ink">
                  {descricaoDesconto(c)} · sai por {moeda(precoFinal(c.tipo, c.valor))}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Usos</dt>
                <dd>
                  <Usos c={c} />
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Faturamento</dt>
                <dd className="text-ink">{moeda(c.faturamento_centavos)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Vale até</dt>
                <dd className="text-ink">{soDia(c.valido_ate)}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <Acoes c={c} onMudou={onMudou} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Cupons() {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro } = useGestao('/api/gestao/cupons', tentativa)
  const recarregar = () => setTentativa((n) => n + 1)

  return (
    <section aria-labelledby="titulo-cupons">
      <h2 id="titulo-cupons" className="sr-only">
        Cupons
      </h2>
      <NovoCupom onCriado={recarregar} />

      <h3 className="mt-10 text-[17px] font-bold text-ink">
        Cupons {dados && <span className="figs font-normal text-ink-muted">({numero(dados.itens.length)})</span>}
      </h3>
      {erro ? (
        <Aviso erro={erro} onTentar={recarregar} />
      ) : !dados ? (
        <Esqueleto linhas={3} />
      ) : dados.itens.length === 0 ? (
        <Vazio
          titulo="Nenhum cupom ainda"
          texto="Crie o primeiro acima. Dá para divulgar pelo código ou pelo link pronto, que já abre a compra com o desconto."
        />
      ) : (
        <Lista itens={dados.itens} onMudou={recarregar} />
      )}
    </section>
  )
}
