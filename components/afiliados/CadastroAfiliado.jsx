'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  cpfValido,
  digitosCpf,
  mascaraCpf,
  sugerirCodigo,
} from '@/lib/afiliados-campos'
import { celularValido, digitosCelular, mascaraCelular } from '@/lib/checkout-campos'
import { validarFormatoCodigo } from '@/lib/afiliados/codigo'
import { rastrear } from '@/components/MetaPixel'
import CadastroConcluido from './CadastroConcluido'
import CampoCodigo from './CampoCodigo'
import EscadaNiveis from './EscadaNiveis'
import useDisponibilidade from './useDisponibilidade'

export const LINK_REGRAS = '/afiliados#regras'

const campo =
  'mt-2 w-full rounded border bg-white px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none'
const rotulo = 'block text-[14px] font-semibold text-ink'
const msgErro = 'mt-2 text-[13.5px] font-semibold text-signal-deep'

// Campos que o servidor pode apontar em { ok:false, erro, campo }.
const CAMPOS = ['nome', 'cpf', 'telefone', 'canal', 'codigo', 'aceite']

function Campo({ id, rot, erro, ajuda, children }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>
        {rot}
      </label>
      {children}
      {ajuda && !erro && <p className="mt-2 text-[13px] text-ink-muted">{ajuda}</p>}
      {erro && (
        <p id={`${id}-erro`} role="alert" className={msgErro}>
          {erro}
        </p>
      )}
    </div>
  )
}

// Formulário da seção 6.2: logado, ainda não afiliado. O servidor confere tudo
// de novo (CPF, código, programa aberto); aqui só se ajuda a pessoa a acertar.
export default function CadastroAfiliado({ nomeInicial = '', niveis = [], aberto = true }) {
  const id = useId()
  const [nome, setNome] = useState(nomeInicial)
  const [cpf, setCpf] = useState('')
  const [tel, setTel] = useState('')
  const [canal, setCanal] = useState('')
  const [codigo, setCodigo] = useState('')
  const [mexeuNoCodigo, setMexeuNoCodigo] = useState(false)
  const [sugestao, setSugestao] = useState('')
  const [avisar, setAvisar] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erros, setErros] = useState({})
  const [geral, setGeral] = useState('')
  const [sessaoPerdida, setSessaoPerdida] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [ocupados, setOcupados] = useState(() => new Set())
  const [encerrado, setEncerrado] = useState(!aberto)
  const [feito, setFeito] = useState(null)
  const form = useRef(null)

  const disp = useDisponibilidade(codigo, ocupados)

  // O código sai do primeiro nome quando a pessoa sai do campo Nome, e só se
  // ela ainda não escreveu um. Depois disso, o campo é dela.
  function sugerirDoNome() {
    if (mexeuNoCodigo || codigo) return
    const s = sugerirCodigo(nome)
    if (s) setCodigo(s)
  }

  // Código ocupado: já deixa uma alternativa pronta (primeiro nome + 2 dígitos).
  useEffect(() => {
    if (disp.estado === 'ocupado') setSugestao((s) => s || sugerirCodigo(nome))
  }, [disp.estado, nome])

  function validar() {
    const e = {}
    if (nome.trim().split(/\s+/).length < 2) e.nome = 'Informe seu nome completo.'
    if (!cpfValido(cpf)) e.cpf = 'Confira o CPF: os números não batem.'
    if (!celularValido(digitosCelular(tel))) e.telefone = 'Informe o celular com DDD.'
    if (canal.trim().length < 3) e.canal = 'Conte onde você vai divulgar.'
    if (!validarFormatoCodigo(codigo)) e.codigo = 'Escolha um código de 4 a 15 letras e números.'
    else if (disp.estado === 'ocupado') e.codigo = 'Esse código já está em uso. Escolha outro.'
    if (!aceite) e.aceite = 'Marque a caixa para aceitar as regras.'
    return e
  }

  async function enviar(ev) {
    ev.preventDefault()
    setGeral('')
    const e = validar()
    setErros(e)
    if (Object.keys(e).length) {
      const primeiro = CAMPOS.find((c) => e[c])
      form.current?.querySelector(`[name="${primeiro}"]`)?.focus()
      return
    }
    setEnviando(true)
    // O mesmo id vai ao servidor e ao Pixel: a Meta conta um cadastro só.
    const eventoId = crypto.randomUUID()
    try {
      const res = await fetch('/api/afiliados/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: digitosCpf(cpf),
          telefone: digitosCelular(tel),
          canal: canal.trim(),
          codigo,
          aceite: true,
          avisar_cada_venda: avisar,
          eventoId,
        }),
      })
      const dados = await res.json().catch(() => ({}))
      if (res.ok && dados.ok) {
        if (dados.pixel) rastrear('CompleteRegistration', { content_name: 'afiliado', status: dados.status }, eventoId)
        setFeito({ codigo: dados.codigo || codigo, link: dados.link, status: dados.status })
        window.scrollTo({ top: 0 })
        return
      }
      if (res.status === 401) setSessaoPerdida(true)
      else if (res.status === 403 && /encerrad/i.test(dados.erro || '')) setEncerrado(true)
      else if (res.status === 409 && dados.campo === 'codigo') {
        setOcupados((antes) => new Set(antes).add(codigo))
        setErros({ codigo: dados.erro })
      } else if (CAMPOS.includes(dados.campo) && dados.erro) setErros({ [dados.campo]: dados.erro })
      else setGeral(dados.erro || 'Não consegui concluir agora. Tente de novo em instantes.')
    } catch {
      setGeral('Falha de conexão. Confira a internet e tente de novo.')
    }
    setEnviando(false)
  }

  if (feito) return <CadastroConcluido {...feito} niveis={niveis} />

  const formulario = encerrado ? (
    <div className="card-cut bg-white px-6 py-7" role="status">
      <h2 className="text-[19px] font-bold text-ink">Cadastros encerrados no momento</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        O programa não está aceitando novos afiliados agora. Volte em breve.
      </p>
    </div>
  ) : (
    <form ref={form} onSubmit={enviar} noValidate className="card-cut space-y-5 bg-white px-6 py-7 sm:px-8">
      {sessaoPerdida && (
        <p role="alert" className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] text-ink">
          Sua sessão expirou.{' '}
          <a href="/entrar?expirou=1&volta=%2Fminha-conta%2Fafiliado" className="link-signal font-semibold">
            Entre de novo
          </a>{' '}
          para terminar o cadastro.
        </p>
      )}

      <Campo id={`${id}-nome`} rot="Nome completo" erro={erros.nome}>
        <input id={`${id}-nome`} name="nome" type="text" autoComplete="name" autoCapitalize="words" maxLength={80}
          value={nome} onChange={(e) => setNome(e.target.value)} onBlur={sugerirDoNome}
          aria-invalid={erros.nome ? true : undefined} aria-describedby={erros.nome ? `${id}-nome-erro` : undefined}
          className={`${campo} ${erros.nome ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>

      <Campo id={`${id}-cpf`} rot="CPF" erro={erros.cpf} ajuda="Usado só para pagar você por Pix.">
        <input id={`${id}-cpf`} name="cpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00"
          value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))}
          onBlur={() => cpf && setErros((a) => ({ ...a, cpf: cpfValido(cpf) ? undefined : 'Confira o CPF: os números não batem.' }))}
          aria-invalid={erros.cpf ? true : undefined} aria-describedby={erros.cpf ? `${id}-cpf-erro` : undefined}
          className={`${campo} ${erros.cpf ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>

      <Campo id={`${id}-tel`} rot="Celular" erro={erros.telefone}>
        <input id={`${id}-tel`} name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(27) 99999-8888"
          value={tel} onChange={(e) => setTel(mascaraCelular(e.target.value))}
          aria-invalid={erros.telefone ? true : undefined} aria-describedby={erros.telefone ? `${id}-tel-erro` : undefined}
          className={`${campo} ${erros.telefone ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>

      <Campo id={`${id}-canal`} rot="Onde você vai divulgar" erro={erros.canal}>
        <input id={`${id}-canal`} name="canal" type="text" autoComplete="off" maxLength={120}
          placeholder="Instagram, YouTube, WhatsApp…"
          value={canal} onChange={(e) => setCanal(e.target.value)}
          aria-invalid={erros.canal ? true : undefined} aria-describedby={erros.canal ? `${id}-canal-erro` : undefined}
          className={`${campo} ${erros.canal ? 'border-signal-deep' : 'border-line'}`} />
      </Campo>

      <div>
        <CampoCodigo id={`${id}-codigo`} valor={codigo} estado={disp.estado} motivo={disp.motivo}
          onChange={(v) => { setCodigo(v); setMexeuNoCodigo(true); setErros((a) => ({ ...a, codigo: undefined })) }}
          outraSugestao={disp.estado === 'ocupado' ? sugestao : ''}
          onSugerir={() => { setCodigo(sugestao); setSugestao(''); setErros((a) => ({ ...a, codigo: undefined })) }} />
        {erros.codigo && disp.estado !== 'ocupado' && (
          <p role="alert" className={msgErro}>{erros.codigo}</p>
        )}
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14.5px] leading-[1.55] text-ink">
        <input type="checkbox" name="avisar" checked={avisar} onChange={(e) => setAvisar(e.target.checked)}
          className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[#E5152D]" />
        <span>Me avise por e-mail a cada venda</span>
      </label>

      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14.5px] leading-[1.55] text-ink">
          <input type="checkbox" name="aceite" checked={aceite} onChange={(e) => setAceite(e.target.checked)}
            aria-invalid={erros.aceite ? true : undefined}
            className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[#E5152D]" />
          <span>
            Li e aceito as{' '}
            <a href={LINK_REGRAS} target="_blank" rel="noopener noreferrer" className="link-quiet font-semibold">
              regras do programa<span className="sr-only"> (abre em nova aba)</span>
            </a>
            .
          </span>
        </label>
        {erros.aceite && <p role="alert" className={msgErro}>{erros.aceite}</p>}
      </div>

      {geral && (
        <p role="alert" className="rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] font-medium text-ink">
          {geral}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn-signal w-full min-h-[52px] disabled:opacity-60">
        {enviando ? 'Criando seu código…' : 'Criar meu código de afiliado'}
      </button>
    </form>
  )

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
      <div>
        <h1 className="text-d2 text-ink [text-wrap:balance]">Crie seu código de afiliado</h1>
        <p className="mt-4 max-w-text font-read text-[18px] leading-[1.7] text-ink-muted">
          Quem comprar pelo seu link paga o preço normal, e a venda fica registrada no seu nome. O código é só o seu
          registro: não dá desconto.
        </p>
        <div className="mt-8">{formulario}</div>
      </div>
      <aside className="lg:sticky lg:top-8 lg:self-start" aria-labelledby={`${id}-escada`}>
        <section className="card-cut bg-white px-6 py-7">
          <h2 id={`${id}-escada`} className="text-[21px] font-bold leading-[1.2] text-ink">
            Quanto você ganha por venda
          </h2>
          <EscadaNiveis niveis={niveis} className="mt-6" />
        </section>
      </aside>
    </div>
  )
}
