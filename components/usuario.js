'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'

// Quem está olhando o site, no navegador (as páginas são estáticas: o servidor
// não sabe). Uma resposta só, compartilhada por todos os componentes de cliente
// (cabeçalho, barra de compra, convites, menu da conta...).
//
//   const usuario = useUsuario()   // 'visitante' | 'sem-pacote' | 'com-pacote'
//
// Na primeira pintura (servidor e hidratação) é sempre 'visitante', para o HTML
// bater. Depois: lê o último valor de sessionStorage (a próxima página já nasce
// certa) e confirma em GET /api/conta/estado. A resposta do servidor sempre manda.
//
// Quem chama `useConsultarUsuario(pathname)` (só o cabeçalho) dispara a
// pergunta: uma vez por carregamento e de novo nas rotas em que o estado muda.
// Quem só usa `useUsuario()` apenas lê.

export const ESTADOS_USUARIO = ['visitante', 'sem-pacote', 'com-pacote']
const CHAVE = 'tv_usuario'
const ROTAS_QUE_MUDAM = ['/entrar', '/criar-senha', '/primeiro-acesso', '/recuperar', '/redefinir', '/sucesso', '/acervo', '/minha-conta']

let atual = 'visitante'
const ouvintes = new Set()

function definir(valor) {
  if (valor === atual) return
  atual = valor
  ouvintes.forEach((f) => f())
}
const assinar = (f) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

export function useUsuario() {
  return useSyncExternalStore(
    assinar,
    () => atual,
    () => 'visitante'
  )
}

// Para o botão "Sair": esquece o estado guardado.
export function esquecerUsuario() {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    /* sem sessionStorage */
  }
  definir('visitante')
}

const dentro = (pathname, rotas) => rotas.some((r) => pathname === r || pathname.startsWith(r + '/'))

export function useConsultarUsuario(pathname) {
  const jaPerguntou = useRef(false)

  useEffect(() => {
    if (jaPerguntou.current && !dentro(pathname, ROTAS_QUE_MUDAM)) return undefined
    let vivo = true
    if (!jaPerguntou.current) {
      try {
        const guardado = sessionStorage.getItem(CHAVE)
        if (ESTADOS_USUARIO.includes(guardado)) definir(guardado)
      } catch {
        /* sem sessionStorage: segue sem guardado */
      }
    }
    jaPerguntou.current = true
    fetch('/api/conta/estado', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !ESTADOS_USUARIO.includes(d.usuario)) return
        definir(d.usuario)
        try {
          sessionStorage.setItem(CHAVE, d.usuario)
        } catch {
          /* sem sessionStorage: segue sem guardar */
        }
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [pathname])
}
