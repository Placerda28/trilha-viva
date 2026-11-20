// O quadro de canais de um VS em MP3: o arquivo é uma mixagem pronta, uma faixa
// só. Mesma moldura do quadro `Canais`, com a única linha. (O `Canais` escreveria
// "1 canais" no cabeçalho, por isso este quadro à parte.)
export default function FaixaUnica({ musica, artista }) {
  return (
    <div className="m-0 w-full border border-ink bg-white text-ink">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 pb-3.5 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <strong className="text-[17px] font-[650] leading-[1.25]">{musica}</strong>
          <span className="text-[14px] text-text-4">{artista}</span>
        </div>
        <span className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.04em] text-text-4">
          Faixa única
        </span>
      </div>
      <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_44px] items-center gap-3.5 border-b border-line px-4">
        <span className="text-[15px] font-medium">Mixagem pronta</span>
        <span className="text-right text-[12px] font-bold tracking-[0.06em] text-text-4">PA</span>
      </div>
    </div>
  )
}
