'use client'

import { useRef, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { dataHora } from './formato'
import SequenciaWhatsapp from './SequenciaWhatsapp'
import AcaoGestao, { SeloTeste } from './AcaoGestao'

// Tabela da aba Recuperação (no celular, uma lista): a pessoa, os 4 e-mails,
// a sequência de WhatsApp e a situação de cada carrinho.

const TOTAL_EMAILS = 4

// O que cada e-mail da sequência é, para o texto de ajuda e para o "próximo".
const QUANDO = { 1: '1 hora depois', 2: '7 dias depois do 1º', 3: '15 dias depois do 2º', 4: '30 dias depois do 3º' }

const MOTIVO = {
  sequencia: 'Recebeu os 4 e-mails e não comprou',
  descadastro: 'Pediu para não receber lembretes',
  comprou: 'Já tinha comprado por outro caminho',
  teste: 'Marcado como teste',
  gestao: 'Lembretes parados pela gestão',
}

// (11) 98765-4321 a partir dos dígitos que o servidor guarda.
function celular(digitos) {
  const d = String(digitos || '')
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return d
}

function Situacao({ p }) {
  const base = 'inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold leading-snug'
  if (p.situacao === 'recuperado') {
    return (
      <span className={base + ' bg-signal-deep text-white'}>
        {p.recuperado_pelo_canal === 'whatsapp'
          ? 'Comprou após o WhatsApp'
          : 'Comprou após o ' + (p.recuperado_pela_etapa || 1) + 'º e-mail'}
      </span>
    )
  }
  if (p.situacao === 'comprou_sem_lembrete') {
    return <span className={base + ' border border-line text-ink-muted'}>Comprou antes do lembrete</span>
  }
  if (p.situacao === 'finalizado') {
    return <span className={base + ' bg-ink text-white'}>Protocolo finalizado</span>
  }
  if (p.situacao === 'andamento') {
    return <span className={base + ' border border-ink text-ink'}>Em recuperação</span>
  }
  if (p.situacao === 'aguardando') {
    return <span className={base + ' border border-ink text-ink'}>Aguardando 1º e-mail</span>
  }
  return <span className={base + ' border border-line text-ink-muted'}>Sem envio</span>
}

// Detalhe abaixo da situação: quando comprou, por que encerrou, por que não
// recebeu nada.
function DetalheSituacao({ p }) {
  let texto = ''
  if (p.situacao === 'recuperado' || p.situacao === 'comprou_sem_lembrete') texto = 'Pago em ' + dataHora(p.pago_em)
  else if (p.situacao === 'finalizado') {
    texto = (MOTIVO[p.finalizado_motivo] || 'Encerrado') + (p.finalizado_em ? ' · ' + dataHora(p.finalizado_em) : '')
  } else if (p.situacao === 'sem_envio') texto = 'Já era cliente, carrinho repetido ou passou do prazo'
  if (!texto) return null
  return <span className="figs mt-1 block text-[12.5px] text-ink-muted">{texto}</span>
}

// Os 4 e-mails como quatro casas: cheia = enviado, contorno = o próximo,
// apagada = ainda não. Embaixo, em texto, o que aconteceu e o que vem.
function Emails({ p }) {
  const enviados = new Map((p.emails || []).map((e) => [e.etapa, e.enviado_em]))
  const proxima = p.proxima_etapa
  return (
    <div>
      <ol className="flex gap-1" aria-label={enviados.size + ' de ' + TOTAL_EMAILS + ' e-mails enviados'}>
        {Array.from({ length: TOTAL_EMAILS }, (_, i) => {
          const etapa = i + 1
          const em = enviados.get(etapa)
          const cls = em
            ? 'border-ink bg-ink text-white'
            : etapa === proxima
              ? 'border-ink text-ink'
              : 'border-line text-ink-faint'
          return (
            <li
              key={etapa}
              title={em ? etapa + 'º e-mail enviado em ' + dataHora(em) : etapa + 'º e-mail: ' + QUANDO[etapa]}
              className={'figs flex h-6 w-6 items-center justify-center rounded-sm border text-[12px] font-semibold ' + cls}
            >
              {etapa}
            </li>
          )
        })}
      </ol>
      <ul className="figs mt-1.5 space-y-0.5 text-[12.5px] text-ink-muted">
        {(p.emails || []).map((e) => (
          <li key={e.etapa}>
            {e.etapa}º enviado {dataHora(e.enviado_em)}
          </li>
        ))}
        {p.situacao === 'aguardando' && <li>1º sai cerca de 1 hora após o carrinho</li>}
        {p.situacao === 'andamento' && p.proximo_email_em && (
          <li className="text-ink">
            {proxima ? proxima + 'º previsto ' : 'Encerra '}
            {dataHora(p.proximo_email_em)}
          </li>
        )}
      </ul>
    </div>
  )
}

// A sequência (até 9 mensagens) no mesmo desenho dos e-mails. Sem nenhuma
// mensagem e sem previsão, um texto curto diz por quê. Enquanto o WhatsApp
// não estiver ligado, a rota devolve "desligado" no lugar de previsto.
const WHATSAPP_OUTROS = {
  sem_celular: 'Sem WhatsApp',
  comprou: 'Comprou antes',
  falhou: 'Não foi entregue',
  nao_enviado: 'Não enviado',
  desligado: 'Desligado',
}

function Whatsapp({ p }) {
  const w = p.whatsapp || {}
  if ((w.mensagens || []).length || w.proximo_em) return <SequenciaWhatsapp w={w} />
  return <span className="text-[13.5px] text-ink-muted">{WHATSAPP_OUTROS[w.situacao] || '—'}</span>
}

// Na Recuperação: marcar o carrinho como teste (sai dos números e para os
// lembretes) ou só parar os lembretes de uma pessoa real (continua contando).
function AcoesCarrinho({ p, onMudou }) {
  const [acao, setAcao] = useState(null)
  const gatilho = useRef(null)
  const andando = p.situacao === 'andamento' || p.situacao === 'aguardando' || (p.whatsapp?.proximo_em && !p.pago_em)
  const teste = p.teste ? 'Desmarcar teste' : 'Marcar como teste'
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button ref={gatilho} type="button" aria-label={'Ações de ' + p.email} className="btn-quiet h-11 min-w-11 !px-3 !py-0">⋯</button></DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-[70] rounded-md border border-line bg-white p-1">
            <DropdownMenu.Item onSelect={() => setAcao('teste')} className="flex min-h-11 cursor-default items-center px-3 text-sm outline-none data-[highlighted]:bg-mist">{teste}</DropdownMenu.Item>
            {!p.teste && andando && <DropdownMenu.Item onSelect={() => setAcao('parar')} className="flex min-h-11 cursor-default items-center px-3 text-sm outline-none data-[highlighted]:bg-mist">Parar lembretes</DropdownMenu.Item>}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Dialog open={Boolean(acao)} onOpenChange={(aberto) => { if (!aberto) setAcao(null) }}>
        <DialogContent onCloseAutoFocus={(e) => { e.preventDefault(); gatilho.current?.focus() }} className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto [&>button]:h-11 [&>button]:w-11">
          <DialogTitle>{acao === 'parar' ? 'Parar lembretes' : teste}</DialogTitle>
          <DialogDescription className="break-all">{p.email}</DialogDescription>
          {acao && <AcaoGestao key={acao} iniciaAberta rotulo={acao === 'parar' ? 'Parar lembretes' : teste}
            explicacao={acao === 'parar' ? 'Esta pessoa não recebe mais nenhum e-mail nem WhatsApp de lembrete. Ela continua contando nos números.' : p.teste ? 'O carrinho volta a contar. Os lembretes que já pararam não voltam.' : 'Os carrinhos e compras deste e-mail saem dos números e todos os lembretes (e-mail e WhatsApp) param.'}
            confirmar={acao === 'parar' ? 'Parar lembretes' : teste}
            url={'/api/gestao/recuperacao/' + (acao === 'parar' ? 'parar' : 'teste')}
            corpo={acao === 'parar' ? { email: p.email } : { email: p.email, teste: !p.teste }}
            onFechar={() => setAcao(null)} onFeito={onMudou} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Lembretes({ p }) {
  return (
    <Dialog>
      <DialogTrigger asChild><button type="button" className="min-h-11 text-left text-[13px] underline decoration-line underline-offset-4">
        E-mail {(p.emails || []).length}/4 · WhatsApp {p.whatsapp?.enviadas || 0}/{p.whatsapp?.total || 9}
      </button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto [&>button]:h-11 [&>button]:w-11">
        <DialogTitle>Lembretes</DialogTitle>
        <DialogDescription className="break-all">{p.nome || p.email}</DialogDescription>
        <h3 className="font-semibold">E-mail</h3><Emails p={p} />
        <h3 className="font-semibold">WhatsApp</h3><Whatsapp p={p} />
      </DialogContent>
    </Dialog>
  )
}

function Origem({ p }) {
  return <span className="break-all text-[13px] text-ink-muted">{[p.utm_source, p.utm_campaign].filter(Boolean).join(' / ') || 'Sem registro'}</span>
}

function Pessoa({ p }) {
  const tel = celular(p.telefone)
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-all font-semibold text-ink">{p.nome || 'Sem nome'}</span>
        {p.teste && <SeloTeste />}
      </span>
      <span className="block break-all text-[13.5px] text-ink-muted">{p.email}</span>
      {tel ? (
        <a
          href={'https://wa.me/55' + p.telefone}
          target="_blank"
          rel="noopener noreferrer"
          className="figs mt-0.5 inline-flex min-h-11 items-center text-[13.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          title="Abrir conversa no WhatsApp"
        >
          {tel}
        </a>
      ) : (
        <span className="mt-0.5 block text-[13px] text-ink-faint">Sem celular</span>
      )}
    </>
  )
}

export default function Tabela({ itens, onMudou }) {
  return (
    <>
      <div className="mt-6 hidden rounded border border-line bg-white xl:block">
        <table className="w-full table-fixed text-left text-[14px]">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-[12.5px] text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Pessoa</th>
              <th scope="col" className="px-4 py-3 font-semibold">Carrinho</th>
              <th scope="col" className="px-4 py-3 font-semibold">Origem</th>
              <th scope="col" className="px-4 py-3 font-semibold">Lembretes</th>
              <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
              <th scope="col" className="w-20 px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((p) => (
              <tr key={p.email} className="align-top">
                <td className="max-w-[300px] px-4 py-3.5">
                  <Pessoa p={p} onMudou={onMudou} />
                </td>
                <td className="figs px-4 py-3.5 text-ink-muted">{dataHora(p.criado_em)}</td>
                <td className="px-4 py-3.5">
                  <Origem p={p} />
                </td>
                <td className="px-4 py-3.5">
                  <Lembretes p={p} />
                </td>
                <td className="max-w-[240px] px-4 py-3.5">
                  <Situacao p={p} />
                  <DetalheSituacao p={p} />
                </td>
                <td className="px-4 py-3.5"><AcoesCarrinho p={p} onMudou={onMudou} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 divide-y divide-line rounded border border-line bg-white xl:hidden">
        {itens.map((p) => (
          <li key={p.email} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Pessoa p={p} onMudou={onMudou} />
              </div>
              <AcoesCarrinho p={p} onMudou={onMudou} />
            </div>
            <Situacao p={p} />
            <DetalheSituacao p={p} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px]">
              <div className="col-span-2">
                <dt className="mb-1 text-ink-muted">Lembretes</dt>
                <dd>
                  <Lembretes p={p} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-1 text-ink-muted">Origem</dt>
                <dd>
                  <Origem p={p} />
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Carrinho</dt>
                <dd className="figs text-ink">{dataHora(p.criado_em)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
