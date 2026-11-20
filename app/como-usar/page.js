import Pagina from '@/components/catalogo/Pagina'
import CabecaPagina from '@/components/catalogo/CabecaPagina'
import SemPacote from '@/components/catalogo/SemPacote'
import { H2 } from '@/components/catalogo/Titulos'
import MudarTomBpm from '@/components/MudarTomBpm'
import { BotaoCompra, ListaSanfona, MolduraAccent, Quadrado } from '@/components/ds'
import { tools, steps, usos } from '@/lib/tools'
import { faq } from '@/lib/faq'
import { OG_IMAGEM, site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Como usar multitrack na igreja: guia completo (Reaper, Ableton e tablet)',
  description:
    'Guia prático de como tocar com multitrack gospel na igreja: qual programa usar, como separar clique e guia do mix da banda, que interface de áudio comprar e como rodar tudo no tablet.',
  alternates: { canonical: '/como-usar' },
  openGraph: { images: OG_IMAGEM,
    title: 'Como usar multitrack na igreja — guia completo',
    description:
      'Reaper, Ableton Live, Prime no iPad, roteamento de clique e guia, interface de áudio e passo a passo até o domingo.',
    url: `${site.url}/como-usar`,
    type: 'article',
  },
}

const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como usar multitrack gospel na igreja',
  description:
    'Passo a passo para tocar com multitracks (VS) no culto: baixar, abrir no programa, separar clique e guia, ajustar canais e ensaiar.',
  inLanguage: 'pt-BR',
  totalTime: 'PT40M',
  tool: [
    { '@type': 'HowToTool', name: 'Notebook ou tablet' },
    { '@type': 'HowToTool', name: 'Interface de áudio com 2 ou mais saídas' },
    { '@type': 'HowToTool', name: 'Fone de ouvido para o clique' },
    { '@type': 'HowToTool', name: 'Cabos P10 ou XLR balanceados' },
  ],
  step: steps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.body,
  })),
}

const equipamentos = [
  {
    t: 'Notebook ou tablet',
    d: 'Não precisa ser potente. Um i3 ou um iPad de entrada já roda 10 canais sem estalar, desde que você feche o resto dos programas.',
  },
  {
    t: 'Interface de áudio',
    d: 'O item mais importante. Com 2 saídas já dá para separar clique do mix; com 4 ou mais, você manda canais independentes para a mesa.',
  },
  {
    t: 'Fone de ouvido fechado',
    d: 'Para o baterista e para quem conduz. Fechado porque não pode vazar clique no microfone da igreja.',
  },
  {
    t: 'Cabos P10 ou XLR',
    d: 'Balanceados, do tamanho certo. Cabo ruim é a causa número um de chiado na trilha.',
  },
  {
    t: 'Um canal reservado na mesa',
    d: 'Combine com o operador de som quais canais da mesa são da trilha, para ele não precisar caçar no meio do culto.',
  },
  {
    t: 'Um plano B',
    d: 'Deixe as trilhas também num pendrive ou no celular. Notebook trava; o culto não pode parar.',
  },
]

const checklist = [
  'Projeto salvo e testado com a banda inteira',
  'Clique só no fone — confirme pedindo silêncio no PA',
  'Volume da trilha ajustado com a igreja vazia e depois cheia',
  'Notebook no modo alto desempenho, Wi-Fi e notificações desligados',
  'Bateria do tablet acima de 80% ou na tomada',
  'Cópia das músicas do dia num pendrive',
]

// As cinco seções do índice. Os ids são âncoras usadas no rodapé, na ficha e nos
// e-mails (#reaper, #tablet, #mudar-tom-e-bpm): não mudar. Os textos são os que já
// estavam na página e na home, organizados em itens curtos.
const SECOES = [
  {
    id: 'roteamento',
    indice: 'O clique no fone',
    t: 'O clique fica no fone. O resto vai para a igreja.',
    d: 'É a única regra que importa, e ela se resolve uma vez só no seu programa.',
    itens: [
      ['Saída 1, fones.', 'Clique e guia vão só para o baterista e para quem conduz o louvor. Nunca para o público.'],
      ['Saída 2, PA.', 'O mix dos instrumentos da trilha vai para a mesa de som. É o que a igreja ouve.'],
      ['Mute o que a banda toca.', 'O multitrack completa a equipe, não substitui ninguém.'],
      [
        'Saídas 3 e 4, se a sua interface tiver.',
        'Mande grupos separados (teclado num canal, pads noutro) e deixe o operador de som mixar na mesa.',
      ],
    ],
  },
  {
    id: 'passos',
    indice: 'Do download ao domingo',
    t: 'Do download ao domingo',
    d: 'Cinco passos. Nenhum deles exige que você seja técnico de áudio.',
    itens: steps.map((s) => [`${s.title}.`, s.body]),
  },
  {
    id: 'reaper',
    indice: 'Multitrack no REAPER',
    t: 'Multitrack no REAPER',
    d: 'O melhor custo-benefício para igreja. Avaliação completa de 60 dias.',
    itens: [
      ['Crie um projeto novo', 'e arraste todos os arquivos da pasta da música.'],
      ['Crie duas saídas', 'na interface: 1/2 para o fone, 3/4 para a mesa.'],
      ['Mande clique e guia', 'para a saída 1/2 e os outros canais para a 3/4. Salve como modelo de projeto e reutilize em toda música.'],
    ],
  },
  {
    id: 'tablet',
    indice: 'Multitrack no tablet',
    t: 'Multitrack no tablet',
    d: 'No iPad, o app Prime aceita os seus próprios arquivos e separa o clique dos instrumentos entre os lados esquerdo e direito. Muita igreja abandonou o notebook: o tablet liga mais rápido e ocupa menos espaço no praticável.',
    itens: [
      ['Envie os arquivos', 'pela nuvem do app.'],
      ['Monte o setlist', 'tocando na tela, com a ordem do domingo.'],
      ['Use um cabo em Y', 'para mandar o lado do clique ao fone e o outro à mesa. Com uma interface compacta você ganha saídas de verdade.'],
    ],
  },
]
const INDICE = [...SECOES.map((s) => [s.id, s.indice]), ['mudar-tom-e-bpm', 'Mudar tom e BPM']]
const numero = (i) => String(i + 1).padStart(2, '0')

// O resto do guia, fechado: a página fica com os cinco temas e nada que já
// existia sai do ar.
const NATURAL = 'text-[16px] leading-[1.6] text-text-2'
const detalhes = [
  {
    titulo: 'Playback fechado ou multitrack?',
    conteudo: (
      <div className="flex flex-col gap-3">
        <p className={NATURAL}>
          O <strong className="font-[650] text-ink">playback tradicional</strong> é um arquivo só, com tudo misturado. Se
          a sua banda tem baterista, azar: a bateria do playback continua tocando por cima.
        </p>
        <p className={NATURAL}>
          O <strong className="font-[650] text-ink">multitrack (ou VS)</strong> entrega a mesma música aberta em canais
          separados. Você muta a bateria, muta a guitarra, deixa só os pads e os sopros, e a sua equipe toca o resto ao
          vivo. É por isso que praticamente toda igreja grande no Brasil trabalha assim hoje.
        </p>
        <p className={NATURAL}>
          Junto com os instrumentos vêm dois canais que nunca vão para a caixa de som:{' '}
          <strong className="font-[650] text-ink">o clique</strong> (o metrônomo que mantém a banda no tempo) e{' '}
          <strong className="font-[650] text-ink">a guia</strong> (uma voz avisando &ldquo;refrão&rdquo;,
          &ldquo;ponte&rdquo;, &ldquo;último&rdquo;). Esses dois vão só para o fone da equipe.
        </p>
      </div>
    ),
  },
  {
    titulo: 'Checklist antes do culto',
    conteudo: (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {checklist.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[16px] leading-[1.5]">
            <Quadrado className="mt-[7px]" />
            {t}
          </li>
        ))}
      </ul>
    ),
  },
  {
    titulo: 'Qual programa usar para rodar multitrack',
    conteudo: (
      <div className="flex flex-col">
        <p className={`${NATURAL} pb-4`}>
          Todos abaixo dão conta do recado. A diferença está no bolso, no sistema operacional e em quanto você quer
          aprender. Se você está começando hoje, instale o <strong className="font-[650] text-ink">REAPER</strong> e use
          os 60 dias de avaliação completa. Se a igreja usa só iPad,{' '}
          <strong className="font-[650] text-ink">Prime</strong> é o caminho mais curto.
        </p>
        {tools.map((t) => (
          <article key={t.slug} id={t.slug === 'reaper' ? undefined : t.slug} className="scroll-mt-24 border-t border-line py-5">
            <h3 className="font-semi-condensed text-[20px] font-bold leading-tight">{t.name}</h3>
            <p className="mt-1 text-[14px] text-text-3">
              {t.badge} · {t.platform}
            </p>
            <p className={`${NATURAL} mt-2.5`}>{t.summary}</p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
              {t.why.map((w) => (
                <li key={w} className="flex items-start gap-3 text-[15px] leading-[1.55] text-text-2">
                  <Quadrado className="mt-[7px]" />
                  {w}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[14px] text-text-3">
              {t.price} ·{' '}
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-ink underline underline-offset-4"
              >
                Site oficial
              </a>
            </p>
          </article>
        ))}
      </div>
    ),
  },
  {
    titulo: 'O que você realmente precisa comprar',
    conteudo: (
      <ul className="m-0 flex list-none flex-col p-0">
        {equipamentos.map((e) => (
          <li key={e.t} className="border-t border-line py-3.5 first:border-t-0 first:pt-0">
            <strong className="font-[650]">{e.t}.</strong> <span className={NATURAL}>{e.d}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    titulo: 'Não é só no domingo de manhã',
    conteudo: (
      <ul className="m-0 flex list-none flex-col p-0">
        {usos.map((u) => (
          <li key={u.title} className="border-t border-line py-3.5 first:border-t-0 first:pt-0">
            <strong className="font-[650]">{u.title}.</strong> <span className={NATURAL}>{u.body}</span>
          </li>
        ))}
      </ul>
    ),
  },
  ...faq.slice(3, 9).map((f) => ({ titulo: f.q, conteudo: <p className={NATURAL}>{f.a}</p> })),
]

export default function ComoUsarPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
      <Pagina largura={1080} espaco="clamp(28px,4cqi,44px)">
        <CabecaPagina
          migalhas={[{ href: '/', label: 'Início' }, { label: 'Como usar' }]}
          titulo="Como usar multitrack na igreja"
          intro="Do download ao domingo. Nenhum passo exige que você seja técnico de áudio: o guia mostra o caminho inteiro, do programa que roda a VS à ligação na mesa de som."
          grande
        />

        <nav aria-label="Nesta página" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-y border-b-line border-t-ink">
          {INDICE.map(([id, rotulo], i) => (
            <a key={id} href={`#${id}`} className="flex min-h-[52px] items-center gap-2.5 text-[15px] font-semibold underline-offset-4 hover:underline">
              <span className="figs text-[13px] font-normal text-text-3">{numero(i)}</span>
              {rotulo}
            </a>
          ))}
        </nav>

        {SECOES.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="grid scroll-mt-24 grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-14 gap-y-4 border-t border-line pt-6"
          >
            <div className="flex flex-col gap-2">
              <span className="figs text-[14px] font-bold text-text-3">{numero(i)}</span>
              <H2>{s.t}</H2>
              <p className="text-[16px] leading-[1.6] text-text-2">{s.d}</p>
            </div>
            <ol className="m-0 flex list-none flex-col border-b border-line p-0">
              {s.itens.map(([t, d], k) => (
                <li key={t} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-t border-line py-3.5 text-[16px] leading-[1.55]">
                  <span className="figs font-bold text-text-3">{k + 1}</span>
                  <span>
                    <strong className="font-[650]">{t}</strong> {d}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <MudarTomBpm numero={numero(SECOES.length)} />

        <section aria-labelledby="mais-detalhes" className="flex flex-col gap-3.5 border-t border-line pt-6">
          <H2 id="mais-detalhes" pequeno>
            Mais detalhes do guia
          </H2>
          <ListaSanfona itens={detalhes} />
        </section>

        <SemPacote>
          <MolduraAccent as="aside" traco={48} className="flex flex-wrap items-center gap-x-6 gap-y-3.5 p-[22px]">
            <div className="flex flex-[1_1_260px] flex-col gap-1">
              <strong className="font-semi-condensed text-[20px] font-[750]">Agora só falta o acervo.</strong>
              <span className="text-[15px] text-text-2">
                Mais de 2.000 multitracks gospel com clique, guia e canais separados, em um pacote único por{' '}
                {priceBRL(site.price)}.
              </span>
            </div>
            <BotaoCompra className="flex-[0_1_240px]" />
          </MolduraAccent>
        </SemPacote>
      </Pagina>
    </>
  )
}
