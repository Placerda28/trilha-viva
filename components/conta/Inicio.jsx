import Link from 'next/link'
import { Botao, BotaoCompra, Icone, MolduraAccent } from '@/components/ds'
import { textoLancamento } from '@/lib/palco'
import { primeiroNome } from '@/lib/conta-pagina'
import TituloConta, { SecaoTitulo } from './TituloConta'

// Início da conta (MUDANÇAS §7). Hoje o Palco só tem o estado "Em breve": não
// há assinatura nem computadores no servidor. Os outros estados do desenho
// (teste, ativo, recusado, cancelado) entram junto com esse backend.

const RotuloCartao = ({ id, children }) => (
  <h2 id={id} className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">
    {children}
  </h2>
)

const Situacao = ({ children, cheio, className = '' }) => (
  <p className="flex items-center gap-2 font-semi-condensed text-[22px] font-bold leading-tight">
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 border ${cheio ? 'border-ink bg-ink' : `bg-transparent ${className || 'border-ink'}`}`}
    />
    {children}
  </p>
)

function CartaoPacote({ temPacote, usados, limite }) {
  return (
    <MolduraAccent as="section" traco={48} aria-labelledby="c-pacote" className="flex flex-col gap-3.5 p-[22px]">
      <RotuloCartao id="c-pacote">Pacote 2.000 VS</RotuloCartao>
      {temPacote ? (
        <>
          <Situacao cheio>Liberado</Situacao>
          <p className="text-[15px] leading-[1.5] text-text-2">
            Acesso vitalício. Hoje você baixou{' '}
            <strong className="font-semibold text-ink tabular-nums">
              {usados} de {limite}
            </strong>
            .
          </p>
          <Botao href="/minha-conta/acervo" bloco className="mt-auto">
            Abrir Minhas VS
          </Botao>
        </>
      ) : (
        <>
          <Situacao>Ainda não liberado</Situacao>
          <p className="text-[15px] leading-[1.5] text-text-2">
            2.000 multitracks com clique e guia. R$ 89,90, pagamento único, acesso vitalício.
          </p>
          <BotaoCompra bloco tamanho="md" className="mt-auto" />
        </>
      )}
    </MolduraAccent>
  )
}

function CartaoPalco({ temPacote }) {
  return (
    <section aria-labelledby="c-palco" className="flex flex-col gap-3.5 border border-line-2 p-[22px]">
      <RotuloCartao id="c-palco">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width="20" height="20" className="block" />
        Palco
      </RotuloCartao>
      <Link
        href="/minha-conta/conhecer-palco"
        aria-label="Conhecer o Palco: ver a tela principal do programa"
        className="block aspect-video overflow-hidden border border-ink bg-ink"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/palco-ao-vivo.webp"
          alt=""
          width="1920"
          height="1080"
          loading="lazy"
          className="block h-full w-full object-cover"
        />
      </Link>
      <Situacao className="border-field-border">Em breve</Situacao>
      <p className="text-[15px] leading-[1.5] text-text-2">
        {textoLancamento()}.{' '}
        {temPacote
          ? 'Você ganha 7 dias grátis e as 2.000 VS já aparecem lá dentro.'
          : 'Programa para tocar VS no culto, com clique e guia no fone.'}
      </p>
      <div className="mt-auto flex flex-wrap gap-2.5">
        <Botao href="/palco#lista-de-espera" bloco>
          Me avise no lançamento
        </Botao>
      </div>
    </section>
  )
}

function Atalhos({ temPacote }) {
  const itens = [
    temPacote
      ? { t: 'Minhas VS', d: 'Buscar e baixar até 30 por dia', href: '/minha-conta/acervo' }
      : { t: 'Liberar as 2.000 VS', d: 'R$ 89,90, pagamento único', href: '/assinar' },
    { t: 'Palco', d: 'Ver o que o programa faz', href: '/palco' },
    { t: 'Afiliado', d: 'Seu link e suas vendas do mês', href: '/minha-conta/afiliado' },
    { t: 'Ajuda', d: 'Relatar um problema ou falar com a gente', href: '/minha-conta/ajuda' },
  ]
  return (
    <section aria-labelledby="h-atalhos" className="flex flex-col gap-2">
      <SecaoTitulo id="h-atalhos" className="mb-1">
        Atalhos
      </SecaoTitulo>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-6 border-b border-line">
        {itens.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex min-h-[60px] items-center gap-3 border-t border-line hover:bg-surface"
          >
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{a.t}</span>
              <span className="text-[14px] text-text-3">{a.d}</span>
            </span>
            <Icone nome="seta-direita" tamanho={18} traco={1.5} className="shrink-0 opacity-60" />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Inicio({ nome, temPacote, usados, limite }) {
  const primeiro = primeiroNome(nome)
  return (
    <div className="flex flex-col gap-8">
      <TituloConta
        titulo={primeiro ? `Olá, ${primeiro}` : 'Olá'}
        subtitulo="Aqui fica tudo o que você tem na Trilha Viva."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
        <CartaoPacote temPacote={temPacote} usados={usados} limite={limite} />
        <CartaoPalco temPacote={temPacote} />
      </div>
      <Atalhos temPacote={temPacote} />
    </div>
  )
}
