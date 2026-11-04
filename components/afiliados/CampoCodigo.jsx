'use client'

import { limparCodigoDigitado } from '@/lib/afiliados-campos'

// Texto de cada estado da conferência. O motivo de "ocupado" vem do servidor
// (/api/afiliados/codigo), que já o escreve em português simples.
function mensagem(estado, motivo) {
  if (estado === 'conferindo') return { texto: 'Conferindo…', tom: 'neutro' }
  if (estado === 'livre') return { texto: 'Disponível. Esse código é seu.', tom: 'ok' }
  if (estado === 'formato') return { texto: 'Use de 4 a 15 letras e números, sem espaço nem acento.', tom: 'neutro' }
  if (estado === 'erro') return { texto: 'Não consegui conferir agora. Você pode enviar mesmo assim.', tom: 'neutro' }
  if (estado === 'ocupado') {
    return { texto: motivo || 'Este código não está disponível. Escolha outro.', tom: 'erro' }
  }
  return null
}

const campo =
  'mt-2 w-full rounded border bg-white px-4 py-3.5 text-[18px] font-bold uppercase tracking-[0.06em] text-ink placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:border-ink focus:outline-none'

export default function CampoCodigo({ id, valor, onChange, estado, motivo, outraSugestao, onSugerir }) {
  const msg = mensagem(estado, motivo)
  const ocupado = estado === 'ocupado'
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-ink">
        Escolha seu código
      </label>
      <input
        id={id}
        name="codigo"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={15}
        value={valor}
        onChange={(e) => onChange(limparCodigoDigitado(e.target.value))}
        placeholder="Ex.: JOAO27"
        aria-describedby={`${id}-ajuda`}
        aria-invalid={ocupado || undefined}
        className={`${campo} ${ocupado ? 'border-signal-deep' : 'border-line'}`}
      />
      <div id={`${id}-ajuda`} className="mt-2 min-h-[22px] text-[13.5px] leading-[1.5]" aria-live="polite">
        {msg ? (
          <p
            className={
              msg.tom === 'erro' ? 'font-semibold text-signal-deep' : msg.tom === 'ok' ? 'font-semibold text-ink' : 'text-ink-muted'
            }
          >
            {msg.tom === 'ok' && <span aria-hidden="true">✓ </span>}
            {msg.texto}
          </p>
        ) : (
          <p className="text-ink-muted">De 4 a 15 letras e números. É ele que registra as vendas do seu link.</p>
        )}
      </div>
      {ocupado && outraSugestao && (
        <button
          type="button"
          onClick={() => onSugerir()}
          className="link-signal mt-1 min-h-11 text-[14.5px]"
        >
          Tentar {outraSugestao}
        </button>
      )}
    </div>
  )
}
