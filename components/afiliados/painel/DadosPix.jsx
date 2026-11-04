'use client'

import { useState } from 'react'
import { cpfValido, mascaraCpf } from '@/lib/afiliados-campos'
import { TIPOS_PIX, nomeTipoPix } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { enviar, useDados, useHttp } from './api'
import { Carregando, Falhou } from './Carregando'

const campo = 'mt-2 min-h-11 w-full rounded border bg-white px-4 py-3 text-[16px] text-ink focus:border-ink focus:outline-none'
const rotulo = 'block text-[14px] font-semibold text-ink'
const msgErro = 'mt-2 text-[13.5px] font-semibold text-signal-deep'

function Campo({ id, nome, erro, children, ajuda }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{nome}</label>
      {children}
      {ajuda && !erro && <p className="mt-2 text-[13px] text-ink-muted">{ajuda}</p>}
      {erro && <p id={`${id}-erro`} role="alert" className={msgErro}>{erro}</p>}
    </div>
  )
}

function Formulario({ inicial, onSalvo, onCancelar }) {
  const chamar = useHttp()
  const [f, setF] = useState({ tipo_chave: inicial?.tipo_chave || 'cpf', chave: '', titular_nome: inicial?.titular_nome || '', titular_cpf: '', senha: '' })
  const [erros, setErros] = useState({})
  const [geral, setGeral] = useState('')
  const [semSenha, setSemSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const tipo = TIPOS_PIX.find((t) => t.valor === f.tipo_chave)
  const muda = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'titular_cpf' ? mascaraCpf(e.target.value) : e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    const novos = {}
    if (!f.chave.trim()) novos.chave = 'Digite a chave Pix.'
    if (f.titular_nome.trim().length < 3) novos.titular_nome = 'Digite o nome completo do titular.'
    if (!cpfValido(f.titular_cpf)) novos.titular_cpf = 'Confira o CPF do titular.'
    if (!f.senha) novos.senha = 'Digite a senha da sua conta.'
    setErros(novos)
    setGeral('')
    if (Object.keys(novos).length) return
    setEnviando(true)
    const r = await enviar(chamar, '/api/afiliados/pix', f)
    setEnviando(false)
    if (r.ok && r.corpo?.ok) return onSalvo(r.corpo.pix)
    const c = r.corpo || {}
    if (c.codigo === 'sem_senha') setSemSenha(true)
    else if (c.campo) setErros({ [c.campo]: c.erro || 'Confira este campo.' })
    else setGeral(c.erro || 'Não deu para salvar agora. Tente de novo em instantes.')
  }

  return (
    <form onSubmit={salvar} noValidate className="card-cut space-y-5 px-5 py-6 sm:px-8">
      <h2 className="text-[19px] font-bold text-ink">{inicial ? 'Alterar dados Pix' : 'Cadastre sua chave Pix'}</h2>
      {geral && <p role="alert" className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] text-ink">{geral}</p>}
      {semSenha && (
        <p role="alert" className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] leading-[1.55] text-ink">
          Sua conta ainda não tem senha. Crie uma pelo{' '}
          <a href="/recuperar" className="link-quiet font-semibold">Esqueci a senha</a> e volte aqui.
        </p>
      )}
      <Campo id="pix-tipo" nome="Tipo da chave">
        <select id="pix-tipo" value={f.tipo_chave} onChange={muda('tipo_chave')} className={`${campo} border-line`}>
          {TIPOS_PIX.map((t) => <option key={t.valor} value={t.valor}>{t.nome}</option>)}
        </select>
      </Campo>
      <Campo id="pix-chave" nome="Chave Pix" erro={erros.chave}>
        <input id="pix-chave" value={f.chave} onChange={muda('chave')} placeholder={tipo.exemplo} autoComplete="off" spellCheck={false}
          aria-invalid={Boolean(erros.chave)} aria-describedby={erros.chave ? 'pix-chave-erro' : undefined}
          className={`${campo} ${erros.chave ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>
      <Campo id="pix-nome" nome="Nome completo do titular" erro={erros.titular_nome}>
        <input id="pix-nome" value={f.titular_nome} onChange={muda('titular_nome')} autoComplete="name"
          aria-invalid={Boolean(erros.titular_nome)} aria-describedby={erros.titular_nome ? 'pix-nome-erro' : undefined}
          className={`${campo} ${erros.titular_nome ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>
      <Campo id="pix-cpf" nome="CPF do titular" erro={erros.titular_cpf} ajuda="O titular da chave tem que ser você.">
        <input id="pix-cpf" value={f.titular_cpf} onChange={muda('titular_cpf')} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00"
          aria-invalid={Boolean(erros.titular_cpf)} aria-describedby={erros.titular_cpf ? 'pix-cpf-erro' : undefined}
          className={`${campo} ${erros.titular_cpf ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>
      <Campo id="pix-senha" nome="Senha da sua conta" erro={erros.senha} ajuda="Pedimos a senha para confirmar que é você quem está mudando.">
        <input id="pix-senha" type="password" value={f.senha} onChange={muda('senha')} autoComplete="current-password"
          aria-invalid={Boolean(erros.senha)} aria-describedby={erros.senha ? 'pix-senha-erro' : undefined}
          className={`${campo} ${erros.senha ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancelar && <button type="button" onClick={onCancelar} className="btn-quiet min-h-12 px-6 py-3">Cancelar</button>}
        <button type="submit" disabled={enviando} className="btn-signal min-h-12 px-8 disabled:opacity-60">{enviando ? 'Salvando…' : 'Salvar dados Pix'}</button>
      </div>
    </form>
  )
}

function Resumo({ pix, bloqueado, motivo, onAlterar }) {
  const linhas = [['Tipo da chave', nomeTipoPix(pix.tipo_chave)], ['Chave', pix.chave_mascarada], ['Titular', pix.titular_nome], ['CPF do titular', pix.titular_cpf_mascarado]]
  return (
    <section className="card-line px-5 py-6 sm:px-8" aria-labelledby="pix-titulo">
      <h2 id="pix-titulo" className="text-[19px] font-bold text-ink">
        Seus dados Pix{' '}
        <Ajuda titulo="Dados Pix">
          <p>É para esta chave que a Trilha Viva faz o pagamento dos seus saques. Mostramos só parte dos dados, por segurança.</p>
        </Ajuda>
      </h2>
      <dl className="mt-5 divide-y divide-line border-y border-line">
        {linhas.map(([nome, valor]) => (
          <div key={nome} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-[14px] text-ink-muted">{nome}</dt>
            <dd className="break-all text-[16px] font-semibold text-ink">{valor}</dd>
          </div>
        ))}
      </dl>
      {bloqueado && <p id="pix-bloqueio" className="mt-4 text-[14.5px] leading-[1.55] text-ink">{motivo || 'Você tem um saque em análise. Os dados voltam a poder ser alterados depois do pagamento.'}</p>}
      <button type="button" onClick={onAlterar} disabled={bloqueado} aria-describedby={bloqueado ? 'pix-bloqueio' : undefined}
        className={`mt-5 min-h-12 w-full sm:w-auto ${bloqueado ? 'btn cursor-not-allowed border border-line bg-paper px-8 text-ink-muted' : 'btn-ink px-8'}`}>
        Alterar dados Pix
      </button>
    </section>
  )
}

export default function DadosPix() {
  const { dados, erro, carregando, recarregar } = useDados('/api/afiliados/pix')
  const [editando, setEditando] = useState(false)
  const [salvou, setSalvou] = useState(false)
  if (carregando && !dados) return <Carregando />
  if (erro) return <Falhou onTentar={recarregar} />
  const salvo = () => { setEditando(false); setSalvou(true); recarregar() }
  return (
    <div className="space-y-5">
      {salvou && <p role="status" className="rounded border border-line bg-white px-4 py-3 text-[15px] font-semibold text-ink">Dados Pix salvos.</p>}
      {dados.pix && !editando ? (
        <Resumo pix={dados.pix} bloqueado={dados.bloqueado} motivo={dados.motivo} onAlterar={() => { setSalvou(false); setEditando(true) }} />
      ) : (
        <Formulario inicial={dados.pix} onSalvo={salvo} onCancelar={dados.pix ? () => setEditando(false) : null} />
      )}
    </div>
  )
}
