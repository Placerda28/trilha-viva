'use client'

import { usePathname } from 'next/navigation'
import MenuConta from '@/components/MenuConta'

// O menu fica no layout e não muda de página em página: quem marca "página
// atual" é o endereço. `ativo` só existe para a prévia (/dev-acervo).
const ATIVO = {
  '/minha-conta': 'inicio',
  '/minha-conta/acervo': 'acervo',
  '/minha-conta/pedidos': 'pedidos',
  '/minha-conta/conhecer-palco': 'conhecer',
  '/minha-conta/palco': 'baixar',
  '/minha-conta/assinatura': 'assinatura',
  '/minha-conta/dados': 'dados',
  '/minha-conta/afiliado': 'afiliado',
  '/minha-conta/ajuda': 'ajuda',
}

export default function MenuContaAuto({ ativo, ...resto }) {
  const caminho = (usePathname() || '').replace(/\/$/, '')
  return <MenuConta ativo={ativo || ATIVO[caminho] || 'inicio'} {...resto} />
}
