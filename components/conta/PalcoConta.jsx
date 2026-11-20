import Link from 'next/link'
import { Botao, Icone } from '@/components/ds'
import { textoLancamento } from '@/lib/palco'
import TituloConta from './TituloConta'

// As três páginas do Palco dentro da conta, só no estado "Em breve" (MUDANÇAS
// §7): ainda não há assinatura, teste nem computadores no servidor. Os outros
// estados do desenho (sem plano, teste, ativo, recusado, cancelado) entram junto
// com esse backend. "Me avise no lançamento" leva à lista de espera de /palco.
//   pagina: 'conhecer' | 'palco' | 'assinatura'

const TITULOS = {
  conhecer: ['Conhecer o Palco', 'O programa da Trilha Viva para tocar VS no culto.'],
  palco: ['Baixar o Palco', 'O programa, o seu plano e os computadores onde ele está ativado.'],
  assinatura: ['Assinatura', 'O plano do Palco, as cobranças e o cartão.'],
}

const PONTOS = [
  { t: 'Clique e guia no fone', d: 'Cada instrumento num canal. O clique e a guia vão só para a equipe; o resto vai para a mesa.' },
  { t: 'A música por partes', d: 'Pule para o refrão ou repita a ponte quando o ministro pedir, sem perder o tempo.' },
  { t: 'Setlist e pad', d: 'Monte a ordem do culto antes e use o pad no tom da música nas transições.' },
  { t: 'Funciona sem internet', d: 'Depois de ativado, toca no culto mesmo sem sinal na igreja. Windows 10 e 11.' },
]

const AVISE = '/palco#lista-de-espera'

function Conhecer({ temPacote }) {
  const dias = temPacote ? 7 : 3
  return (
    <>
      <figure className="flex flex-col gap-2.5">
        <div className="aspect-video overflow-hidden border border-ink bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/palco-ao-vivo.webp"
            alt="Tela Ao Vivo do Palco tocando A Alegria (Morada): a música dividida em partes, a mesa com 13 canais (CLICK e GUIA em vermelho), o setlist do culto de domingo e o pad."
            width="1920"
            height="1080"
            className="block h-full w-full object-cover"
          />
        </div>
        <figcaption className="text-[14px] text-text-3">
          Tela Ao Vivo, no meio de um culto: a música por partes em cima, a mesa embaixo, setlist e pad ao lado.
        </figcaption>
      </figure>
      <p className="text-[18px] font-[650] leading-[1.45]">
        {temPacote
          ? 'Você tem o pacote: as 2.000 VS já aparecem dentro do Palco.'
          : 'Com o pacote, as 2.000 VS já aparecem dentro do Palco. Sem ele, você importa as suas.'}
      </p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-7 gap-y-5">
        {PONTOS.map((p) => (
          <li key={p.t} className="flex flex-col gap-1.5 border-t border-ink pt-3.5">
            <strong className="text-[16px] font-[650]">{p.t}</strong>
            <span className="text-[15px] leading-[1.5] text-text-2">{p.d}</span>
          </li>
        ))}
      </ul>
      <section aria-labelledby="h-conhecer-cta" className="flex flex-wrap items-center gap-x-8 gap-y-4 border border-ink p-[22px]">
        <div className="flex min-w-[min(100%,280px)] flex-[1_1_280px] flex-col gap-1">
          <h2 id="h-conhecer-cta" className="font-semi-condensed text-[22px] font-bold leading-tight">
            {textoLancamento()}
          </h2>
          <span className="text-[15px] leading-[1.5] text-text-2">
            Quando lançar, você testa {dias} dias grátis. Depois, R$ 19,90 por mês.
          </span>
        </div>
        <div className="flex flex-[0_1_300px] flex-col gap-2">
          <Botao href={AVISE} bloco>
            Me avise no lançamento
          </Botao>
          <Link
            href="/palco"
            className="inline-flex min-h-11 items-center justify-center self-center text-[15px] font-semibold underline underline-offset-[3px]"
          >
            Ver tudo sobre o Palco
          </Link>
        </div>
      </section>
    </>
  )
}

function Baixar({ temPacote }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-3 border border-ink p-6">
      <p className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width="22" height="22" className="block" />
        Em breve
      </p>
      <strong className="font-semi-condensed text-[26px] font-bold leading-tight">{textoLancamento()}</strong>
      <span className="text-[15px] leading-[1.55] text-text-2">
        {temPacote
          ? 'Quando lançar, você testa 7 dias grátis e as 2.000 VS do pacote já aparecem lá dentro.'
          : 'Quando lançar, você testa 3 dias grátis. Com o pacote, o teste é de 7 dias.'}
      </span>
      <Botao href={AVISE} className="self-start px-5">
        Me avise no lançamento
      </Botao>
    </div>
  )
}

function SemAssinatura() {
  return (
    <div className="flex flex-col items-start gap-3 border-y border-line py-7">
      <Icone nome="cartao" tamanho={40} traco={1.5} className="text-text-3" />
      <strong className="text-[18px] font-[650]">Você ainda não tem assinatura</strong>
      <span className="max-w-[560px] text-[15px] leading-[1.55] text-text-2">
        O Palco ainda não foi lançado. Quando lançar, a assinatura de R$ 19,90 por mês aparece aqui.
      </span>
      <Botao href="/palco" tamanho="lg" className="px-5">
        Conhecer o Palco
      </Botao>
    </div>
  )
}

export default function PalcoConta({ pagina = 'conhecer', temPacote = false }) {
  const [titulo, subtitulo] = TITULOS[pagina] || TITULOS.conhecer
  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo={titulo} subtitulo={subtitulo} />
      {pagina === 'conhecer' && <Conhecer temPacote={temPacote} />}
      {pagina === 'palco' && <Baixar temPacote={temPacote} />}
      {pagina === 'assinatura' && <SemAssinatura />}
    </div>
  )
}
