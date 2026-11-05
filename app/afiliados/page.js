import Link from 'next/link'
import { Breadcrumbs, Faq, SectionHead } from '@/components/ui'
import Simulador from '@/components/afiliados/Simulador'
import EscadaMetas from '@/components/afiliados/landing/EscadaMetas'
import Moeda3D from '@/components/afiliados/landing/Moeda3D'
import BarraAfiliado from '@/components/afiliados/landing/BarraAfiliado'
import RevelarAoRolar from '@/components/afiliados/landing/RevelarAoRolar'
import { ROTA_AFILIADO } from '@/components/afiliados/landing/rotas'
import { NIVEIS_PUBLICOS, REGRAS_PUBLICAS, moeda, moedaCurta, saltos, tabelaDoSimulador } from '@/lib/afiliados-simulador'
import { OG_IMAGEM, priceBRL, site } from '@/lib/site'
import { ldJson } from '@/lib/safe'
import './landing.css'

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

const { diaFechamento } = REGRAS_PUBLICAS
const maximo = Math.max(...NIVEIS_PUBLICOS.map((n) => n.valor_por_venda_centavos))
// Largura da faixa de cada nível na escada (% do maior valor), calculada aqui,
// no servidor, para o componente do navegador não fazer conta.
const larguras = NIVEIS_PUBLICOS.map((n) => Math.max(12, Math.round((n.valor_por_venda_centavos / maximo) * 100)))
const tabela = tabelaDoSimulador()
const degraus = saltos()
const preco = priceBRL(site.price)
const [bronze, prata, ouro] = NIVEIS_PUBLICOS
const ROTULO_JA_SOU = 'Já sou afiliado: entrar na minha área'

// Frase das metas, montada dos mesmos níveis do simulador.
const nb = (t) => t.replace(/ /g, ' ') // "R$ 30" não quebra no meio
const FRASE_METAS = `Bronze (${bronze.vendas_minimas} venda ou mais) paga ${nb(moedaCurta(bronze.valor_por_venda_centavos))} por venda, Prata (${prata.vendas_minimas} ou mais) paga ${nb(moedaCurta(prata.valor_por_venda_centavos))} e Ouro (${ouro.vendas_minimas} ou mais) paga ${nb(moedaCurta(ouro.valor_por_venda_centavos))}.`
// Exemplo do simulador (mesma tabela do build): 20 vendas = Prata.
const [, totalDe20] = tabela[prata.vendas_minimas]

const PASSOS = [
  ['Cadastre-se', 'Entre na sua conta do site (ou crie uma na hora), informe seus dados e escolha o seu código de afiliado.'],
  ['Divulgue seu link e seu código', `Quem compra pelo seu link paga o preço normal, ${preco}. A venda fica registrada no seu nome.`],
  ['Receba por Pix', `O mês fecha no dia ${diaFechamento} do mês seguinte, já descontando os reembolsos. A partir daí você pede o pagamento do mês por Pix, na chave do seu CPF.`],
]

const REGRAS_DINHEIRO = [
  `O valor do mês vem da meta que você bateu: bateu a meta, todas as vendas do mês valem o valor do nível. ${FRASE_METAS}`,
  `O mês fecha no dia ${diaFechamento} do mês seguinte, já descontando os reembolsos.`,
  `A partir do dia ${diaFechamento} você pede o pagamento do mês anterior por Pix, uma vez por mês. Quem não pediu no dia ${diaFechamento} pode pedir depois, até o dia ${diaFechamento - 1} do mês seguinte.`,
  'O Pix vai só para uma chave no CPF do próprio afiliado.',
  'Se a compra for reembolsada, a venda sai da sua meta e deixa de contar.',
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
    a: `Não. A primeira venda do mês já te coloca no Bronze, a ${moedaCurta(bronze.valor_por_venda_centavos)} por venda. As metas só aumentam o valor de cada venda do mês.`,
  },
  {
    q: 'Como funciona a meta do mês?',
    a: `Cada mês tem a sua contagem. ${FRASE_METAS} Bateu a meta, todas as vendas daquele mês passam a valer o valor do nível, inclusive as anteriores. No dia 1º a contagem recomeça.`,
  },
  {
    q: 'Quanto eu recebo no mês?',
    a: `O valor do mês é o número de vendas vezes o valor do nível que você atingiu. Por exemplo, ${prata.vendas_minimas} vendas = ${prata.nome} = ${moeda(totalDe20)} no mês. O simulador desta página mostra qualquer quantidade, de 0 a 100 vendas.`,
  },
  {
    q: 'Quando posso pedir o pagamento?',
    a: `O mês fecha no dia ${diaFechamento} do mês seguinte, já descontando os reembolsos. A partir do dia ${diaFechamento} você pede o pagamento do mês anterior por Pix, uma vez por mês. Se não pedir no dia ${diaFechamento}, pode pedir depois, até o dia ${diaFechamento - 1} do mês seguinte.`,
  },
  {
    q: 'Como eu recebo?',
    a: 'Por Pix, para uma chave no CPF do próprio afiliado. Você cadastra a chave no painel e pede o pagamento do mês anterior. Quem paga é a Trilha Viva, direto na sua chave.',
  },
  {
    q: 'O que acontece se a compra for devolvida?',
    a: `A venda sai da sua meta e deixa de contar. Como o mês só fecha no dia ${diaFechamento}, já descontando os reembolsos, o valor que você pede a partir do dia ${diaFechamento} já vem com os reembolsos descontados.`,
  },
  {
    q: 'Posso divulgar com anúncio pago?',
    a: 'Pode divulgar nas suas redes, grupos, canais e para quem você conhece. Só não pode fazer anúncio pago usando a marca "Trilha Viva" (no texto, no nome ou como palavra-chave). Spam também não é permitido.',
  },
  {
    q: 'Já sou afiliado. Onde vejo minhas vendas?',
    a: 'Na sua área de afiliado. Use o botão "Já sou afiliado", no topo desta página, e entre com a sua conta: o painel mostra seu link, suas vendas e o valor do mês.',
  },
]

const ld = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: PERGUNTAS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}


function Regras({ titulo, itens, proibido = false }) {
  return (
    <div>
      <h3 className="text-[19px] font-bold text-ink">{titulo}</h3>
      <ul className="mt-5 space-y-4">
        {itens.map((t, i) => (
          <li key={t} data-rv="sobe" style={{ '--i': i }} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-[16.5px] leading-[1.6] text-ink">
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

function IconePessoa() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mr-2.5 shrink-0">
      <circle cx="9" cy="6" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2.8 16c.6-3.3 3-5 6.2-5s5.6 1.7 6.2 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

// Os dois caminhos da página. Quem já tem cadastro entra pela segunda opção, que
// leva ao painel (logado) ou ao "Entrar" com volta garantida (deslogado).
export default function AfiliadosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <RevelarAoRolar />
      <BarraAfiliado />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="shell relative pb-16 pt-10 sm:pb-24 sm:pt-12">
          <div className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:items-center [&_a]:text-white/60 [&_span]:text-white/80">
            <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Seja afiliado' }]} />
          </div>
          <div className="mt-8 grid items-center gap-12 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
            <div>
              <h1 className="text-d1 max-w-4xl text-white [text-wrap:balance]">
                Indique a Trilha Viva e ganhe até {moedaCurta(maximo)} por venda
              </h1>
              <p className="mt-6 max-w-2xl text-[18px] leading-[1.65] text-white/70 sm:text-[20px]">
                Você divulga seu link. Quem compra paga o preço normal e a venda fica registrada no seu nome. O pagamento é por Pix.
              </p>
              <div id="topo-acesso" className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={ROTA_AFILIADO} className="btn-signal min-h-12">
                  Quero ser afiliado
                </Link>
                <Link href={ROTA_AFILIADO} className="btn-onink min-h-12">
                  <IconePessoa />
                  {ROTULO_JA_SOU}
                </Link>
              </div>
              <p className="mt-5 hidden text-[15px] leading-snug text-white/65 sm:block">
                Quer saber antes como funciona?{' '}
                <Link href="#regras" className="inline-flex min-h-11 items-center font-semibold text-white underline decoration-signal-lite decoration-2 underline-offset-4">
                  Ver as regras
                </Link>
              </p>
            </div>

            <div className="relative mx-auto flex w-full max-w-[300px] flex-col items-center lg:mx-0">
              <div aria-hidden="true" className="aneis-topo pointer-events-none absolute left-1/2 top-[100px] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 lg:top-[132px] lg:h-[620px] lg:w-[620px]" />
              <Moeda3D cor={ouro.cor} grau={3} tamanho={200} className="moeda-lg relative z-10" />
              <p className="relative z-10 mt-8 text-center text-[15.5px] leading-[1.5] text-white/80">
                Ouro: <span className="figs font-bold text-white">{moedaCurta(ouro.valor_por_venda_centavos)}</span> por venda, a partir de {ouro.vendas_minimas} vendas no mês.
              </p>
              <p className="relative z-10 mt-1 text-center text-[13.5px] text-white/65 lg:hidden">Toque na moeda para girar.</p>
            </div>
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
            <EscadaMetas niveis={NIVEIS_PUBLICOS} larguras={larguras} />
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
              data-rv="sobe"
              style={{ '--i': i }}
              className="relative grid grid-cols-[2.75rem_1fr] gap-x-5 pb-9 last:pb-0 lg:grid-cols-1 lg:content-start lg:gap-y-5 lg:pb-0"
            >
              {i < PASSOS.length - 1 && (
                <span
                  aria-hidden="true"
                  data-rv="linha"
                  style={{ '--i': i + 1 }}
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

      <section id="chamada-final" className="shell pt-16 sm:pt-24">
        <div className="panel grid gap-7 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-5 sm:gap-x-7">
            <Moeda3D cor={bronze.cor} grau={1} tamanho={96} />
            <div>
              <h2 className="text-d3 text-white">Comece pela sua primeira venda</h2>
              <p className="mt-3 max-w-xl text-[16.5px] leading-[1.65] text-white/75">
                A primeira venda já te coloca no Bronze, a {moedaCurta(bronze.valor_por_venda_centavos)} por venda. Cadastre-se e pegue o seu link.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href={ROTA_AFILIADO} className="btn-signal min-h-12 shrink-0">
              Quero ser afiliado
            </Link>
            <Link href={ROTA_AFILIADO} className="btn-onink min-h-12 shrink-0">
              <IconePessoa />
              {ROTULO_JA_SOU}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
