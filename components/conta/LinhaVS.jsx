'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icone } from '@/components/ds'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { detalheDaMusica, rotuloDaVersao, sigla } from './acervo-dados'

// Botão de baixar do desenho: contorno preto, vira preto no mouse. No celular só o ícone.
const BOTAO =
  'inline-flex min-h-11 min-w-11 shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-ink bg-white px-3 text-[15px] font-semibold leading-none text-ink transition-colors duration-150 hover:bg-ink hover:text-white active:border-ink-hover active:bg-ink-hover active:text-white motion-reduce:transition-none sm:px-4'
const BOTAO_PARADO =
  'pointer-events-none inline-flex min-h-11 min-w-11 shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-field-border bg-white px-3 text-[15px] font-semibold leading-none text-ink opacity-[.45] sm:px-4'

// O download é um link que o navegador segue (o arquivo vai direto para o
// disco), não um pedido em segundo plano: quem conta o limite é o servidor.
// `onBaixar` só atualiza o contador da tela. Sem versões extras: um link;
// com mais de uma: a pessoa escolhe a versão numa janela.
export function AcaoDownload({ musica, acabou, repetido, onBaixar }) {
  const [aberto, setAberto] = useState(false)
  const texto = repetido ? 'Baixar de novo' : 'Baixar'

  if (musica.variantes.length <= 1) {
    return (
      <a
        href={'/api/baixar?slug=' + musica.slug}
        onClick={(e) => (acabou ? e.preventDefault() : onBaixar(musica.slug))}
        aria-label={`${texto}: ${musica.title}`}
        aria-disabled={acabou || undefined}
        tabIndex={acabou ? -1 : undefined}
        title={acabou ? 'Limite de hoje atingido' : undefined}
        className={acabou ? BOTAO_PARADO : BOTAO}
      >
        <Icone nome="baixar" tamanho={18} />
        <span className="hidden sm:inline">{texto}</span>
      </a>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <button
        type="button"
        disabled={acabou}
        onClick={() => setAberto(true)}
        aria-label={`Escolher a versão de ${musica.title}`}
        className={acabou ? BOTAO_PARADO : BOTAO}
      >
        <Icone nome="baixar" tamanho={18} />
        <span className="hidden sm:inline">Escolher versão ({musica.variantes.length})</span>
      </button>
      <DialogContent className="max-w-[min(480px,calc(100vw-2rem))] gap-3.5 rounded-none border-ink p-6 shadow-[0_12px_32px_rgba(0,0,0,.25)]">
        <DialogTitle className="font-semi-condensed pr-10 text-[24px] font-bold leading-[1.1]">{musica.title}</DialogTitle>
        <p className="text-[15px] leading-[1.5] text-text-2">
          Escolha o arquivo. Cada download conta no limite de hoje.
        </p>
        <div className="flex flex-col gap-2">
          {musica.variantes.map((v, i) => (
            <a
              key={i}
              href={'/api/baixar?slug=' + musica.slug + '&i=' + i}
              onClick={() => {
                onBaixar(musica.slug)
                setAberto(false)
              }}
              className={BOTAO + ' justify-start'}
            >
              <Icone nome="baixar" tamanho={18} />
              {rotuloDaVersao(v, i)}
            </a>
          ))}
        </div>
        <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-control border border-ink bg-white px-[18px] text-[15px] font-semibold hover:bg-surface">
          Fechar
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function dataCurta(valor) {
  const d = new Date(String(valor).replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export default function LinhaVS({ musica, baixado, acabou, preparando, onBaixar }) {
  const detalhe = detalheDaMusica(musica)
  return (
    <li className="flex min-h-[76px] items-center gap-3.5 border-t border-line py-2">
      <span
        aria-hidden="true"
        className="font-semi-condensed flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-ink text-[16px] font-bold text-white"
      >
        {sigla(musica.title)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Link
          href={'/musicas/' + musica.slug}
          prefetch={false}
          className="-my-3 block py-3 text-[16px] font-semibold leading-[1.3] hover:underline hover:underline-offset-[3px]"
        >
          {musica.title}
        </Link>
        <span className="text-[14px] tabular-nums text-text-3">
          {musica.artist}
          {detalhe && ` · ${detalhe}`}
        </span>
        {baixado && dataCurta(baixado.ultimo) && (
          <span className="text-[13px] tabular-nums text-text-3">
            Baixada em {dataCurta(baixado.ultimo)}
            {baixado.vezes > 1 ? ` · ${baixado.vezes} vezes` : ''}
          </span>
        )}
      </span>
      {preparando ? (
        <span role="status" className="flex h-11 shrink-0 items-center gap-1.5 text-[14px] font-semibold text-text-2">
          <Icone nome="check" tamanho={18} traco={2} />
          Preparando…
        </span>
      ) : (
        <AcaoDownload musica={musica} acabou={acabou} repetido={Boolean(baixado)} onBaixar={onBaixar} />
      )}
    </li>
  )
}
