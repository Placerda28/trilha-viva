'use client'

import { Suspense, useState } from 'react'
import { usePeriodo } from './usePeriodo'
import { CabecalhoPagina } from './Casca'
import { useGestao } from './useGestao'
import { Aviso, Esqueleto, Vazio, Paginacao } from './Estados'
import { dataHora, numero } from './formato'

const POR_PAGINA = 50

// Frase de cada ação, para a lista ler como um diário e não como um log.
export const ACOES = {
  compra_teste_marcada: 'marcou como teste as compras de',
  compra_teste_desmarcada: 'desmarcou como teste as compras de',
  carrinho_teste_marcado: 'marcou como teste o carrinho de',
  carrinho_teste_desmarcado: 'desmarcou como teste o carrinho de',
  lembretes_parados: 'parou os lembretes de',
  contato_teste_adicionado: 'adicionou o contato de teste',
  contato_teste_removido: 'removeu o contato de teste',
  cupom_criado: 'criou o cupom',
  cupom_desativado: 'desativou o cupom',
  membro_adicionado: 'adicionou à equipe',
  membro_removido: 'removeu da equipe',
  acervo_liberado: 'liberou o acervo para',
  acervo_retirado: 'tirou o acervo de',
  senha_trocada: 'trocou a própria senha',
  cliente_bloqueado: 'bloqueou o cliente',
  cliente_liberado: 'liberou o cliente',
  whatsapp_respondido: 'respondeu no WhatsApp',
  whatsapp_anexo: 'mandou anexo no WhatsApp',
  whatsapp_retomado: 'chamou de novo no WhatsApp (pago)',
  cliente_email_corrigido: 'corrigiu o e-mail do cliente para',
  acesso_reenviado: 'reenviou o acesso para',
  whatsapp_pausar: 'pausou o WhatsApp',
  whatsapp_retomar: 'retomou o WhatsApp',
  whatsapp_ligar: 'ligou o WhatsApp',
  whatsapp_sequencia_parar: 'parou a sequência de WhatsApp',
  whatsapp_sequencia_retomar: 'retomou a sequência de WhatsApp',
}

function Linha({ r }) {
  const frase = ACOES[r.acao] || 'fez uma ação na gestão'
  const mostrarAlvo = r.alvo && r.acao !== 'senha_trocada'
  return (
    <li className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="figs shrink-0 text-[13px] text-ink-muted sm:w-[140px]">{dataHora(r.quando)}</span>
      <span className="min-w-0 text-[14.5px] text-ink">
        <span className="break-words font-semibold">{r.quem}</span> {frase}
        {mostrarAlvo && (
          <>
            {' '}
            <span className="break-words font-semibold">{r.alvo}</span>
          </>
        )}
        {r.acao === 'cliente_email_corrigido' && r.detalhe?.de && (
          <span className="block break-all text-[13px] text-ink-muted">antes: {r.detalhe.de}</span>
        )}
        {r.acao === 'membro_adicionado' && r.detalhe?.conta_existente && (
          <span className="text-ink-muted"> (já tinha conta)</span>
        )}
      </span>
    </li>
  )
}

const GRUPOS = [
  ['Cupons', ['cupom_criado', 'cupom_desativado']],
  ['Clientes', ['cliente_bloqueado', 'cliente_liberado', 'cliente_email_corrigido', 'acesso_reenviado']],
  ['Carrinhos', ['lembretes_parados']],
  ['Equipe', ['membro_adicionado', 'membro_removido', 'acervo_liberado', 'acervo_retirado', 'senha_trocada']],
  ['Testes', ['compra_teste_marcada', 'compra_teste_desmarcada', 'carrinho_teste_marcado', 'carrinho_teste_desmarcado', 'contato_teste_adicionado', 'contato_teste_removido']],
  ['WhatsApp', ['whatsapp_respondido', 'whatsapp_anexo', 'whatsapp_retomado', 'whatsapp_pausar', 'whatsapp_retomar', 'whatsapp_ligar', 'whatsapp_sequencia_parar', 'whatsapp_sequencia_retomar']],
]

export default function Registro() {
  return <Suspense fallback={<Esqueleto linhas={5} />}><RegistroComPeriodo /></Suspense>
}

function RegistroComPeriodo() {
  const periodo = usePeriodo()
  return <ListaRegistro key={periodo.de + periodo.ate} periodo={periodo} />
}

function ListaRegistro({ periodo }) {
  const [pagina, setPagina] = useState(1)
  const [tentativa, setTentativa] = useState(0)
  const [quem, setQuem] = useState('')
  const [tipo, setTipo] = useState('')
  const consulta = new URLSearchParams({ pagina, quem, tipo, de: periodo.de, ate: periodo.ate })
  const { dados, erro, carregando } = useGestao(periodo.valido ? '/api/gestao/registro?' + consulta : null, tentativa)
  const campo = 'mt-1 min-h-[44px] w-full rounded border border-line bg-white px-3 text-[14px] text-ink'


  return (
    <section aria-label="Registro de ações">
      <CabecalhoPagina titulo="Registro de ações" texto="Tudo que a equipe mexeu na gestão." comPeriodo />
      {dados && <p className="figs text-[14px] text-ink-muted">{numero(dados.total)} ações no período</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-[13px] text-ink-muted">Quem
          <select className={campo} value={quem} onChange={(e) => { setQuem(e.target.value); setPagina(1) }}>
            <option value="">Toda a equipe</option>
            {(dados?.quem_opcoes || []).map((email) => <option key={email} value={email}>{email}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-[13px] text-ink-muted">Tipo
          <select className={campo} value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1) }}>
            <option value="">Todas as ações</option>
            {GRUPOS.map(([grupo, acoes]) => <optgroup key={grupo} label={grupo}>
              {acoes.map((acao) => <option key={acao} value={acao}>{ACOES[acao]}</option>)}
            </optgroup>)}
          </select>
        </label>
      </div>
      {!periodo.valido && <p role="alert" className="mt-3 text-[14px] text-signal-deep">{periodo.erro}</p>}
      {erro ? (
        <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
      ) : !dados ? (
        periodo.valido && <Esqueleto linhas={5} />
      ) : dados.itens.length === 0 ? (
        <Vazio titulo="Nada registrado ainda" texto="Criar ou desativar um cupom, ou mexer na equipe, aparece aqui." />
      ) : (
        <div className={carregando ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-white">
            {dados.itens.map((r) => (
              <Linha key={r.id} r={r} />
            ))}
          </ul>
          <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={dados.total} onIr={setPagina} />
        </div>
      )}
    </section>
  )
}
