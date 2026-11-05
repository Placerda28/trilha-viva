'use client'

import { useState } from 'react'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto } from '../../Estados'
import { dataHora } from '../../formato'
import SubAbas from '../SubAbas'
import { erroDaAcao, useApiAfiliados, useBusca } from '../apiAfiliados'
import { LIMITES_CONFIG, centavosParaCampo, validarConfig } from '../afiliadosUtil'
import { Campo, classeCampo } from '../lista/Pecas'

// Gestão > Afiliados > Configurações: carência, dia do fechamento, intervalo e
// valor mínimo de saque, aprovação automática e programa aberto. Só o Master
// grava; a equipe vê os mesmos valores sem poder mexer.

// O banco pode mandar 'AAAA-MM-DD HH:MM:SS' (UTC, sem fuso): vira ISO antes de formatar.
const utc = (t) => (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t) ? t.replace(' ', 'T') + 'Z' : t)

const NUMEROS = [
  ['carencia_dias', 'Carência da comissão (dias)', 'Quantos dias a comissão de uma venda espera antes de ficar disponível para saque.'],
  ['dia_fechamento', 'Dia do fechamento do mês', 'A partir de que dia o mês anterior é fechado e o bônus de nível cai no saldo.'],
  ['intervalo_saque_dias', 'Intervalo entre saques (dias)', 'Quantos dias o afiliado espera entre um pedido de saque e o próximo.'],
]

function Interruptor({ id, rotulo, texto, ligado, aoMudar, desabilitado }) {
  return (
    <label htmlFor={id} className={'flex items-start gap-3 rounded border border-line bg-white px-4 py-3.5 ' + (desabilitado ? '' : 'cursor-pointer has-[:checked]:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink')}>
      <input id={id} type="checkbox" checked={ligado} disabled={desabilitado} onChange={(e) => aoMudar(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-ink" />
      <span className="min-w-0">
        <span className="block text-[15.5px] font-semibold text-ink">{rotulo}</span>
        <span className="mt-0.5 block text-[14px] leading-[1.5] text-ink-muted">{texto}</span>
      </span>
    </label>
  )
}

function Formulario({ inicial, master, aoSalvar }) {
  const api = useApiAfiliados()
  const [v, setV] = useState({
    carencia_dias: String(inicial.carencia_dias),
    dia_fechamento: String(inicial.dia_fechamento),
    intervalo_saque_dias: String(inicial.intervalo_saque_dias),
    saque_minimo: centavosParaCampo(inicial.saque_minimo_centavos),
    aprovacao_automatica: Boolean(inicial.aprovacao_automatica),
    programa_aberto: Boolean(inicial.programa_aberto),
  })
  const [tocou, setTocou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(null)
  const { erros, valores } = validarConfig(v)
  const campo = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }))
    setOk(null)
  }
  const liga = (k) => (b) => {
    setV((x) => ({ ...x, [k]: b }))
    setOk(null)
  }

  async function salvar(e) {
    e.preventDefault()
    setTocou(true)
    if (!valores) return
    setSalvando(true)
    setErro('')
    setOk(null)
    const r = await api.salvarConfig(valores)
    setSalvando(false)
    if (!r.ok) return setErro(erroDaAcao(r))
    setOk(r.dados)
    aoSalvar()
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-6">
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {NUMEROS.map(([k, rotulo, ajuda]) => {
          const [min, max] = LIMITES_CONFIG[k]
          return (
            <Campo key={k} id={`c-${k}`} rotulo={rotulo} ajuda={`${ajuda} De ${min} a ${max}.`} erro={tocou ? erros[k] : ''}>
              <input id={`c-${k}`} inputMode="numeric" value={v[k]} onChange={campo(k)} disabled={!master} aria-invalid={Boolean(tocou && erros[k])} className={classeCampo(tocou && erros[k]) + ' figs max-w-[10rem]'} />
            </Campo>
          )
        })}
        <Campo id="c-saque_minimo" rotulo="Saque mínimo (R$)" ajuda="Abaixo disso o afiliado não consegue pedir saque. Use 0 para não ter mínimo." erro={tocou ? erros.saque_minimo_centavos : ''}>
          <input id="c-saque_minimo" inputMode="decimal" value={v.saque_minimo} onChange={campo('saque_minimo')} disabled={!master} aria-invalid={Boolean(tocou && erros.saque_minimo_centavos)} className={classeCampo(tocou && erros.saque_minimo_centavos) + ' figs max-w-[10rem]'} />
        </Campo>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Interruptor id="c-aprovacao" rotulo="Aprovação automática" texto="Quando ligada, quem se cadastra já entra ativo, sem esperar você aprovar." ligado={v.aprovacao_automatica} aoMudar={liga('aprovacao_automatica')} desabilitado={!master} />
        <Interruptor id="c-aberto" rotulo="Programa aberto" texto="Quando desligado, a página de cadastro não aceita novos afiliados. Quem já é afiliado continua." ligado={v.programa_aberto} aoMudar={liga('programa_aberto')} desabilitado={!master} />
      </div>

      {master ? (
        <div>
          {erro && (
            <p role="alert" className="mb-4 border-l-2 border-signal pl-3 text-[14.5px] font-semibold text-signal-deep">
              {erro}
            </p>
          )}
          {ok && (
            <p role="status" className="mb-4 border-l-2 border-ink pl-3 text-[14.5px] text-ink">
              {ok.alterado === false || Object.keys(ok.mudou || {}).length === 0 ? 'Nada mudou: os valores já eram esses.' : 'Configurações salvas.'}
            </p>
          )}
          <button type="submit" disabled={salvando} className="btn-ink min-h-11 w-full !px-8 !py-3 !text-[15px] disabled:opacity-60 sm:w-auto">
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      ) : (
        <p className="text-[14px] text-ink-muted">Só o Administrador Master muda estas configurações. Você vê os valores de hoje.</p>
      )}
    </form>
  )
}

export default function Config({ master = false }) {
  const [tentativa, setTentativa] = useState(0)
  const { dados, erro } = useBusca((api, sinal) => api.config(sinal), [tentativa])
  return (
    <section aria-label="Configurações dos afiliados">
      <CabecalhoPagina titulo="Configurações" texto="As regras de prazo e de saque do programa de afiliados." />
      <SubAbas atual="config" />
      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        <Esqueleto linhas={4} />
      ) : (
        <div className="card-line px-4 py-5 sm:px-6 sm:py-6">
          <p className="mb-5 border-l-2 border-signal pl-3 text-[14.5px] font-semibold text-ink">{dados.aviso || 'Mudanças não alteram meses já fechados.'}</p>
          <Formulario inicial={dados} master={master} aoSalvar={() => setTentativa((n) => n + 1)} />
          {dados.atualizado_em && (
            <p className="figs mt-6 border-t border-line pt-4 text-[13.5px] text-ink-muted">
              Última mudança em {dataHora(utc(dados.atualizado_em))}
              {dados.atualizado_por ? `, por ${dados.atualizado_por}` : ''}.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
