'use client'

import { cn } from '@/lib/cn'
import { Aviso } from './Aviso'
import { Botao } from './Botao'
import { Icone } from './Icone'

// Os três estados de toda lista que vem do servidor (DESIGN.md / MUDANÇAS §0.10):
// carregando, vazio e erro. Use junto: a lista mostra um dos três até ter dados.
//
//   if (carregando) return <ListaCarregando />
//   if (erro) return <ListaErro onTentar={recarregar} />
//   if (!itens.length) return <ListaVazia titulo="Nenhum pedido ainda." acao={<Botao href="/assinar" variante="compra">…</Botao>} />

// Linhas cinza pulsando. A animação para com prefers-reduced-motion.
export function ListaCarregando({ linhas = 4, rotulo = 'Carregando…', className }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-2', className)}>
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-12 animate-pulse bg-surface-pressed motion-reduce:animate-none"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  )
}

// Ícone de 40 px, uma frase e UMA ação (a próxima coisa útil a fazer).
export function ListaVazia({ icone = 'inbox', titulo, descricao, acao, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <Icone nome={icone} tamanho={40} traco={1.5} className="text-text-3" />
      <p className="text-[17px] font-[650] text-ink">{titulo}</p>
      {descricao && <p className="max-w-[44ch] text-[15px] leading-[1.5] text-text-2">{descricao}</p>}
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}

// Aviso vermelho com "Tentar de novo".
export function ListaErro({
  titulo = 'Não deu para carregar.',
  children = 'Confira a sua conexão e tente de novo.',
  onTentar,
  className,
}) {
  return (
    <Aviso
      variante="erro"
      titulo={titulo}
      className={className}
      acao={
        onTentar && (
          <Botao variante="perigo" tamanho="sm" onClick={onTentar}>
            <Icone nome="recarregar" tamanho={16} />
            Tentar de novo
          </Botao>
        )
      }
    >
      {children}
    </Aviso>
  )
}
