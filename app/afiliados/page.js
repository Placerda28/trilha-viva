import Link from 'next/link'
import { Breadcrumbs, Faq, SectionHead } from '@/components/ui'
import EscadaNiveis from '@/components/afiliados/EscadaNiveis'
import Simulador from '@/components/afiliados/Simulador'
import Medalha from '@/components/afiliados/painel/Medalha'
import { NIVEIS_PUBLICOS, REGRAS_PUBLICAS, moedaCurta, saltos, tabelaDoSimulador } from '@/lib/afiliados-simulador'
import { OG_IMAGEM, priceBRL, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'

// Página pública e ESTÁTICA de propósito (limite de CPU): não lê o banco, nem
// cookie, nem searchParams. Os níveis e prazos vêm de lib/afiliados-simulador.js
// (espelho do seed; a fonte da verdade é o banco). Se o programa estiver
// fechado, quem clica no botão cai em /minha-conta/afiliado, que lê o banco e
// mostra "Cadastros encerrados no momento".
const title = 'Seja afiliado e ganhe por cada venda da Trilha Viva'
const description =
  'Divulgue seu link da Trilha Viva e ganhe de R$ 15 a R$ 30 por venda, conforme a meta do mês. Veja o simulador, as regras e receba por Pix.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/afiliados' },
  openGraph: { images: OG_IMAGEM, title, description, url: `${site.url}/afiliados` },
}

const { carenciaDias, diaFechamento, intervaloSaqueDias } = REGRAS_PUBLICAS
const maximo = Math.max(...NIVEIS_PUBLICOS.map((n) => n.valor_por_venda_centavos))
const tabela = tabelaDoSimulador()
const degraus = saltos()
const preco = priceBRL(site.price)

const PASSOS = [
  ['Cadastre-se', 'Entre na sua conta do site (ou crie uma na hora), informe seus dados e escolha o seu código de afiliado.'],
  ['Divulgue seu link e seu código', `Quem compra pelo seu link paga o preço normal, ${preco}. A venda fica registrada no seu nome.`],
  ['Receba por Pix', `Cada venda libera ${carenciaDias} dias depois. Você pede o saque quando houver saldo e o dinheiro cai na sua chave Pix.`],
]

const REGRAS_DINHEIRO = [
  `Cada venda libera ${carenciaDias} dias depois de acontecer. É o prazo de segurança, caso a compra seja devolvida.`,
  `O bônus de nível cai no dia ${diaFechamento} do mês seguinte e já fica disponível para saque.`,
  `O saque pode ser pedido a cada ${intervaloSaqueDias} dias, só por Pix e só para uma chave no CPF do próprio afiliado.`,
  'Se a compra for reembolsada, a venda sai da sua meta e a comissão é cancelada.',
]

const REGRAS_PROIBIDO = [
  'Comprar usando o seu próprio código. Essa compra não conta como venda.',
  'Fazer anúncio pago usando a marca "Trilha Viva".',
  'Divulgar por spam, mandando mensagem a quem não pediu.',
]

const PERGUNTAS = [
  {
    q: 'Preciso ter comprado a Trilha Viva para ser afiliado?',
    a: 'Não. Você só precisa de uma conta no site e de um CPF. Quem já comprou usa a mesma conta de sempre; quem não comprou cria uma na hora do cadastro.',
  },
  {
    q: 'Quem compra pelo meu link ganha desconto?',
    a: `Não. Quem compra paga o preço normal, ${preco}. O seu código só registra que a venda veio de você.`,
  },
  {
    q: 'Existe um mínimo de vendas para começar a ganhar?',
    a: `Não. A primeira venda já paga ${moedaCurta(NIVEIS_PUBLICOS[0].valor_por_venda_centavos)}. As metas só aumentam o valor de cada venda.`,
  },
  {
    q: 'Como funciona a meta do mês?',
    a: `Quanto mais vendas no mês, mais cada venda vale. Ao bater a meta, todas as vendas daquele mês passam a valer o valor do nível novo, inclusive as anteriores. No dia 1º a contagem recomeça.`,
  },
  {
    q: 'Quando o dinheiro fica disponível?',
    a: `Cada venda libera ${carenciaDias} dias depois de acontecer. O bônus de nível, a diferença que a meta acrescenta, cai no dia ${diaFechamento} do mês seguinte, quando o mês é fechado.`,
  },
  {
    q: 'Como eu recebo?',
    a: `Por Pix, para uma chave no seu CPF. Você cadastra a chave no painel e pede o saque do saldo disponível. Dá para pedir um saque a cada ${intervaloSaqueDias} dias, e o pagamento é feito pela Trilha Viva na sua chave.`,
  },
  {
    q: 'O que acontece se a compra for devolvida?',
    a: 'A venda deixa de contar para a sua meta e a comissão dela é cancelada. Se o mês já tinha sido fechado, a devolução aparece no seu extrato como um ajuste e é descontada dos próximos ganhos.',
  },
  {
    q: 'Posso divulgar com anúncio pago?',
    a: 'Pode divulgar nas suas redes, grupos, canais e para quem você conhece. Só não pode fazer anúncio pago usando a marca "Trilha Viva" (no texto, no nome ou como palavra-chave). Spam também não é permitido.',
  },
]

const ld = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: PERGUNTAS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

// Decoração do topo (só no computador): os três selos em degraus, do mesmo
// tamanho da escada de metas. Os valores vêm da mesma constante.
function Podio() {
  const alturas = ['h-24', 'h-36', 'h-48']
  return (
    <div className="hidden items-end gap-3 lg:flex" aria-hidden="true">
      {NIVEIS_PUBLICOS.map((n, i) => (
        <div key={n.nome} className="flex w-36 flex-col items-center">
          <Medalha cor={n.cor} grau={i + 1} tamanho={88} className="mb-4" />
          <div className={`flex w-full flex-col justify-end border-t-2 border-signal bg-white/[0.06] px-4 pb-4 ${alturas[i]}`}>
            <p className="figs text-[26px] font-extrabold leading-none tracking-[-0.02em] text-white">{moedaCurta(n.valor_por_venda_centavos)}</p>
            <p className="mt-1.5 text-[14px] text-white/65">{n.nome}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Regras({ titulo, itens, proibido = false }) {
  return (
    <div>
      <h3 className="text-[19px] font-bold text-ink">{titulo}</h3>
      <ul className="mt-5 space-y-4">
        {itens.map((t) => (
          <li key={t} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-[16.5px] leading-[1.6] text-ink">
            {proibido ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="mt-[7px] text-signal">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <span aria-hidden="true" className="mt-[9px] h-[8px] w-[8px] bg-signal" />
            )}
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AfiliadosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />

      <section className="bg-ink text-white">
        <div className="shell pb-16 pt-12 sm:pb-24">
          <div className="[&_a]:text-white/60 [&_span]:text-white/80">
            <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Seja afiliado' }]} />
          </div>
          <div className="mt-10 grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
            <div>
              <h1 className="text-d1 max-w-4xl text-white [text-wrap:balance]">
                Indique a Trilha Viva e ganhe até {moedaCurta(maximo)} por venda
              </h1>
              <p className="mt-6 max-w-2xl text-[18px] leading-[1.65] text-white/70 sm:text-[20px]">
                Você divulga seu link. Quem compra paga o preço normal e a venda fica registrada no seu nome. O pagamento é por Pix.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/minha-conta/afiliado" className="btn-signal min-h-12">
                  Quero ser afiliado
                </Link>
                <Link href="#regras" className="btn-onink min-h-12">
                  Ver as regras
                </Link>
              </div>
            </div>
            <Podio />
          </div>
        </div>
      </section>

      <section className="shell pt-16 sm:pt-24">
        <SectionHead
          title="Quanto mais vendas no mês, mais cada venda vale"
          sub="A meta é mensal. Veja o valor de cada degrau e simule o seu mês."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-8">
          <div className="card-line px-5 py-7 sm:px-8 sm:py-9">
            <EscadaNiveis niveis={NIVEIS_PUBLICOS} comSelo />
          </div>
          <Simulador niveis={NIVEIS_PUBLICOS} tabela={tabela} saltos={degraus} />
        </div>
      </section>

      <section className="shell pt-16 sm:pt-24" aria-labelledby="passos-titulo">
        <h2 id="passos-titulo" className="text-d2 max-w-4xl text-ink">Como funciona</h2>
        <ol className="mt-10 grid gap-0 lg:grid-flow-col lg:auto-cols-fr lg:gap-10">
          {PASSOS.map(([nome, texto], i) => (
            <li
              key={nome}
              className="relative grid grid-cols-[2.75rem_1fr] gap-x-5 pb-9 last:pb-0 lg:grid-cols-1 lg:content-start lg:gap-y-5 lg:pb-0"
            >
              {i < PASSOS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[21px] top-11 w-[2px] bg-line lg:bottom-auto lg:left-11 lg:right-[-2.5rem] lg:top-[21px] lg:h-[2px] lg:w-auto"
                />
              )}
              <span className="figs relative z-10 grid h-11 w-11 place-items-center bg-ink text-[18px] font-extrabold text-white">{i + 1}</span>
              <div>
                <h3 className="text-[21px] font-bold leading-snug tracking-[-0.015em] text-ink">{nome}</h3>
                <p className="mt-2 max-w-md font-read text-[17px] leading-[1.7] text-ink-muted">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="regras" className="shell scroll-mt-24 pt-16 sm:pt-24" aria-labelledby="regras-titulo">
        <h2 id="regras-titulo" className="text-d2 max-w-4xl text-ink">Regras do programa</h2>
        <div className="card-line mt-10 grid gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-2 lg:gap-14">
          <Regras titulo="Como o dinheiro funciona" itens={REGRAS_DINHEIRO} />
          <Regras titulo="O que não pode" itens={REGRAS_PROIBIDO} proibido />
        </div>
      </section>

      <section className="shell max-w-4xl pt-16 sm:pt-24" aria-labelledby="faq-titulo">
        <h2 id="faq-titulo" className="text-d2 text-ink">Perguntas frequentes</h2>
        <Faq items={PERGUNTAS} className="mt-8" />
        <div className="mt-10">
          <h3 className="text-[17px] font-bold text-ink">Quer conhecer o que você vai indicar?</h3>
          <ul className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-8">
            {[['/assinar', 'Ver o pacote completo'], ['/musicas', 'Ver as músicas do acervo'], ['/faq', 'Dúvidas de quem compra']].map(([href, rotulo]) => (
              <li key={href}>
                <Link href={href} className="link-signal min-h-11">{rotulo}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell pt-16 sm:pt-24">
        <div className="card-cut flex flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-d3 text-ink">Comece pela sua primeira venda</h2>
            <p className="mt-3 max-w-xl text-[16.5px] leading-[1.65] text-ink-muted">
              A primeira venda já paga {moedaCurta(NIVEIS_PUBLICOS[0].valor_por_venda_centavos)}. Cadastre-se e pegue o seu link.
            </p>
          </div>
          <Link href="/minha-conta/afiliado" className="btn-signal min-h-12 shrink-0">
            Quero ser afiliado
          </Link>
        </div>
      </section>
    </>
  )
}
