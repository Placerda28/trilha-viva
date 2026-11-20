import { EMAIL_SUPORTE } from '@/lib/site'
import { Icone } from '@/components/ds'

// Peças da /sucesso (MUDANÇAS §5): a página, o selo de 48 px e o bloco de título.

export const TITULO_SUCESSO =
  'font-semi-condensed text-[clamp(36px,6vw,56px)] font-[800] leading-none tracking-[-0.025em] [text-wrap:balance]'

// Coluna de 720 px com o pé fixo "O e-mail não chegou?". `data-rodape-colado`
// tira a folga antiga do rodapé.
export function PaginaSucesso({ children }) {
  return (
    <div data-rodape-colado="" className="bg-white text-ink">
      <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-[clamp(20px,4vw,32px)] pb-[clamp(64px,8vw,112px)] pt-[clamp(40px,6vw,88px)]">
        {children}
        <p className="border-t border-line pt-5 text-[15px] leading-[1.55] text-text-3">
          O e-mail não chegou? Olhe a caixa de spam ou escreva para{' '}
          <a href={`mailto:${EMAIL_SUPORTE}`} className="text-ink underline underline-offset-[3px]">
            {EMAIL_SUPORTE}
          </a>
          .
        </p>
      </div>
    </div>
  )
}

// Quadrado de 48 px: preto com o ✓ (aprovado) ou só a borda (espera, problema).
export function Selo({ tipo = 'espera' }) {
  const cheio = tipo === 'ok'
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 items-center justify-center ${cheio ? 'bg-ink text-white' : 'box-border border border-ink'}`}
    >
      <Icone nome={cheio ? 'check' : tipo === 'problema' ? 'alerta' : 'relogio'} tamanho={cheio ? 26 : 24} traco={cheio ? 2 : 1.75} />
    </span>
  )
}

// Selo, rótulo pequeno, título e texto.
export function Cabeca({ tipo, rotulo, titulo, children }) {
  return (
    <div className="flex flex-col gap-3.5">
      {tipo && <Selo tipo={tipo} />}
      {rotulo && <p className="mt-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-text-3">{rotulo}</p>}
      <h1 className={TITULO_SUCESSO}>{titulo}</h1>
      <div className="text-[18px] leading-[1.5] text-text-2 [text-wrap:pretty]">{children}</div>
    </div>
  )
}
