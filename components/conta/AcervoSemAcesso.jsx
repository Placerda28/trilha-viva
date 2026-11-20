import { Aviso, Botao, BotaoCompra, MolduraAccent } from '@/components/ds'
import TituloConta from './TituloConta'

// Minhas VS quando a lista não aparece: sem pacote, conta da equipe de gestão
// (não é "sem compra": está no lugar errado) ou acervo ainda sendo transferido.
//   motivo: 'sem-pacote' | 'gestao' | 'preparando'
export default function AcervoSemAcesso({ motivo }) {
  const semPacote = motivo !== 'preparando'
  return (
    <div className="flex flex-col gap-6">
      <TituloConta
        titulo="Minhas VS"
        subtitulo={semPacote ? 'Aqui ficam as VS do pacote 2.000 VS.' : 'Mais de 2.000 multitracks com clique e guia, liberadas para você.'}
      />
      {motivo === 'gestao' && (
        <MolduraAccent as="section" traco={48} className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
          <div className="flex min-w-[min(100%,300px)] flex-[1_1_300px] flex-col gap-1.5">
            <strong className="font-semi-condensed text-[22px] font-bold">Sua conta é da equipe de gestão</strong>
            <span className="text-[15px] leading-[1.5] text-text-2">
              O acervo não está liberado para esta conta. O que você precisa está na gestão.
            </span>
          </div>
          <Botao href="/gestao" tamanho="lg" className="flex-[0_1_260px]">
            Abrir a gestão
          </Botao>
        </MolduraAccent>
      )}
      {motivo === 'sem-pacote' && (
        <>
          <MolduraAccent as="section" traco={48} className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
            <div className="flex min-w-[min(100%,300px)] flex-[1_1_300px] flex-col gap-1.5">
              <strong className="font-semi-condensed text-[22px] font-bold">Suas VS aparecem aqui depois da compra</strong>
              <span className="text-[15px] leading-[1.5] text-text-2">
                2.000 multitracks com clique e guia. Pagamento único de R$ 89,90, acesso vitalício.
              </span>
            </div>
            <BotaoCompra className="flex-[0_1_260px]" tamanho="lg" />
          </MolduraAccent>
          <p className="max-w-[60ch] text-[15px] leading-[1.5] text-text-3">
            Acabou de pagar? A confirmação pode levar alguns instantes: atualize esta página. Se pagou com outro e-mail,
            entre com aquele endereço.
          </p>
        </>
      )}
      {motivo === 'preparando' && (
        <Aviso variante="info" titulo="Acervo em preparação.">
          Seu acesso está confirmado e é vitalício. As músicas estão sendo transferidas para o servidor de downloads.
          Assim que terminar, a lista completa aparece aqui. Você recebe um e-mail quando estiver liberado.
        </Aviso>
      )}
    </div>
  )
}
