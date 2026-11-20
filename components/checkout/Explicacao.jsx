import Canais from '@/components/Canais'
import { Icone, ListaSanfona } from '@/components/ds'
import { LINK } from '@/components/venda/estilos'
import { EMAIL_SUPORTE, priceBRL, site } from '@/lib/site'

// Coluna de explicação de /assinar (MUDANÇAS §4): o que a pessoa recebe, o que
// vem no pacote, como funciona e as dúvidas rápidas. O Palco não aparece aqui.
// A prévia é a mesma da home (os mp3 ainda não foram enviados: ver OQueE.jsx).

const GRUPOS = [
  {
    titulo: 'O acervo',
    itens: [`Mais de ${site.totalTracks.toLocaleString('pt-BR')} multitracks gospel`, 'Novas trilhas somadas ao acervo'],
  },
  {
    titulo: 'Cada música',
    itens: [
      'Clique e guia em canais separados',
      'Bateria, baixo, teclado, guitarra, pads e vocais isolados',
      'Arquivos em WAV e MP3',
      'Pronto para mudar o tom',
    ],
  },
  { titulo: 'Onde usar', itens: ['REAPER, Ableton Live, Prime e tablet', 'Acesso vitalício, sem mensalidade'] },
]

const PASSOS = [
  ['Paga no Pix ou no cartão', 'O pagamento é feito no ambiente do Mercado Pago.'],
  ['Recebe o acesso no e-mail', 'Aprovou, o link para criar a senha chega na hora.'],
  ['Baixa música por música', 'Entra na área do acervo e baixa o que for usar.'],
]

const DUVIDAS = [
  {
    titulo: 'Precisa pagar mensalidade?',
    conteudo: `Não. É um pagamento único de ${priceBRL(site.price)} e o acesso é vitalício, sem renovação.`,
  },
  {
    titulo: 'Em quanto tempo recebo?',
    conteudo:
      'Na hora. No Pix e no cartão a confirmação é imediata: você volta ao site, cria sua senha e o acervo abre. O link para criar a senha também vai para o e-mail que você informou.',
  },
  {
    titulo: 'Funciona no meu programa?',
    conteudo:
      'Os arquivos são WAV e MP3 comuns, organizados por música, e abrem em qualquer programa de áudio: REAPER, Ableton Live, Waveform, Cantabile e o Prime no iPad.',
  },
  {
    titulo: 'Posso baixar quantas vezes?',
    conteudo:
      'O acesso é vitalício, então você pode voltar e baixar de novo sempre que precisar. Existe só um limite diário: até 30 downloads por dia em cada conta, para proteger o acervo de contas repassadas.',
  },
]

const H2 = 'font-semi-condensed text-[24px] font-bold leading-[1.15]'

export default function Explicacao({ className }) {
  return (
    <div className={`flex flex-col gap-[clamp(40px,5cqi,56px)] ${className || ''}`}>
      <section aria-labelledby="h-cada" className="flex max-w-[560px] flex-col gap-3.5">
        <h2 id="h-cada" className={H2}>
          É isso que você recebe em cada música
        </h2>
        <p className="text-[16px] leading-[1.5] text-text-2">Ouça 30 segundos e ligue ou desligue cada canal.</p>
        <Canais tema="escuro" previa />
      </section>

      <section aria-labelledby="h-vem" className="flex flex-col gap-4">
        <h2 id="h-vem" className={H2}>
          O que vem no pacote
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-2 border-t border-ink pt-3.5">
              <h3 className="text-[15px] font-[650]">{g.titulo}</h3>
              <ul className="flex flex-col gap-1.5">
                {g.itens.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] leading-[1.45] text-text-2">
                    <Icone nome="check" tamanho={16} className="mt-[3px] shrink-0 text-ink" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-como" className="flex flex-col gap-4">
        <h2 id="h-como" className={H2}>
          Como funciona
        </h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          {PASSOS.map(([titulo, texto], i) => (
            <li key={titulo} className="flex flex-col gap-1.5 border-t border-ink pt-3.5">
              <span className="text-[14px] font-bold tabular-nums text-text-3">{i + 1}</span>
              <strong className="text-[16px] font-[650]">{titulo}</strong>
              <span className="text-[15px] leading-[1.5] text-text-2">{texto}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-rapidas" className="flex flex-col gap-2">
        <h2 id="h-rapidas" className={`${H2} mb-2`}>
          Dúvidas rápidas
        </h2>
        <ListaSanfona itens={DUVIDAS} />
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
          <a href="#comprar" className={LINK}>
            Voltar ao formulário
          </a>
          <span className="text-[15px] text-text-3">
            Outra dúvida?{' '}
            <a href={`mailto:${EMAIL_SUPORTE}`} className="underline underline-offset-[3px]">
              {EMAIL_SUPORTE}
            </a>
          </span>
        </div>
      </section>
    </div>
  )
}
