import Link from 'next/link'
import { ListaSanfona } from '@/components/ds'
import { EXTRAS, IMAGEM_PALCO, QUEM, RECURSOS, REQUISITOS, duvidas } from './dados'

// Seções de texto da vitrine /palco (MUDANÇAS §9): recursos, para quem é,
// requisitos e dúvidas. Servidor, sem estado. A de planos fica em Planos.jsx.
const SECAO = 'mx-auto w-full max-w-[1280px] px-[clamp(20px,4cqi,32px)] pt-[clamp(64px,8cqi,112px)]'
const LADO_A_LADO = `${SECAO} flex flex-wrap gap-x-20 gap-y-8`
export const H2 = 'font-semi-condensed text-[clamp(32px,4.4cqi,52px)] font-[750] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]'

export function Recursos() {
  return (
    <section aria-labelledby="h-faz" className={`${SECAO} flex flex-col gap-10`}>
      <div className="flex max-w-[760px] flex-col gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">O que o Palco faz</p>
        <h2 id="h-faz" className={H2}>Tudo o que o culto pede, numa tela só</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-x-10 gap-y-12">
        {RECURSOS.map((r) => (
          <figure key={r.t} className="m-0 flex flex-col gap-4">
            <div
              role="img"
              aria-label={r.alt}
              className="aspect-[16/10] border border-ink bg-ink bg-no-repeat"
              style={{ backgroundImage: `url('${IMAGEM_PALCO}')`, backgroundSize: r.tam, backgroundPosition: r.pos }}
            />
            <figcaption className="flex flex-col gap-1.5">
              <h3 className="font-semi-condensed text-[22px] font-bold leading-[1.15]">{r.t}</h3>
              <p className="max-w-[520px] text-[16px] leading-[1.6] text-text-2 [text-wrap:pretty]">{r.d}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-8 gap-y-6">
        {EXTRAS.map((e) => (
          <li key={e.t} className="flex flex-col gap-1.5 border-t border-ink pt-4">
            <strong className="text-[17px] font-[650]">{e.t}</strong>
            <span className="text-[15px] leading-[1.55] text-text-2">{e.d}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ParaQuemE() {
  return (
    <section aria-labelledby="h-quem" className={LADO_A_LADO}>
      <h2 id="h-quem" className={`${H2} flex-[1_1_300px]`}>Para quem é</h2>
      <ul className="flex min-w-0 flex-[2_1_480px] flex-col border-b border-line">
        {QUEM.map((q) => (
          <li key={q.t} className="border-t border-line py-4 text-[17px] leading-[1.55] text-text-2">
            <strong className="font-[650] text-ink">{q.t}</strong> {q.d}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Requisitos() {
  return (
    <section aria-labelledby="h-req" className={LADO_A_LADO}>
      <h2 id="h-req" className={`${H2} flex-[1_1_300px]`}>Requisitos</h2>
      <dl className="m-0 grid min-w-0 flex-[2_1_480px] grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] border-t border-line text-[16px] leading-[1.5]">
        {REQUISITOS.map(([nome, texto]) => (
          <div key={nome} className="contents">
            <dt className="border-b border-line py-3.5 pr-6 font-[650]">{nome}</dt>
            <dd className="m-0 border-b border-line py-3.5 text-text-2">{texto}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function Duvidas({ emBreve }) {
  return (
    <section aria-labelledby="h-faq-palco" className={`${LADO_A_LADO} pb-[clamp(64px,8cqi,112px)]`}>
      <div className="flex flex-[1_1_300px] flex-col gap-3">
        <h2 id="h-faq-palco" className={H2}>Dúvidas sobre o Palco</h2>
        {!emBreve && (
          <Link href="/palco/ajuda" className="inline-flex min-h-11 items-center self-start text-[16px] font-semibold text-ink underline underline-offset-4 hover:decoration-2">
            Ver a ajuda completa
          </Link>
        )}
      </div>
      <div className="min-w-0 flex-[2_1_480px]">
        <ListaSanfona itens={duvidas(emBreve)} />
      </div>
    </section>
  )
}
