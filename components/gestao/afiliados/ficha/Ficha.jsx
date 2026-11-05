'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs } from 'radix-ui'
import { dataBr } from '@/lib/afiliados-painel'
import { Aviso, Esqueleto } from '../../Estados'
import Icone from '../../Icone'
import { useBusca } from '../apiAfiliados'
import { NivelSelo, Status } from '../lista/Pecas'
import { classeAba } from '../SubAbas'
import FichaAcoes from './FichaAcoes'
import FichaDados from './FichaDados'
import { Extrato, Meses, Saques, Vendas } from './FichaHistoricos'
import { Anotacoes, HistoricoAcoes } from './FichaNotas'
import FichaPainel from './FichaPainel'

// A ficha de um afiliado (Gestão > Afiliados > Afiliados, com ?afiliado=<id>).
// Busca a ficha e as configurações juntas (a carência e o dia do fechamento
// entram nos cartões do mini painel). Depois de qualquer ação a ficha é
// buscada de novo, sem esconder a tela.

const ABAS = [
  ['meses', 'Meses'],
  ['vendas', 'Vendas'],
  ['saques', 'Saques'],
  ['extrato', 'Extrato'],
  ['anotacoes', 'Anotações'],
  ['historico', 'Histórico'],
]

function Topo({ a, painel, voltar }) {
  return (
    <header>
      <Link href={voltar} prefetch={false} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[14.5px] font-semibold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
        <Icone nome="direita" tamanho={16} className="rotate-180" />
        Voltar para a lista
      </Link>
      <h1 className="mt-1 break-words text-[26px] font-bold leading-[1.12] tracking-[-0.015em] text-ink">{a.nome}</h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-[14.5px] text-ink-muted">
          Código <span className="figs text-[16px] font-extrabold tracking-[0.02em] text-ink">{a.codigo}</span>
        </p>
        <Status status={a.status} />
        <NivelSelo nivel={painel.nivel} niveis={painel.niveis} tamanho={26} travado={Boolean(a.nivel_travado)} />
        {a.criado_em && <p className="text-[14px] text-ink-muted">Cadastro em {dataBr(a.criado_em)}</p>}
      </div>
    </header>
  )
}

export default function Ficha({ id, master, voltar }) {
  const [tentativa, setTentativa] = useState(0)
  const [aberta, setAberta] = useState(null)
  const { dados, erro } = useBusca(async (api, sinal) => {
    const [f, c] = await Promise.all([api.ficha(id, sinal), api.config(sinal)])
    // 404 com texto = afiliado inexistente; 404 sem texto = sessão caída (a casca mostra "entre de novo").
    if (!f.ok) return f.status === 404 && f.dados?.erro ? { ok: false, status: 409, dados: f.dados } : f
    return { ...f, dados: { ...f.dados, config: c.ok ? c.dados : null } }
  }, [id, tentativa])
  const atualizar = () => setTentativa((n) => n + 1)

  if (erro) {
    return (
      <section aria-label="Ficha do afiliado">
        <Link href={voltar} prefetch={false} className="link-signal min-h-11">
          Voltar para a lista
        </Link>
        <Aviso erro={erro} onTentar={atualizar} />
      </section>
    )
  }
  if (!dados || String(dados.afiliado?.id) !== String(id)) {
    return (
      <section aria-label="Ficha do afiliado">
        <Esqueleto linhas={5} />
      </section>
    )
  }

  const { afiliado: a, painel } = dados
  return (
    <section aria-label={`Ficha de ${a.nome}`} className="space-y-6">
      <Topo a={a} painel={painel} voltar={voltar} />
      <FichaAcoes afiliado={a} painel={painel} master={master} aoMudou={atualizar} aberta={aberta} setAberta={setAberta} />
      <FichaDados afiliado={a} />
      <FichaPainel painel={painel} config={dados.config} nome={a.nome} />

      <Tabs.Root defaultValue="meses">
        <Tabs.List aria-label="Histórico do afiliado" className="-mx-4 flex overflow-x-auto border-b border-line px-1 md:mx-0 md:px-0">
          {ABAS.map(([v, rotulo]) => (
            <Tabs.Trigger key={v} value={v} className={classeAba(false) + ' data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-signal'}>
              {rotulo}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="card-line mt-3 px-4 pb-2 sm:px-6">
          <Tabs.Content value="meses" tabIndex={-1} className="focus:outline-none"><Meses itens={dados.historico_mensal} niveis={painel.niveis} /></Tabs.Content>
          <Tabs.Content value="vendas" tabIndex={-1} className="focus:outline-none"><Vendas itens={dados.vendas_recentes} /></Tabs.Content>
          <Tabs.Content value="saques" tabIndex={-1} className="focus:outline-none"><Saques itens={dados.saques} /></Tabs.Content>
          <Tabs.Content value="extrato" tabIndex={-1} className="focus:outline-none"><Extrato itens={dados.extrato} /></Tabs.Content>
          <Tabs.Content value="anotacoes" tabIndex={-1} className="focus:outline-none"><Anotacoes itens={dados.anotacoes} aoAnotar={() => setAberta('anotar')} /></Tabs.Content>
          <Tabs.Content value="historico" tabIndex={-1} className="focus:outline-none"><HistoricoAcoes itens={dados.historico_acoes} /></Tabs.Content>
        </div>
      </Tabs.Root>
    </section>
  )
}
