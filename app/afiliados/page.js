import Link from 'next/link'
import { Botao, Icone, ListaSanfona, Migalhas } from '@/components/ds'
import Simulador from '@/components/afiliados/Simulador'
import EscadaMetas from '@/components/afiliados/landing/EscadaMetas'
import MedalhaPB from '@/components/afiliados/landing/MedalhaPB'
import BarraAfiliado from '@/components/afiliados/landing/BarraAfiliado'
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

// Largura e respiro das seções (DESIGN.md: contêiner de 1280 px).
const SECAO = 'mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-[clamp(20px,4cqi,32px)] pt-[clamp(64px,8cqi,104px)]'
const H2 = 'font-semi-condensed text-[clamp(32px,4.4cqi,52px)] font-[750] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]'
const LINK_RED =
  'inline-flex min-h-11 items-center text-[16px] font-semibold underline decoration-red decoration-2 underline-offset-4'

// O rótulo de "Já sou afiliado" é longo: no celular quebra em duas linhas em vez de vazar.
const QUEBRA = 'max-w-full whitespace-normal py-2 text-center leading-[1.25]'

function Regras({ titulo, itens, proibido = false }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <h3 className="text-[19px] font-bold">{titulo}</h3>
      <ul className="flex flex-col gap-3.5">
        {itens.map((t) => (
          <li key={t} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 text-[16px] leading-[1.6]">
            {proibido ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="mt-[7px] text-red">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <span aria-hidden="true" className="mt-[9px] h-2 w-2 bg-red" />
            )}
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Os dois caminhos da página. Quem já tem cadastro entra pela segunda opção, que
// leva ao painel (logado) ou ao "Entrar" com volta garantida (deslogado).
export default function AfiliadosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      {/* Fora do elemento com container-type: ele vira o bloco de contenção do `fixed`. */}
      <BarraAfiliado maximo={moedaCurta(maximo)} />

      <div data-rodape-colado className="bg-white [container-type:inline-size]">
        <div data-tema="escuro" className="bg-ink text-white">
          <section aria-labelledby="h-af" className="mx-auto w-full max-w-[1280px] px-[clamp(20px,4cqi,32px)] pb-[clamp(56px,7cqi,104px)] pt-[clamp(24px,3cqi,40px)]">
            <Migalhas tema="escuro" itens={[{ href: '/', label: 'Início' }, { label: 'Seja afiliado' }]} />
            <div className="mt-[clamp(16px,3cqi,32px)] flex flex-wrap items-center gap-x-20 gap-y-12">
              <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px]">
                <h1 id="h-af" className="font-semi-condensed max-w-[760px] text-[clamp(40px,6cqi,76px)] font-extrabold leading-[0.98] tracking-[-0.025em] [text-wrap:balance]">
                  Indique a Trilha Viva e ganhe até {moedaCurta(maximo)} por venda
                </h1>
                <p className="max-w-[620px] text-[clamp(18px,1.6cqi,20px)] leading-[1.6] text-dark-text-2 [text-wrap:pretty]">
                  Você divulga seu link. Quem compra paga o preço normal e a venda fica registrada no seu nome. O pagamento é por Pix.
                </p>
                <div id="topo-acesso" className="mt-1.5 flex flex-wrap gap-3">
                  <Botao variante="compra" href={ROTA_AFILIADO}>Quero ser afiliado</Botao>
                  <Botao variante="noEscuro" href={ROTA_AFILIADO} tamanho="lg" className={QUEBRA}>
                    <Icone nome="usuario" tamanho={18} />
                    {ROTULO_JA_SOU}
                  </Botao>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-[15px] text-dark-text-3">
                  Quer saber antes como funciona?
                  <Link href="#regras" className="inline-flex min-h-11 items-center font-semibold text-white underline decoration-red decoration-2 underline-offset-4">
                    Ver as regras
                  </Link>
                </p>
              </div>
              <div className="mx-auto flex flex-[0_1_320px] flex-col items-center gap-5 text-center">
                <div aria-hidden="true" className="relative flex h-[240px] w-[240px] items-center justify-center">
                  <span className="absolute -inset-10 rounded-full border border-dark-pressed" />
                  <span className="absolute inset-0 rounded-full border border-dark-frame" />
                  <MedalhaPB grau={3} tamanho={176} variante="sobrePreto" anel />
                </div>
                <p className="text-[16px] leading-[1.5] text-dark-text-2">
                  Ouro: <strong className="font-bold tabular-nums text-white">{moedaCurta(ouro.valor_por_venda_centavos)}</strong> por venda, a partir de {ouro.vendas_minimas} vendas no mês.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="h-metas" className={SECAO}>
          <div className="flex max-w-[760px] flex-col gap-3">
            <h2 id="h-metas" className={H2}>Quanto mais vendas no mês, mais cada venda vale</h2>
            <p className="text-[17px] leading-[1.6] text-text-2">A meta é mensal. Veja o valor de cada degrau e simule o seu mês.</p>
          </div>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
            <div className="min-w-0 flex-[5_1_380px]">
              <EscadaMetas niveis={NIVEIS_PUBLICOS} larguras={larguras} />
            </div>
            <Simulador niveis={NIVEIS_PUBLICOS} tabela={tabela} saltos={degraus} />
          </div>
        </section>

        <section aria-labelledby="h-passos" className={SECAO}>
          <h2 id="h-passos" className={H2}>Como funciona</h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-10 gap-y-7">
            {PASSOS.map(([nome, texto], i) => (
              <li key={nome} className="flex flex-col gap-3 border-t border-ink pt-4">
                <span className="flex h-11 w-11 items-center justify-center bg-ink text-[18px] font-extrabold tabular-nums text-white">{i + 1}</span>
                <h3 className="text-[21px] font-bold leading-[1.25]">{nome}</h3>
                <p className="max-w-[420px] text-[16px] leading-[1.65] text-text-2 [text-wrap:pretty]">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="regras" aria-labelledby="h-regras" className={`${SECAO} scroll-mt-24`}>
          <h2 id="h-regras" className={H2}>Regras do programa</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-x-14 gap-y-10 border border-ink p-[clamp(20px,3cqi,40px)]">
            <Regras titulo="Como o dinheiro funciona" itens={REGRAS_DINHEIRO} />
            <Regras titulo="O que não pode" itens={REGRAS_PROIBIDO} proibido />
          </div>
        </section>

        <section aria-labelledby="faq-titulo" className="mx-auto flex w-full max-w-[1280px] flex-wrap gap-x-20 gap-y-8 px-[clamp(20px,4cqi,32px)] pt-[clamp(64px,8cqi,104px)]">
          <div className="flex flex-[1_1_300px] flex-col gap-5">
            <h2 id="faq-titulo" className={H2}>Perguntas frequentes</h2>
            <div className="flex flex-col">
              <h3 className="mb-1 text-[16px] font-bold">Quer conhecer o que você vai indicar?</h3>
              {[['/assinar', 'Ver o pacote completo'], ['/musicas', 'Ver as músicas do acervo'], ['/faq', 'Dúvidas de quem compra']].map(([href, rotulo]) => (
                <Link key={href} href={href} className={`${LINK_RED} self-start`}>{rotulo}</Link>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-[2_1_480px]">
            <ListaSanfona itens={PERGUNTAS.map((p) => ({ titulo: p.q, conteudo: p.a }))} />
          </div>
        </section>

        <section id="chamada-final" aria-labelledby="h-final-af" className="mx-auto w-full max-w-[1280px] px-[clamp(20px,4cqi,32px)] py-[clamp(64px,8cqi,104px)]">
          <div data-tema="escuro" className="flex flex-wrap items-center justify-between gap-x-12 gap-y-7 bg-ink p-[clamp(24px,4cqi,48px)] text-white">
            <div className="grid flex-[1_1_420px] grid-cols-[72px_minmax(0,1fr)] items-center gap-5">
              <MedalhaPB grau={1} variante="vazada" />
              <div className="flex flex-col gap-2">
                <h2 id="h-final-af" className="font-semi-condensed text-[clamp(26px,3cqi,36px)] font-[750] leading-[1.05]">Comece pela sua primeira venda</h2>
                <p className="text-[16px] leading-[1.6] text-dark-text-2">
                  A primeira venda já te coloca no Bronze, a {moedaCurta(bronze.valor_por_venda_centavos)} por venda. Cadastre-se e pegue o seu link.
                </p>
              </div>
            </div>
            <div className="flex flex-[0_1_360px] flex-col gap-3">
              <Botao variante="compra" href={ROTA_AFILIADO} bloco>Quero ser afiliado</Botao>
              <Botao variante="noEscuro" href={ROTA_AFILIADO} tamanho="lg" bloco className={`${QUEBRA} px-4 text-[15px]`}>
                {ROTULO_JA_SOU}
              </Botao>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
