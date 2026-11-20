import Link from 'next/link'
import Canais from '@/components/Canais'
import Secao from '@/components/venda/Secao'
import { H2, H3, LINK } from '@/components/venda/estilos'

// Seção 2 da home (MUDANÇAS §3): o que é multitrack, ao lado do quadro de canais
// com a prévia de 30 s. É a única prévia de áudio do site.
//
// Os mp3 ficam em public/audio/previa/obediencia/ (detalhes em components/Canais.jsx).
// Se faltarem, o botão de tocar avisa
// "A prévia desta música ainda não está disponível." e nada trava.

const SAIDAS = [
  ['Saída 1, fones.', 'Clique e guia vão só para o baterista e para quem conduz.'],
  ['Saída 2, PA.', 'O mix dos instrumentos da trilha vai para a mesa de som.'],
  ['Mute o que a banda toca.', 'O multitrack completa a equipe, não substitui ninguém.'],
]

const FORTE = 'font-[650] text-ink'

export default function OQueE() {
  return (
    <Secao aria-labelledby="h-vs" interno="flex flex-wrap items-start gap-x-20 gap-y-12">
      <div className="flex flex-[1_1_420px] flex-col gap-[18px]">
        <h2 id="h-vs" className={H2}>
          Não é playback fechado. É a música aberta, canal por canal.
        </h2>
        <p className="text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]">
          No playback comum está tudo misturado num arquivo só. Se a sua igreja tem baterista, a bateria da gravação
          continua tocando por cima dele.
        </p>
        <p className="text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]">
          O multitrack — o VS — entrega a mesma música separada: bateria, baixo, teclado, guitarra, pads, sopros e
          vocais, cada um no seu arquivo. Você muta o que já tem músico e deixa ligado só o que falta.
        </p>
        <p className="text-[17px] leading-[1.6] text-text-2 [text-wrap:pretty]">
          Junto vêm dois canais que a igreja nunca ouve: <strong className={FORTE}>o clique</strong>, que segura o
          andamento, e <strong className={FORTE}>a guia</strong>, a voz que avisa o que vem em seguida. Esses dois vão
          só para o fone da equipe.
        </p>
        <Link href="/como-usar" className={`${LINK} self-start`}>
          Ver o guia completo de uso
        </Link>
      </div>

      <div className="flex min-w-0 max-w-[560px] flex-[1_1_400px] flex-col gap-7">
        <figure className="m-0 flex flex-col gap-2.5">
          <Canais tema="escuro" previa />
          <figcaption className="text-[14px] leading-[1.45] text-text-3">
            Ouça 30 segundos de uma música do acervo: 8 canais, com o clique e a guia saindo só para o fone.
          </figcaption>
        </figure>
        <div className="flex flex-col gap-3">
          <h3 className={H3}>O clique fica no fone. O resto vai para a igreja.</h3>
          <p className="text-[16px] leading-[1.55] text-text-2">
            É a única regra que importa, e ela se resolve uma vez só no seu programa. Depois é abrir a música e tocar.
          </p>
          <ul className="flex flex-col border-b border-line">
            {SAIDAS.map(([titulo, texto]) => (
              <li key={titulo} className="border-t border-line py-3 text-[16px] leading-[1.5] text-text-2">
                <strong className={FORTE}>{titulo}</strong> {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Secao>
  )
}
