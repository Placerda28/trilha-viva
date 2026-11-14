'use client'

import { useEffect, useRef, useState } from 'react'
import Icone from '../Icone'
import { useApiSaques } from './apiSaques'
import { MSG_SEM_ARMAZENAMENTO, conferirArquivo, tamanhoTexto, tipoDoArquivo } from './saquesUtil'

// Passo "anexe o comprovante": arrastar ou escolher, conferir tipo e tamanho
// (só para ajudar; o servidor confere de novo), mostrar nome e tamanho, enviar
// com andamento. O pai recebe o `caminho` guardado pelo servidor em `aoEnviar`
// (e null se a pessoa trocar o arquivo); `aoOcupar` trava o painel durante o envio.

function mensagemDoErro(r) {
  if (r.status === 503) return MSG_SEM_ARMAZENAMENTO
  if (r.status === 404) return 'Sua sessão acabou. Entre de novo para continuar.'
  if (r.status === 413) return 'O arquivo passa de 5 MB. Envie um menor.'
  if (r.status === 409) return r.dados?.erro || 'Este saque já foi tratado. Feche e atualize a lista.'
  if (r.status === 502) return 'O armazenamento recusou o arquivo. Tente de novo em instantes.'
  if (r.status === 0) return 'Falha de conexão. Confira a internet e tente de novo.'
  return r.dados?.erro || 'Não consegui enviar o comprovante. Tente de novo.'
}

function Miniatura({ arquivo }) {
  const [url, setUrl] = useState('')
  const imagem = tipoDoArquivo(arquivo) !== 'PDF'
  useEffect(() => {
    if (!imagem) return undefined
    const u = URL.createObjectURL(arquivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [arquivo, imagem])
  if (imagem && url) {
    // eslint-disable-next-line @next/next/no-img-element -- é um blob local, o next/image não se aplica
    return <img src={url} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-sm border border-line object-cover" />
  }
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-line bg-paper text-ink-muted">
      <Icone nome="arquivo" tamanho={22} />
    </span>
  )
}

export default function Comprovante({ saqueId, enviado, aoEnviar, aoOcupar }) {
  const api = useApiSaques()
  const entrada = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [progresso, setProgresso] = useState(null) // null = parado; 0 a 1 = enviando
  const [arrastando, setArrastando] = useState(false)
  const enviando = progresso !== null

  function escolher(f) {
    if (!f || enviando) return
    const problema = conferirArquivo(f)
    setErro(problema)
    if (problema) return
    if (enviado) aoEnviar(null) // o comprovante anterior deixa de valer
    setArquivo(f)
  }

  async function enviar() {
    setErro('')
    setProgresso(0)
    aoOcupar(true)
    const r = await api.enviar(saqueId, arquivo, setProgresso)
    aoOcupar(false)
    setProgresso(null)
    if (r.ok && r.dados?.caminho) aoEnviar(r.dados.caminho)
    else setErro(mensagemDoErro(r))
  }

  const pct = Math.round((progresso || 0) * 100)
  const escolhido = arquivo && (
    <div className="rounded border border-line bg-white p-3">
      <div className="flex items-center gap-3">
        <Miniatura arquivo={arquivo} />
        <div className="min-w-0 flex-1">
          <p title={arquivo.name} className="truncate text-[15px] font-semibold text-ink">{arquivo.name}</p>
          <p className="figs text-[13.5px] text-ink-muted">
            {tipoDoArquivo(arquivo)}, {tamanhoTexto(arquivo.size)}
          </p>
        </div>
        {enviado && <Icone nome="confere" tamanho={22} className="shrink-0 text-ink" />}
      </div>
      {enviando ? (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-label="Envio do comprovante"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1.5 overflow-hidden rounded-sm bg-mist"
          >
            <div className="h-full bg-signal transition-[width] duration-150 motion-reduce:transition-none" style={{ width: pct + '%' }} />
          </div>
          <p className="figs mt-1.5 text-[13.5px] text-ink-muted">Enviando, {pct}%</p>
        </div>
      ) : enviado ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14.5px] font-semibold text-ink">Comprovante enviado</p>
          <button type="button" onClick={() => entrada.current?.click()} className="link-quiet min-h-11 px-1 text-[14px] font-semibold">
            Trocar arquivo
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <button type="button" onClick={() => entrada.current?.click()} className="btn-quiet min-h-11 !px-5 !py-2.5 !text-[14.5px]">
            Trocar
          </button>
          <button type="button" onClick={enviar} className="btn-ink min-h-11 whitespace-nowrap !px-4 !py-2.5 !text-[14.5px]">
            Enviar comprovante
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <input
        ref={entrada}
        id={'comprovante-' + saqueId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => {
          escolher(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {arquivo ? (
        escolhido
      ) : (
        <label
          htmlFor={'comprovante-' + saqueId}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            escolher(e.dataTransfer.files?.[0])
          }}
          className={
            'flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed px-4 py-5 text-center transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ' +
            (arrastando ? 'border-ink bg-white' : 'border-mist-deep bg-paper hover:border-ink')
          }
        >
          <Icone nome="upload" tamanho={24} className="text-ink" />
          <span className="text-[15px] font-semibold text-ink">Escolher o comprovante</span>
          <span className="text-[14px] text-ink-muted">ou solte o arquivo aqui. PDF, JPG ou PNG, até 5 MB.</span>
        </label>
      )}
      {erro && (
        <p role="alert" className="mt-3 flex gap-2 text-[14.5px] leading-[1.5] text-signal-deep">
          <Icone nome="alerta" tamanho={18} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  )
}
