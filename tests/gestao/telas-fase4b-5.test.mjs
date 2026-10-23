import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as formato from '../../components/gestao/formato.js'

const require = createRequire(import.meta.url)
const swc = await require('next/dist/build/swc').loadBindings()

// Renderiza o componente real com os contratos da API, sem rede nem sessão.
async function renderizar(nome, dados, { erro = '', expandir = false } = {}) {
  const fonte = await readFile(new URL('../../components/gestao/' + nome + '.jsx', import.meta.url), 'utf8')
  const { code } = swc.transformSync(fonte, {
    filename: nome + '.jsx',
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  })
  const prova = { links: [], botoes: [], kpis: [], cliente: null }
  const componente = (f) => ({ __esModule: true, default: f })
  const modulos = {
    react: { ...React, useState: (v) => [typeof v === 'boolean' && expandir ? true : v, () => {}] },
    'react/jsx-runtime': {
      ...jsx,
      jsx: (tipo, props, chave) => {
        if (tipo === 'button') prova.botoes.push(props)
        return jsx.jsx(tipo, props, chave)
      },
      jsxs: (tipo, props, chave) => {
        if (tipo === 'button') prova.botoes.push(props)
        return jsx.jsxs(tipo, props, chave)
      },
    },
    'next/link': componente((props) => {
      prova.links.push(props)
      return React.createElement('a', { href: props.href }, props.children)
    }),
    './useGestao': { useGestao: (url) => { prova.url = url; return { dados, erro, carregando: false } } },
    './usePeriodo': { usePeriodo: () => ({ valido: true, de: '2026-10-01', ate: '2026-10-23' }) },
    './DetalheCliente': { useDetalhe: () => ({ abrir: (id) => { prova.cliente = id } }) },
    './formato': formato,
    './Casca': { CabecalhoPagina: () => null },
    './Estados': {
      Aviso: ({ erro: mensagem }) => React.createElement('p', { role: 'alert' }, mensagem),
      Esqueleto: () => React.createElement('p', null, 'Carregando'),
      Vazio: ({ titulo }) => React.createElement('p', null, titulo),
    },
    './Kpi': componente((props) => { prova.kpis.push(props); return null }),
    './Grafico': componente((props) => { prova.grafico = props; return null }),
    './Segmentos': componente(() => null),
  }
  const contexto = { exports: {}, require: (id) => {
    assert.ok(id in modulos, 'Dependência inesperada: ' + id)
    return modulos[id]
  } }
  vm.runInNewContext(code, contexto)
  prova.html = renderToStaticMarkup(React.createElement(contexto.exports.default))
  return prova
}

const downloads = {
  totais: { downloads: 8, clientes: 2, media: 4, na_cota_hoje: 1, limite_dia: 17 },
  serie: [{ chave: '2026-10-23', rotulo: '23/10', downloads: 8 }],
  top_musicas: [{ slug: 'musica-teste', downloads: 8, clientes: 2 }],
  top_clientes: [{ id: 42, nome: 'Cliente', email: 'cliente@example.com', downloads: 8, hoje: 3 }],
}

test('Downloads usa série numérica, cota da API, links sem prefetch e detalhe pelo id', async () => {
  const p = await renderizar('Downloads', downloads)
  assert.equal(p.url, '/api/gestao/downloads?de=2026-10-01&ate=2026-10-23&agrupar=dia')
  assert.equal(p.grafico.formato, 'numero')
  assert.equal(p.grafico.serie[0].valor, 8)
  assert.equal(p.kpis.length, 4)
  assert.equal(p.kpis[3].valor, '1')
  assert.match(p.kpis[3].detalhe, /17 downloads/)
  assert.match(p.html, /3 de 17/)
  assert.ok(p.links.every((l) => l.href === '/musicas/musica-teste' && l.prefetch === false))
  assert.ok(p.links.length > 0)
  p.botoes.find((b) => b.onClick).onClick()
  assert.equal(p.cliente, 42)
})

test('Downloads apresenta carregamento, falha e período sem downloads', async () => {
  assert.match((await renderizar('Downloads', null)).html, /Carregando/)
  assert.match((await renderizar('Downloads', null, { erro: 'Falha de conexão' })).html, /role="alert"/)
  const vazio = { ...downloads, totais: { ...downloads.totais, downloads: 0 }, top_musicas: [], top_clientes: [] }
  assert.match((await renderizar('Downloads', vazio)).html, /Nenhum download neste período/)
})

test('Campanhas preserva métricas indisponíveis dos anúncios, total e nomes escapados', async () => {
  const campanha = {
    registrado: true, fonte: 'instagram', campanha: '<script>alert(1)</script>',
    leads: 6, carrinhos: 4, vendas: 2, centavos: 17980, conversao: 50,
    anuncios: [{ anuncio: 'Anúncio A', carrinhos: 4, vendas: 2, centavos: 17980 }],
  }
  const total = { leads: 9, carrinhos: 7, vendas: 3, centavos: 26970, conversao: 42.86 }
  const p = await renderizar('Campanhas', { linhas: [campanha], total }, { expandir: true })
  assert.equal(p.url, '/api/gestao/campanhas?de=2026-10-01&ate=2026-10-23')
  assert.match(p.html, /Sem registro \(antes de 12\/10\)/)
  assert.match(p.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(p.html, /<script>/)
  const anuncio = p.html.match(/Anúncio: Anúncio A<\/th>(.*?)<\/tr>/s)?.[1]
  assert.ok(anuncio, 'O anúncio deve aparecer expandido')
  assert.equal((anuncio.match(/>—<\/td>/g) || []).length, 2)
  assert.match(p.html.match(/<tfoot.*?<\/tfoot>/s)?.[0] || '', /269,70/)
})
