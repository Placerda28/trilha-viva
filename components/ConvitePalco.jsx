import Link from 'next/link'
import { Botao, EmBreve, Icone } from './ds'
import { LogoMark } from './Logo'
import { PALCO_PRECO_MENSAL, PALCO_TESTE_COM_PACOTE, PALCO_TESTE_SEM_PACOTE, textoLancamento } from '@/lib/palco'

// Convite ao Palco, discreto, em três variantes (MUDANÇAS §3, §5 e §13):
//
//   home     faixa preta com a tela Ao Vivo do Palco ao lado. Fica entre o pacote
//            e o preço, nunca antes do pacote.
//   sucesso  quadro de moldura cinza na /sucesso.
//   ficha    linha com fio em cima e embaixo na ficha da música.
//
//   <ConvitePalco variante="home" palco={palcoEstado()} />
//   <ConvitePalco variante="ficha" palco="lancado" />
//
// Server component. `palco` e `lancamento` vêm de lib/palco.js; `usuario` só
// troca o texto do teste grátis depois do lançamento.

const IMAGEM = '/img/palco-ao-vivo.webp'
const ALT =
  'Tela Ao Vivo do Palco tocando A Alegria (Morada): a onda com as partes Intro, Verso, Refrão, Solo e Ponte, a mesa com 13 canais (CLICK e GUIA marcados em vermelho), o setlist do culto de domingo e o pad.'

function Home({ emBreve, lancamento, teste }) {
  return (
    <section aria-labelledby="convite-palco" data-tema="escuro" className="bg-ink text-white [container-type:inline-size]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-16 gap-y-10 px-[clamp(20px,4cqi,32px)] py-[clamp(56px,8cqi,104px)]">
        <div className="flex flex-[1_1_340px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <LogoMark size={28} tone="light" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-dark-text-3">
              Palco · programa da Trilha Viva
            </span>
            {emBreve && <EmBreve tema="escuro" />}
          </div>
          <h2
            id="convite-palco"
            className="font-semi-condensed text-[clamp(30px,4.4cqi,48px)] font-[750] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]"
          >
            Agora toque essas VS no Palco
          </h2>
          <p className="text-[17px] leading-[1.55] text-dark-text-2 [text-wrap:pretty]">
            Um programa para Windows feito para o culto. Você liga a interface de áudio, manda o clique e a guia
            para o fone e toca a música por partes, com pad e setlist. Funciona sem internet.
          </p>
          <p className="text-[17px] font-semibold leading-[1.5]">Tem o pacote? As 2.000 VS já aparecem no Palco.</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
            {emBreve ? (
              <>
                <Botao variante="noEscuro" href="/palco#lista-de-espera" tamanho="md" className="text-[16px]">
                  Entrar na lista de espera
                </Botao>
                <span className="text-[15px] text-dark-text-3">{lancamento}</span>
              </>
            ) : (
              <>
                <Botao variante="noEscuro" href="/palco" tamanho="md" className="text-[16px]">
                  Conhecer o Palco
                </Botao>
                <span className="text-[15px] tabular-nums text-dark-text-3">
                  {PALCO_PRECO_MENSAL} por mês · {teste}
                </span>
              </>
            )}
          </div>
        </div>
        <figure className="m-0 flex flex-[1.5_1_420px] flex-col gap-2.5">
          <div className="aspect-video overflow-hidden border border-dark-frame bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGEM}
              alt={ALT}
              width="1920"
              height="1080"
              loading="lazy"
              decoding="async"
              className="block h-full w-full object-cover"
            />
          </div>
          <figcaption className="text-[14px] text-dark-text-3">
            Tela Ao Vivo: partes da música em cima, mesa com um canal para cada instrumento embaixo.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function Sucesso({ emBreve, lancamento }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4 border border-line-2 p-5">
      <LogoMark size={40} tone="ink" />
      <div className="flex flex-[1_1_240px] flex-col gap-1 text-ink">
        {emBreve ? (
          <>
            <strong className="text-[17px] font-[650]">Quando o Palco lançar, você ganha 7 dias grátis</strong>
            <span className="text-[15px] leading-[1.5] text-text-2 [text-wrap:pretty]">
              É o nosso programa para tocar VS no culto. {lancamento}; avisamos no seu e-mail.
            </span>
          </>
        ) : (
          <>
            <strong className="text-[17px] font-[650]">Você ganhou 7 dias de Palco</strong>
            <span className="text-[15px] leading-[1.5] text-text-2 [text-wrap:pretty]">
              Baixe o programa e toque estas mesmas VS no culto. As 2.000 já aparecem lá dentro.
            </span>
          </>
        )}
      </div>
      {!emBreve && (
        <Botao variante="contorno" href="/palco/baixar" tamanho="sm">
          Baixar o Palco
        </Botao>
      )}
    </div>
  )
}

function Ficha({ emBreve, lancamento }) {
  return (
    <Link
      href={emBreve ? '/palco#lista-de-espera' : '/palco'}
      className="flex min-h-14 items-center gap-3 border-y border-line py-2 text-ink hover:bg-surface"
    >
      <LogoMark size={28} tone="ink" />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">Toque esta VS no Palco</span>
        <span className="text-[14px] text-text-3">
          {emBreve
            ? `Programa da Trilha Viva para tocar VS no culto. ${lancamento}.`
            : 'Clique e guia no fone, partes e setlist. 7 dias grátis para quem tem o pacote.'}
        </span>
      </span>
      <Icone nome="seta-direita" tamanho={20} traco={1.5} />
    </Link>
  )
}

export default function ConvitePalco({ variante = 'home', palco = 'em-breve', usuario = 'visitante', lancamento }) {
  const emBreve = palco !== 'lancado'
  const texto = textoLancamento(lancamento)
  const teste = usuario === 'com-pacote' ? PALCO_TESTE_COM_PACOTE : PALCO_TESTE_SEM_PACOTE
  if (variante === 'sucesso') return <Sucesso emBreve={emBreve} lancamento={texto} />
  if (variante === 'ficha') return <Ficha emBreve={emBreve} lancamento={texto} />
  return <Home emBreve={emBreve} lancamento={texto} teste={teste} />
}
