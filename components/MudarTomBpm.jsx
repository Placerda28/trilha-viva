// Seção "Como mudar o tom e o BPM" da /como-usar (âncora #mudar-tom-e-bpm),
// para onde apontam a ficha e o parágrafo de BPM de cada música.
//
// Nomes de menu conferidos na documentação oficial em 21/10/2026:
// - REAPER: "Up and Running: A REAPER User Guide v 7.81" (reaper.fm/userguide.php),
//   seções de Project Settings (timebase), BPM da Transport Bar e Media Item Properties (F2).
// - Ableton Live 12 Reference Manual: "Audio Clips, Tempo, and Warping" e "Clip View"
//   (Warp, Tempo da Control Bar, controle Pitch em semitons).
// - Prime (Loop Community): artigo "How do I transpose a track in Prime?" (support.loopcommunity.com,
//   atualizado em 21/06/2022). O andamento não tem passo documentado: fica só a orientação geral.

const PROGRAMAS = [
  {
    nome: 'No REAPER',
    passos: [
      'Em File › Project Settings, confira se "Timebase for items/envelopes/markers" está em "Beats (position, length, rate)" (é o padrão). Assim, todas as faixas acompanham o andamento.',
      'Para mudar o andamento, clique na caixa BPM da barra de transporte e digite o número novo. Clique, guia e instrumentos mudam juntos.',
      'Para mudar o tom, selecione só os itens de instrumentos e vozes (deixe clique e guia de fora) e aperte F2 para abrir Media Item Properties.',
      'Em "Pitch adjust", digite quantos semitons quer subir ou descer. Atalho: Shift+0 sobe um semitom e Shift+9 desce um.',
    ],
  },
  {
    nome: 'No Ableton Live',
    passos: [
      'Confira se cada clipe está com Warp ligado (painel Audio Utilities, na Clip View). Sem Warp, o clipe ignora o andamento do set.',
      'Para mudar o andamento, altere o campo Tempo da Control Bar. Todos os clipes com Warp, inclusive o clique, acompanham.',
      'Para mudar o tom, abra cada clipe de instrumento e de voz e ajuste o controle Pitch, em semitons. Não mexa no clique nem na guia.',
      'Evite o modo de warp Re-Pitch: nele, o controle de tom fica desligado. Para música inteira, o manual indica o modo Complex.',
    ],
  },
  {
    nome: 'No Prime',
    passos: [
      'No Mac, use as setas do canto inferior direito para mudar o tom da música.',
      'No iPhone, toque no ícone de nota musical na parte de baixo, escolha o tom e confirme em Done.',
      'O Prime também muda o andamento, mas a ajuda oficial não descreve o passo a passo. Procure o controle de tempo na tela da música.',
    ],
  },
]

export default function MudarTomBpm() {
  return (
    <section id="mudar-tom-e-bpm" className="shell scroll-mt-24 pt-24 sm:pt-32">
      <div className="prose-tv max-w-3xl">
        <h2 className="!mt-0">Como mudar o tom e o BPM da multitrack</h2>
        <p>
          O tom e o BPM informados em cada música são os da versão original. Os dois podem ser
          ajustados no programa que roda a VS, sem baixar outro arquivo.
        </p>
        <h3>Mudar o andamento (BPM)</h3>
        <p>
          A mudança vale para todas as faixas ao mesmo tempo, inclusive o clique. Se uma faixa ficar
          de fora, a banda sai do tempo. Prefira ajustes pequenos, de até cerca de 10% para mais ou
          para menos: mudanças grandes deixam o som artificial.
        </p>
        <h3>Mudar o tom</h3>
        <p>
          Transponha os instrumentos e os vocais, mas <strong>não</strong> o clique nem a guia: a guia
          falada fica com a voz estranha. Prefira até 2 ou 3 semitons para cima ou para baixo.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        {PROGRAMAS.map((p) => (
          <div key={p.nome} className="border-t-2 border-ink pt-6">
            <h3 className="text-[19px] font-bold tracking-[-0.015em] text-ink">{p.nome}</h3>
            <ol className="mt-5 space-y-3">
              {p.passos.map((passo, i) => (
                <li key={passo} className="flex gap-3 text-[15px] leading-[1.65] text-ink-muted">
                  <span className="figs shrink-0 font-bold text-ink">{i + 1}.</span>
                  <span>{passo}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
