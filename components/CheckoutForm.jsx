'use client'

import { useEffect, useState } from 'react'
import { Aviso, Botao, Campo, Icone, MolduraAccent } from '@/components/ds'
import { esquecerUsuario } from '@/components/usuario'
import { priceBRL, site } from '@/lib/site'
import { carrinhoDaVisita, rastrear } from '@/components/MetaPixel'
import AvisoCancelado from '@/components/AvisoCancelado'
import CheckoutCupom from '@/components/CheckoutCupom'
import CheckoutIndicacao, { AvisoIndicacao, useIndicacao } from '@/components/CheckoutIndicacao'
import { useCupom } from '@/components/checkout/useCupom'
import Turnstile, { useTurnstile } from '@/components/afiliados/Turnstile'
import {
  celularValido,
  digitosCelular,
  escolherInicial,
  esquecer,
  guardar,
  lerGuardado,
  mascaraCelular,
  valoresDoEnvio,
} from '@/lib/checkout-campos'

const EVENTO_LIMPAR = 'tv-checkout-limpar'

// "Menos de R$ 0,05 por música": 89,90 ÷ 2.000 = 0,045, calculado do preço e do
// tamanho do pacote para acompanhar se um dos dois mudar.
const porMusica = site.price / site.totalTracks
const porMusicaTeto = Math.ceil(porMusica * 100) / 100
const CONTA_POR_MUSICA =
  porMusicaTeto > porMusica ? `Menos de ${priceBRL(porMusicaTeto)} por música.` : `${priceBRL(porMusicaTeto)} por música.`

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// As mensagens de campo do desenho (MUDANÇAS §4). Só confere o que a pessoa
// digitou; o servidor confere de novo.
function conferir({ nome, email, telefone }) {
  const erros = {}
  if (!nome) erros.nome = 'Escreva seu nome.'
  if (!EMAIL_OK.test(email)) erros.email = 'Esse e-mail parece incompleto. Confira o que vem depois do @.'
  if (!celularValido(digitosCelular(telefone))) erros.telefone = 'Escreva o WhatsApp com DDD.'
  return erros
}
const CAMPO_DO_ERRO = { nome: 'name', email: 'email', telefone: 'tel' }

const SELOS = [
  ['cadeado', 'Pagamento seguro pelo Mercado Pago'],
  ['check', 'Acesso liberado na hora'],
  ['check', 'Garantia de 7 dias'],
]

async function sairDaConta() {
  try {
    await fetch('/api/conta/sair', { method: 'POST' })
  } catch {
    /* mesmo sem resposta, recarrega: o cabeçalho confere de novo quem está logado */
  }
  esquecerUsuario()
  window.location.href = '/assinar'
}

// Formulário que abre o pagamento: manda nome, e-mail e WhatsApp para
// /api/checkout e leva a pessoa para a URL que volta (o Mercado Pago). Um só na
// página (no computador fica fixo na coluna da direita, no celular vem logo
// depois do título). A lógica do envio, do cupom, do código de quem indicou, do
// anti-robô e dos eventos do Pixel é a de sempre; esta tela só mudou de cara.
//
// Nome, e-mail e WhatsApp são obrigatórios (a API recusa sem eles). O WhatsApp
// serve para o lembrete de compra. Quem chega pelo e-mail de lembrete traz
// ?r=<codigo do carrinho>: o formulário busca nome e e-mail em /api/carrinho e
// preenche sozinho. O e-mail nunca vai no endereço porque o Pixel da Meta manda o
// endereço da página para a Meta. Os campos dizem ao navegador o que são
// (autocomplete name/email/tel), e quem já clicou em comprar neste aparelho
// encontra tudo preenchido (só no navegador dela, chave tv_checkout).
//
// `logado`: a pessoa entrou na conta mas ainda não tem o pacote.
export default function CheckoutForm({ logado = false }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [utm, setUtm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lembrado, setLembrado] = useState(false)
  const [conferirAgora, setConferirAgora] = useState(false) // vira true na primeira tentativa que falha
  const anti = useTurnstile() // anti-robô da Cloudflare, invisível para quase todos
  const cupom = useCupom()
  const abrirCupomComCodigo = cupom.abrirComCodigo

  // Código de quem indicou: só registra a venda, não mexe no preço.
  const indicacao = useIndicacao()
  const iniciarIndicacao = indicacao.iniciar

  useEffect(() => {
    const busca = new URLSearchParams(window.location.search)
    const doEndereco = busca.get('cupom')
    if (doEndereco) abrirCupomComCodigo(doEndereco)

    iniciarIndicacao(busca)

    // A origem da visita (ex.: o e-mail de lembrete) vai junto no checkout.
    const source = busca.get('utm_source')
    const medium = busca.get('utm_medium')
    const campaign = busca.get('utm_campaign')
    const content = busca.get('utm_content')
    if (source || medium || campaign) setUtm({ source, medium, campaign, content })

    // Preenche o que já se sabe: o carrinho do lembrete (?r=) e, no que faltar,
    // o que ficou guardado neste aparelho. Só completa campo vazio, para não
    // apagar o que a pessoa começou a escrever.
    const guardado = lerGuardado()
    const preencher = (carrinho) => {
      const inicial = escolherInicial(carrinho, guardado)
      setNome((atual) => atual || inicial.nome)
      setEmail((atual) => atual || inicial.email)
      setTelefone((atual) => atual || inicial.telefone)
      setLembrado(inicial.lembrado)
    }
    const carrinho = carrinhoDaVisita(busca)
    if (carrinho) {
      fetch('/api/carrinho?r=' + encodeURIComponent(carrinho))
        .then((res) => (res.ok ? res.json() : null))
        .then((dados) => preencher(dados?.ok ? dados : null))
        .catch(() => preencher(null))
    } else if (guardado) {
      preencher(null)
    }
  }, [iniciarIndicacao, abrirCupomComCodigo])

  useEffect(() => {
    const esvaziar = () => {
      setNome('')
      setEmail('')
      setTelefone('')
      setLembrado(false)
    }
    window.addEventListener(EVENTO_LIMPAR, esvaziar)
    return () => window.removeEventListener(EVENTO_LIMPAR, esvaziar)
  }, [])

  function limparLembrado() {
    esquecer()
    window.dispatchEvent(new Event(EVENTO_LIMPAR))
  }

  const precoFinal = cupom.aplicado ? cupom.aplicado.preco : site.price
  const erros = conferirAgora ? conferir({ nome: nome.trim(), email: email.trim(), telefone }) : {}
  const qtdErros = Object.keys(erros).length

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const valores = valoresDoEnvio({ nome, email, telefone }, form)
    if (valores.nome !== nome) setNome(valores.nome)
    if (valores.email !== email) setEmail(valores.email)
    const primeira = Object.keys(conferir(valores))[0]
    if (primeira) {
      setConferirAgora(true)
      form.elements.namedItem(CAMPO_DO_ERRO[primeira])?.focus()
      return
    }
    const celular = digitosCelular(valores.telefone)
    setTelefone(mascaraCelular(celular))
    guardar({ nome: valores.nome, email: valores.email, telefone: celular })
    if (anti.falta) return setError('Falta a verificação anti-robô: aguarde um instante (ou marque "Confirme que é humano", se aparecer) e toque em continuar de novo.')
    const codigoAfiliado = indicacao.codigoParaEnvio()
    setLoading(true)
    // Mesmo id no Pixel e no servidor: a Meta conta um evento só.
    const eventoId = crypto.randomUUID()
    rastrear('InitiateCheckout', { value: precoFinal, currency: site.currency }, eventoId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: valores.nome, email: valores.email, telefone: celular, eventoId, cupom: cupom.aplicado ? cupom.aplicado.cupom : '', codigo_afiliado: codigoAfiliado, utm, turnstile: anti.usar() }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Não foi possível abrir o pagamento. Tente novamente.')
        setLoading(false)
        return
      }
      if (indicacao.mostrarAviso(data)) return
      window.location.href = data.url
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente de novo.')
      setLoading(false)
    }
  }

  return (
    <MolduraAccent as="form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5 sm:p-7">
      <AvisoCancelado />
      {qtdErros > 0 && (
        <Aviso variante="erro" titulo={qtdErros === 1 ? 'Confira o campo marcado.' : `Confira os ${qtdErros} campos marcados.`} />
      )}
      {error && <Aviso variante="erro">{error}</Aviso>}

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <strong className="text-[17px] font-[650]">Pacote 2.000 VS</strong>
            <span className="text-[14px] text-text-3">pagamento único, acesso vitalício</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap tabular-nums">
            <span className="text-[14px] text-text-4 line-through">de {priceBRL(site.fullPrice)}</span>
            <span className="font-semi-condensed text-[32px] font-[800] leading-none">{priceBRL(site.price)}</span>
          </div>
        </div>
        <p className="text-[14px] text-text-3">{CONTA_POR_MUSICA}</p>
        <CheckoutCupom cupom={cupom} />
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-5">
        {logado && (
          <Aviso variante="info" icone="usuario">
            Você entrou na sua conta. Para o pacote ficar nela, use o e-mail dela abaixo.{' '}
            <button type="button" onClick={sairDaConta} className="min-h-11 font-semibold underline underline-offset-[3px]">
              Não é você? Sair
            </button>
          </Aviso>
        )}
        <Campo
          rotulo="Seu nome"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          required
          maxLength={80}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erros.nome}
        />
        <Campo
          rotulo="E-mail para receber o acesso"
          tipo="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
        />
        <Campo
          rotulo="WhatsApp com DDD"
          tipo="tel"
          name="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          placeholder="(11) 91234-5678"
          campoClassName="tabular-nums"
          value={telefone}
          onChange={(e) => setTelefone(mascaraCelular(e.target.value))}
          erro={erros.telefone}
        />
        <CheckoutIndicacao
          aberto={indicacao.aberto}
          setAberto={indicacao.setAberto}
          valor={indicacao.valor}
          setValor={indicacao.setValor}
        />
        {lembrado && (
          <p className="-mt-1 text-[14px] text-text-3">
            Não é você?{' '}
            <button type="button" onClick={limparLembrado} className="min-h-11 font-semibold text-ink underline underline-offset-4">
              Limpar
            </button>
          </p>
        )}
        <p className="text-[13px] leading-[1.5] text-text-3">
          Usamos seu e-mail e WhatsApp para enviar o acesso e, se a compra não for concluída, um lembrete.
        </p>
      </div>

      <Turnstile {...anti.props} />
      <Botao type="submit" variante="compra" tamanho="lg" bloco carregando={loading}>
        {loading ? 'Abrindo o Mercado Pago…' : 'Continuar para o pagamento'}
      </Botao>
      {loading && (
        <span role="status" className="sr-only">
          Abrindo o Mercado Pago
        </span>
      )}
      <AvisoIndicacao aviso={indicacao.aviso} />

      <div className="flex flex-col gap-2.5">
        <p className="text-[14px] leading-[1.45] text-text-2">
          Você termina o pagamento no Mercado Pago: Pix ou cartão em até 12x.
        </p>
        <ul className="flex flex-col gap-1.5 text-[14px] text-text-2">
          {SELOS.map(([icone, texto]) => (
            <li key={texto} className="flex items-center gap-2">
              <Icone nome={icone} tamanho={16} />
              {texto}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-text-3">Formas de pagamento aceitas: Pix · Visa · Mastercard · Elo</p>
      </div>
    </MolduraAccent>
  )
}
