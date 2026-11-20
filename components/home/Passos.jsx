import Link from 'next/link'
import Secao from '@/components/venda/Secao'
import { H2, LINK } from '@/components/venda/estilos'
import { steps } from '@/lib/tools'

// Seção 5 da home (MUDANÇAS §3): "Do download ao domingo", 5 passos em colunas.
// Aqui a numeração é real: é uma sequência.
//
// O texto do passo 2 deixa de citar o REAPER (a home agora trata os programas
// por igual, e o Palco vem primeiro). lib/tools.js continua com o texto antigo
// porque o /como-usar ainda usa.
const PASSO_2 =
  'Abra o programa que você escolheu, crie um projeto novo e arraste todos os arquivos da pasta. Eles entram alinhados, cada um na sua faixa.'

const passos = steps.map((s) => (s.n === '02' ? { ...s, body: PASSO_2 } : s))

export default function Passos() {
  return (
    <Secao fundo="surface" aria-labelledby="h-passos" interno="flex flex-col gap-8">
      <div className="flex max-w-[720px] flex-col gap-3">
        <h2 id="h-passos" className={H2}>
          Do download ao domingo
        </h2>
        <p className="text-[17px] leading-[1.6] text-text-2">Cinco passos. Nenhum deles exige que você seja técnico de áudio.</p>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-7">
        {passos.map((p) => (
          <li key={p.n} className="flex flex-col gap-2 border-t border-ink pt-4">
            <span className="text-[14px] font-bold tabular-nums text-text-3">{p.n}</span>
            <h3 className="text-[18px] font-[650] leading-[1.25]">{p.title}</h3>
            <p className="text-[15px] leading-[1.55] text-text-2 [text-wrap:pretty]">{p.body}</p>
          </li>
        ))}
      </ol>
      <Link href="/vs-gratis" className={`${LINK} self-start`}>
        Quer testar antes? Baixe uma VS grátis
      </Link>
    </Secao>
  )
}
