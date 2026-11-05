'use client'

import { useState } from 'react'
import { dataBr, nomeTipoPix } from '@/lib/afiliados-painel'
import { dataHora } from '../../formato'
import Gaveta from '../Gaveta'
import BotaoCopiar from '../BotaoCopiar'
import { erroDaAcao, useApiAfiliados } from '../apiAfiliados'
import { Dado } from '../lista/Pecas'

// Dados do afiliado e do Pix. CPF e chave Pix chegam mascarados; "Revelar"
// pede confirmação (fica registrado quem viu) e mostra o dado inteiro nesta
// tela, até a pessoa ocultar ou sair da ficha.

function Revelar({ campo, nome, aoRevelado, aoFechar }) {
  const api = useApiAfiliados()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const rotulo = campo.tipo === 'cpf' ? 'o CPF' : 'a chave Pix'

  async function confirmar() {
    setCarregando(true)
    setErro('')
    const r = await api.revelar(campo.id, campo.tipo)
    setCarregando(false)
    if (!r.ok) return setErro(erroDaAcao(r))
    aoRevelado(campo.tipo, r.dados)
    aoFechar()
  }

  return (
    <Gaveta travada={carregando} aoFechar={aoFechar} titulo={`Mostrar ${rotulo} inteiro?`} descricao={nome}>
      <div className="px-4 py-5 sm:px-6">
        <p className="text-[15px] leading-[1.55] text-ink">
          Vai aparecer {campo.tipo === 'cpf' ? 'o CPF completo' : 'a chave Pix completa, com o CPF do titular'}. <strong>Fica registrado quem viu</strong>: seu e-mail, o dia e a hora, no histórico de ações do afiliado.
        </p>
        {erro && (
          <p role="alert" className="mt-4 border-l-2 border-signal pl-3 text-[14.5px] font-semibold text-signal-deep">
            {erro}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button type="button" onClick={aoFechar} disabled={carregando} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px] disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={carregando} className="btn-ink min-h-11 !px-6 !py-2.5 !text-[14.5px] disabled:opacity-60">
            {carregando ? 'Abrindo…' : 'Revelar'}
          </button>
        </div>
      </div>
    </Gaveta>
  )
}

function ComRevelar({ mascarado, inteiro, aoRevelar, aoOcultar, rotulo, copiavel, master }) {
  return (
    <>
      <span className="figs break-all">{inteiro ?? mascarado}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-2">
        {inteiro ? (
          <>
            <button type="button" onClick={aoOcultar} className="btn-quiet min-h-11 !px-4 !py-2 !text-[14px]">
              Ocultar<span className="sr-only"> {rotulo}</span>
            </button>
            {copiavel && <BotaoCopiar texto={copiavel} rotulo="Copiar" rotuloCopiado="Copiado" />}
          </>
        ) : master ? (
          <button type="button" onClick={aoRevelar} className="btn-quiet min-h-11 !px-4 !py-2 !text-[14px]">
            Revelar<span className="sr-only"> {rotulo}</span>
          </button>
        ) : null}
      </span>
    </>
  )
}

export default function FichaDados({ afiliado: a, master = false }) {
  const [revelando, setRevelando] = useState(null)
  const [aberto, setAberto] = useState({}) // { cpf: '123...', pix: {...} }
  const mostrar = (tipo, dados) => setAberto((o) => ({ ...o, [tipo]: tipo === 'cpf' ? dados.cpf : dados.pix }))
  const ocultar = (tipo) => setAberto((o) => ({ ...o, [tipo]: undefined }))
  const pix = a.pix

  return (
    <section aria-labelledby="ficha-dados" className="card-line px-4 py-5 sm:px-6">
      <h2 id="ficha-dados" className="text-[17px] font-bold text-ink">
        Dados do afiliado
      </h2>
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        <Dado rotulo="E-mail">{a.email}</Dado>
        <Dado rotulo="WhatsApp">{a.telefone || '—'}</Dado>
        <Dado rotulo="Canal de divulgação">{a.canal || '—'}</Dado>
        <Dado rotulo="CPF">
          <ComRevelar master={master} mascarado={a.cpf} inteiro={aberto.cpf} rotulo="o CPF" aoRevelar={() => setRevelando({ tipo: 'cpf', id: a.id })} aoOcultar={() => ocultar('cpf')} />
        </Dado>
        <Dado rotulo="Cadastro em">{a.criado_em ? dataHora(a.criado_em) : '—'}</Dado>
        <Dado rotulo="Termos aceitos em">{a.termos_aceitos_em ? dataHora(a.termos_aceitos_em) : '—'}</Dado>
        <Dado rotulo="Aviso por e-mail a cada venda">{a.avisar_cada_venda ? 'Ligado' : 'Desligado'}</Dado>
        <Dado rotulo="Nível travado">{a.nivel_travado ? a.nivel_travado.nome : 'Não'}</Dado>
        <Dado rotulo="Códigos antigos">
          {a.codigos_antigos.length === 0 ? (
            '—'
          ) : (
            <ul className="space-y-0.5">
              {a.codigos_antigos.map((c) => (
                <li key={c.codigo} className="figs text-[14.5px]">
                  {c.codigo} <span className="font-normal text-ink-muted">trocado em {dataBr(c.trocado_em)}{c.trocado_por ? ` por ${c.trocado_por}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </Dado>
      </dl>

      {!master && <p className="mt-4 text-[14px] text-ink-muted">Só o Administrador Master paga saques e vê CPF e Pix completos.</p>}

      <h3 className="mt-6 border-t border-line pt-5 text-[16px] font-bold text-ink">Chave Pix</h3>
      {pix ? (
        <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <Dado rotulo="Tipo">{nomeTipoPix(pix.tipo_chave)}</Dado>
          <Dado rotulo="Chave">
            <ComRevelar
              master={master}
              mascarado={pix.chave}
              inteiro={aberto.pix?.chave}
              copiavel={aberto.pix?.chave}
              rotulo="a chave Pix"
              aoRevelar={() => setRevelando({ tipo: 'pix', id: a.id })}
              aoOcultar={() => ocultar('pix')}
            />
          </Dado>
          <Dado rotulo="Titular">{aberto.pix?.titular_nome || pix.titular_nome}</Dado>
          <Dado rotulo="CPF do titular">
            <span className="figs">{aberto.pix?.titular_cpf || pix.titular_cpf}</span>
          </Dado>
          <Dado rotulo="Atualizada em">{pix.atualizado_em ? dataBr(pix.atualizado_em) : '—'}</Dado>
        </dl>
      ) : (
        <p className="mt-2 text-[14.5px] text-ink-muted">Ainda não cadastrou uma chave Pix. Sem ela, não consegue pedir saque.</p>
      )}

      {revelando && <Revelar campo={revelando} nome={a.nome} aoRevelado={mostrar} aoFechar={() => setRevelando(null)} />}
    </section>
  )
}
