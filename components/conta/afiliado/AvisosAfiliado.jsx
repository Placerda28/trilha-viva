'use client'

import { useState } from 'react'
import { Aviso } from '@/components/ds'
import { enviar, useHttp } from '@/components/afiliados/painel/api'
import { linkInterno } from '@/lib/afiliados-painel'

const LINK = 'inline-flex min-h-11 items-center text-[15px] font-semibold underline underline-offset-[3px]'

// Avisos do programa. Dispensar marca como lido (POST /api/afiliados/avisos):
// some na hora e, se o servidor falhar, volta na próxima visita.
export function AvisosAfiliado({ avisos = [] }) {
  const chamar = useHttp()
  const [dispensados, setDispensados] = useState([])
  const lista = avisos.filter((a) => !dispensados.includes(a.id))
  if (!lista.length) return null

  function dispensar(ids) {
    setDispensados((d) => [...d, ...ids])
    enviar(chamar, '/api/afiliados/avisos', { ids })
  }

  return (
    <section aria-label="Avisos" className="flex flex-col gap-3">
      {lista.map((a) => {
        const link = linkInterno(a.link)
        return (
          <Aviso
            key={a.id}
            variante="info"
            icone="info"
            titulo={a.titulo}
            acao={
              <div className="flex flex-wrap gap-x-5">
                {link && (
                  <a href={link} className={LINK}>
                    Ver detalhes
                  </a>
                )}
                <button type="button" onClick={() => dispensar([a.id])} className={LINK}>
                  Dispensar aviso
                </button>
              </div>
            }
          >
            {a.texto}
          </Aviso>
        )
      })}
      {lista.length > 1 && (
        <button type="button" onClick={() => dispensar(lista.map((a) => a.id))} className={`${LINK} self-start`}>
          Dispensar todos os avisos
        </button>
      )}
    </section>
  )
}

// "Me avise por e-mail a cada venda": muda na hora e volta atrás se o servidor não aceitar.
export function AvisarCadaVenda({ inicial }) {
  const chamar = useHttp()
  const [ligado, setLigado] = useState(Boolean(inicial))
  const [falhou, setFalhou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function alternar(e) {
    const novo = e.target.checked
    setLigado(novo)
    setFalhou(false)
    setSalvando(true)
    const r = await enviar(chamar, '/api/afiliados/preferencias', { avisar_cada_venda: novo })
    setSalvando(false)
    if (!r.ok || !r.corpo?.ok) {
      setLigado(!novo)
      setFalhou(true)
    } else if (typeof r.corpo.avisar_cada_venda === 'boolean') {
      setLigado(r.corpo.avisar_cada_venda)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold">
        <input
          type="checkbox"
          checked={ligado}
          onChange={alternar}
          disabled={salvando}
          className="h-5 w-5 shrink-0 accent-ink"
        />
        Me avise por e-mail a cada venda
      </label>
      {falhou && (
        <p role="alert" className="text-[14px] font-medium text-red-text">
          Não deu para salvar agora. Tente de novo.
        </p>
      )}
    </div>
  )
}
