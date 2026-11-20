import { Botao, Icone, MolduraAccent } from '@/components/ds'
import { PALCO_PRECO_MENSAL } from '@/lib/palco'
import { INCLUSO } from './dados'
import { H2 } from './SecoesPalco'
import PacoteAcao from './PacoteAcao'

// Assinatura (`id="planos"`, MUDANÇAS §9). O pacote vem primeiro: as VS são dele,
// o Palco só toca. Em breve, o botão do Palco vira "Entrar na lista de espera".
const ROTULO = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3'

export default function Planos({ emBreve }) {
  return (
    <section id="planos" aria-labelledby="h-planos" className="mx-auto flex w-full max-w-[1280px] scroll-mt-20 flex-col gap-8 px-[clamp(20px,4cqi,32px)] pt-[clamp(64px,8cqi,112px)]">
      <div className="flex max-w-[760px] flex-col gap-3">
        <p className={ROTULO}>Assinatura</p>
        <h2 id="h-planos" className={H2}>As VS vêm do pacote. O Palco toca.</h2>
        <p className="text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]">
          A assinatura é do programa. Quem tem o pacote vê as 2.000 VS dentro do Palco automaticamente; quem não tem pode importar as próprias VS.
        </p>
      </div>
      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex flex-[1_1_300px] flex-col gap-3 border border-line-2 p-6">
          <p className={ROTULO}>1 · As músicas</p>
          <h3 className="font-semi-condensed text-[24px] font-[750]">Pacote 2.000 VS</h3>
          <p className="text-[15px] leading-[1.5] text-text-2">
            Pagamento único de <strong className="font-bold tabular-nums text-ink">R$ 89,90</strong>, acesso vitalício. Pix ou cartão.
          </p>
          <PacoteAcao />
        </div>

        <MolduraAccent traco={48} className="flex flex-[1.4_1_360px] flex-col gap-3.5 p-6">
          <p className={ROTULO}>2 · O programa</p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h3 className="font-semi-condensed text-[24px] font-[750]">Palco</h3>
            <p className="whitespace-nowrap">
              <span className="font-semi-condensed text-[40px] font-extrabold leading-none tabular-nums">{PALCO_PRECO_MENSAL}</span>
              <span className="text-[16px] text-text-2"> por mês</span>
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {INCLUSO.map((i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-[1.45]">
                <Icone nome="check" tamanho={18} className="mt-px" />
                {i}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 border border-line">
            <div className="border-r border-line px-3.5 py-3">
              <span className="font-semi-condensed block text-[24px] font-extrabold">7 dias grátis</span>
              <span className="text-[14px] text-text-2">para quem tem o pacote</span>
            </div>
            <div className="px-3.5 py-3">
              <span className="font-semi-condensed block text-[24px] font-extrabold">3 dias grátis</span>
              <span className="text-[14px] text-text-2">para quem ainda não é cliente</span>
            </div>
          </div>
          {emBreve ? (
            <Botao href="#lista-de-espera" bloco tamanho="lg">Entrar na lista de espera</Botao>
          ) : (
            <>
              <div className="mt-1 flex flex-wrap gap-2.5">
                <Botao href="/palco/baixar" tamanho="lg" className="flex-[1_1_220px]">Baixar e testar grátis</Botao>
                <Botao href="/minha-conta/assinatura" variante="contorno" tamanho="lg" className="flex-[1_1_160px]">Assinar agora</Botao>
              </div>
              <p className="text-[14px] leading-[1.5] text-text-3">
                Cobrança mensal no cartão. Cancele quando quiser em Minha conta; o Palco funciona até o fim do mês pago.
              </p>
            </>
          )}
        </MolduraAccent>
      </div>
    </section>
  )
}
