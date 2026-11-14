export default function CotaAcervo({ sobrando, limite, volta }) {
  const usados = Math.max(0, limite - sobrando)
  const acabou = sobrando <= 0
  return (
    <section className="mt-8 rounded-md border border-line bg-white p-5 sm:p-6" aria-label="Cota de downloads">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Downloads de hoje</h2>
        <p className="figs text-[25px] font-bold text-ink">{usados} de {limite}</p>
      </div>
      <div role="progressbar" aria-label="Downloads de hoje" aria-valuenow={usados} aria-valuemin={0} aria-valuemax={limite} className="mt-4 h-1.5 bg-mist">
        <div className={'h-full ' + (acabou ? 'bg-signal' : 'bg-ink')} style={{ width: `${Math.min(100, usados / limite * 100)}%` }} />
      </div>
      <p className="mt-3 text-[13.5px] text-ink-muted">Renova {volta}</p>
      {acabou && <p className="mt-2 text-[14px] text-ink">Limite de hoje atingido. O acervo é seu para sempre, não precisa correr.</p>}
    </section>
  )
}
