import Icone from '../Icone'

// Fim do caminho de pagar e de recusar: confirma o que foi feito e diz se o
// e-mail do afiliado saiu. Se não saiu, avisa alto: o dono precisa falar com
// a pessoa por outro canal.
export default function ResultadoSaque({ titulo, enviado, nome, complemento = '', aoFechar }) {
  return (
    <div className="px-4 py-8 sm:px-6">
      <div role="status">
        <span className="grid h-11 w-11 place-items-center rounded-sm bg-ink text-white">
          <Icone nome="confere" tamanho={24} />
        </span>
        <p className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink">{titulo}</p>
        {enviado && <p className="mt-1.5 text-[15.5px] text-ink-muted">E-mail enviado ao afiliado{complemento}.</p>}
      </div>
      {!enviado && (
        <div role="alert" className="mt-5 flex gap-3 rounded border border-signal/40 bg-signal-wash px-4 py-3.5">
          <Icone nome="alerta" tamanho={20} className="mt-0.5 shrink-0 text-signal-deep" />
          <p className="text-[14.5px] leading-[1.55] text-ink">
            <strong>O e-mail para {nome} não saiu.</strong> O registro está salvo. Avise a pessoa por outro canal, como o WhatsApp.
          </p>
        </div>
      )}
      <button type="button" onClick={aoFechar} className="btn-ink mt-7 min-h-12 w-full sm:w-auto sm:min-w-40">
        Fechar
      </button>
    </div>
  )
}
