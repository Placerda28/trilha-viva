'use client'

import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { CabecalhoPagina } from './Casca'
import { useGestao } from './useGestao'
import Segmentos from './Segmentos'
import { Aviso, Esqueleto, Vazio } from './Estados'
import { hojeBrasilia, moeda, numero, somarDias } from './formato'
import { MINIMO, PRECO, precoFinal } from './cuponsPreco'
import Lista from './CuponsLista'

const TIPOS = [
  { id: 'percentual', rotulo: '% do preço' },
  { id: 'valor', rotulo: 'R$ de desconto' },
]

const SITUACOES = [
  { id: 'ativos', rotulo: 'Ativos' },
  { id: 'vencidos', rotulo: 'Vencidos/esgotados' },
  { id: 'desativados', rotulo: 'Desativados' },
  { id: 'todos', rotulo: 'Todos' },
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
    <form onSubmit={criar} noValidate>
      <p className="mt-1 text-[14px] text-ink-muted">
        Todo cupom tem data de validade e limite de usos. O preço nunca fica abaixo de {moeda(MINIMO)}.
      </p>

      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Campo id="c-codigo" rotulo="Código" erro={erroDe('codigo')} dica="Letras, números, - e _. De 4 a 40.">
          <input
            id="c-codigo"
            value={form.codigo}
            onChange={mudar('codigo')}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex.: ENSAIO30"
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

export default function Cupons() {
  const [tentativa, setTentativa] = useState(0)
  const [situacao, setSituacao] = useState('ativos')
  const { dados, erro, carregando } = useGestao('/api/gestao/cupons?situacao=' + (situacao === 'vencidos' ? 'todos' : situacao), tentativa)
  const itens = dados?.itens.filter((c) => situacao !== 'vencidos' || (c.ativo && (c.vencido || c.esgotado))) || []
  const recarregar = () => setTentativa((n) => n + 1)

  return (
    <section aria-label="Cupons">
      <CabecalhoPagina titulo="Cupons" texto="Descontos, usos e validade dos cupons." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-bold text-ink">
          Cupons {dados && !carregando && <span className="figs font-normal text-ink-muted">({numero(itens.length)})</span>}
        </h3>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button type="button" className="btn-ink min-h-[44px] !px-4 !py-2 !text-[14px]">Novo cupom</button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/40" />
            <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[81] max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded border border-line bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <Dialog.Title className="text-[20px] font-bold text-ink">Novo cupom</Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="btn-quiet min-h-[44px] !px-3 !py-2 !text-[14px]">Fechar</button>
                </Dialog.Close>
              </div>
              <NovoCupom onCriado={recarregar} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="mt-4">
        <Segmentos opcoes={SITUACOES} valor={situacao} onEscolher={setSituacao} rotulo="Situação dos cupons" />
      </div>
      {erro ? (
        <Aviso erro={erro} onTentar={recarregar} />
      ) : !dados || carregando ? (
        <Esqueleto linhas={3} />
      ) : itens.length === 0 ? (
        <Vazio
          titulo="Nenhum cupom nesta situação"
          texto="Escolha outro filtro ou use Novo cupom. Dá para divulgar pelo código ou pelo link pronto, que já abre a compra com o desconto."
        />
      ) : (
        <Lista itens={itens} onMudou={recarregar} />
      )}
    </section>
  )
}
