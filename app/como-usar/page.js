import Link from 'next/link'
import { SessionPanel } from '@/components/Track'
import { songs } from '@/lib/catalog'
import { Breadcrumbs, SectionHead, Faq, Check } from '@/components/ui'
import { tools, steps, usos } from '@/lib/tools'
import { faq } from '@/lib/faq'
import { site, priceBRL } from '@/lib/site'

export const metadata = {
  title: 'Como usar multitrack na igreja: guia completo (Reaper, Ableton e tablet)',
  description:
    'Guia prático de como tocar com multitrack gospel na igreja: qual programa usar, como separar clique e guia do mix da banda, que interface de áudio comprar e como rodar tudo no tablet.',
  alternates: { canonical: '/como-usar' },
  openGraph: {
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

export default function ComoUsarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />

      <div className="shell pt-12">
        <Breadcrumbs items={[{ href: '/', label: 'Início' }, { label: 'Como usar' }]} />

        <header className="mt-8 max-w-3xl border-b border-line pb-14">
          <p className="text-[14px] font-semibold text-ink-muted">
            Guia completo
          </p>
          <h1 className="mt-6 font-bold text-[38px] leading-[1.08] text-ink sm:text-[54px]">
            Como usar multitrack na sua igreja
          </h1>
          <p className="mt-6 text-[18px] leading-[1.7] text-ink-muted">
            Se a sua banda é pequena, se falta um instrumento ou se você quer que o som de domingo
            chegue mais perto do que se ouve no Spotify, o multitrack resolve. Este guia mostra o
            caminho inteiro: qual programa usar, como ligar na mesa e como não errar no meio do
            culto.
          </p>
        </header>
      </div>

      <section className="shell pt-20">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="prose-tv max-w-xl">
            <h2 className="!mt-0">Playback fechado x multitrack</h2>
            <p>
              O <strong>playback tradicional</strong> é um arquivo só, com tudo misturado. Se a sua
              banda tem baterista, azar: a bateria do playback continua tocando por cima.
            </p>
            <p>
              O <strong>multitrack (ou VS)</strong> entrega a mesma música aberta em canais
              separados. Você muta a bateria, muta a guitarra, deixa só os pads e os sopros, e a sua
              equipe toca o resto ao vivo. É por isso que praticamente toda igreja grande no Brasil
              trabalha assim hoje.
            </p>
            <p>
              Junto com os instrumentos vêm dois canais que nunca vão para a caixa de som:{' '}
              <strong>o clique</strong> (o metrônomo que mantém a banda no tempo) e{' '}
              <strong>a guia</strong> (uma voz avisando &ldquo;refrão&rdquo;, &ldquo;ponte&rdquo;,
              &ldquo;último&rdquo;). Esses dois vão só para o fone da equipe.
            </p>
          </div>

          <SessionPanel song={songs[0]} />
        </div>
      </section>

      <section className="shell pt-24 sm:pt-32">
        <SectionHead
          title="Do download ao domingo"
          sub="Cinco passos. Nenhum deles exige que você seja técnico de áudio."
        />
        <ol className="mt-12 grid divide-y divide-line border-y border-line lg:grid-cols-2 lg:gap-x-16 lg:divide-y-0">
          {steps.map((s) => (
            <li key={s.n} className="grid gap-3 py-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
              <span className="figs text-[20px] font-extrabold leading-none text-signal-deep">{s.n}</span>
              <div>
                <h3 className="font-bold text-[19px] leading-snug text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.7] text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="reaper" className="mt-24 scroll-mt-24 border-y border-line bg-white py-24 sm:mt-32 sm:py-32">
        <div className="shell">
          <SectionHead
            title="Qual software usar para rodar multitrack"
            sub="Todos abaixo dão conta do recado. A diferença está no bolso, no sistema operacional e em quanto você quer aprender."
          />

          <div className="mt-12 divide-y divide-line border-y border-line">
            {tools.map((t) => (
              <article
                key={t.slug}
                id={t.slug}
                className="grid scroll-mt-24 gap-6 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:gap-12"
              >
                <div>
                  <h3 className="font-bold text-[26px] leading-none text-ink">{t.name}</h3>
                  <p className="mt-2 text-[14px] font-semibold text-ink">
                    {t.badge}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">{t.platform}</p>
                </div>
                <div>
                  <p className="max-w-2xl text-[16px] leading-[1.72] text-ink-muted">{t.summary}</p>
                  <ul className="mt-5 space-y-2.5">
                    {t.why.map((w) => (
                      <li
                        key={w}
                        className="flex items-start gap-3 text-[14.5px] leading-[1.6] text-ink-muted"
                      >
                        <Check className="mt-[6px] shrink-0 text-signal" />
                        {w}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                    <p className="text-[13.5px] text-ink">{t.price}</p>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="link-quiet text-[13.5px]"
                    >
                      Site oficial
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 max-w-3xl">
            <h3 className="font-bold text-[22px] text-ink">
              Se você está começando hoje, faça assim
            </h3>
            <p className="mt-4 text-[16px] leading-[1.75] text-ink-muted">
              Instale o <strong className="font-semibold text-ink">REAPER</strong> e use os 60 dias
              de avaliação completa para testar sem gastar nada. Monte uma música, ligue na mesa,
              rode um ensaio. Se funcionar (e vai funcionar), a licença pessoal é barata perto de
              qualquer outra DAW. Se a igreja usa só iPad,{' '}
              <strong className="font-semibold text-ink">Prime</strong> é o caminho mais curto.
            </p>
          </div>
        </div>
      </section>

      <section className="shell pt-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="prose-tv">
            <h2 className="!mt-0">O segredo está no roteamento</h2>
            <p>
              Noventa por cento dos problemas com trilha ao vivo vêm daqui: o clique vazou para a
              caixa de som. A regra é simples e não muda de igreja para igreja.
            </p>
            <ul>
              <li>
                <strong>Saída 1 (fones):</strong> clique + guia. Vai para o retorno do baterista e de
                quem conduz o louvor. Nunca para o público.
              </li>
              <li>
                <strong>Saída 2 (PA):</strong> a soma dos instrumentos da trilha. É o que a igreja
                ouve.
              </li>
              <li>
                <strong>Saídas 3 e 4 (opcional):</strong> se a sua interface tiver, mande grupos
                separados — teclado num canal, pads noutro — e deixe o operador de som mixar na mesa.
              </li>
            </ul>
            <p>
              No REAPER isso é resolvido em dois minutos: selecione as faixas de clique e guia, abra
              o roteamento e mande para o par de saídas 1/2 da interface; deixe todo o resto no par
              3/4. Feito uma vez, salve como modelo de projeto e reutilize em toda música.
            </p>
          </div>

          <div className="bg-ink p-10 text-white sm:p-12">
            <p className="text-[14px] font-semibold text-white/45">
              Checklist antes do culto
            </p>
            <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {[
                'Projeto salvo e testado com a banda inteira',
                'Clique só no fone — confirme pedindo silêncio no PA',
                'Volume da trilha ajustado com a igreja vazia e depois cheia',
                'Notebook no modo alto desempenho, Wi-Fi e notificações desligados',
                'Bateria do tablet acima de 80% ou na tomada',
                'Cópia das músicas do dia num pendrive',
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-4 py-3.5 text-[15px] leading-[1.6] text-white/75"
                >
                  <Check className="mt-[7px] shrink-0 text-signal" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="tablet" className="shell scroll-mt-24 pt-24 sm:pt-32">
        <SectionHead
          title="Subir no palco só com um tablet"
          sub="Muita igreja abandonou o notebook. O tablet liga mais rápido, não trava com atualização do sistema no meio do culto e ocupa menos espaço no praticável."
        />
        <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: 'No iPad',
              d: 'O app Prime, da Loop Community, aceita os seus próprios arquivos e já separa o clique dos instrumentos entre os canais esquerdo e direito. Com um cabo P2 em Y você resolve sem interface.',
            },
            {
              t: 'Com interface',
              d: 'Uma interface compacta ligada ao tablet libera saídas de verdade: clique num canal, mix noutro, tudo balanceado até a mesa.',
            },
            {
              t: 'Setlist na tela',
              d: 'Deixe as músicas do domingo em ordem, com marcação de entrada. Quem conduz o louvor toca na tela e a próxima música já entra.',
            },
          ].map((c) => (
            <div key={c.t}>
              <h3 className="font-bold text-[20px] leading-snug text-ink">{c.t}</h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pt-24 sm:pt-32">
        <SectionHead title="O que você realmente precisa comprar" />
        <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {equipamentos.map((e) => (
            <div key={e.t}>
              <h3 className="font-bold text-[19px] leading-snug text-ink">{e.t}</h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-muted">{e.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pt-24 sm:pt-32">
        <SectionHead title="Não é só no domingo de manhã" />
        <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {usos.map((u) => (
            <div key={u.title}>
              <h3 className="font-bold text-[19px] leading-snug text-ink">{u.title}</h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-muted">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pt-24 sm:pt-32">
        <SectionHead title="Perguntas sobre uso" />
        <Faq items={faq.slice(3, 9)} className="mt-10" />
      </section>

      <section className="shell pt-24 sm:pt-32">
        <div className="border-y border-line py-16 text-center sm:py-20">
          <h2 className="font-bold tracking-[-0.025em] text-ink mx-auto max-w-2xl text-[30px] leading-[1.14] sm:text-[42px]">
            Agora só falta o acervo.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-[1.7] text-ink-muted">
            Mais de 4.000 multitracks gospel com clique, guia e canais separados — em um pacote
            único, por {priceBRL(site.price)}.
          </p>
          <Link href="/assinar" className="btn-signal mt-9">
            Liberar meu acesso
          </Link>
        </div>
      </section>
    </>
  )
}
