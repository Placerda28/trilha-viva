'use client'

import { DropdownMenu } from 'radix-ui'
import AcaoGestao from './AcaoGestao'

// Ações de um lead: o menu "Ações" (só mostra o que cabe ao estado do lead) e o
// painel de confirmação que abre logo abaixo. A escolha no menu é o primeiro
// toque, o botão do painel é o segundo (mesmo padrão do Detalhe do cliente).
const ITEM =
  'flex h-11 cursor-default select-none items-center rounded-sm px-3 text-[14.5px] text-ink outline-none data-[highlighted]:bg-mist'

export function MenuLead({ lead, acoes, onEscolher, cheio = false }) {
  if (acoes.length === 0) return null
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={'Ações de ' + lead.nome}
          className={'btn-quiet h-11 min-w-11 shrink-0 !px-4 !py-0 !text-[14px] ' + (cheio ? 'w-full' : '')}
        >
          Ações
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-[70] min-w-[220px] rounded-md border border-line bg-white p-1">
          {acoes.map((a) => (
            <DropdownMenu.Item key={a.id} onSelect={() => onEscolher(a.id)} className={ITEM + (a.id === 'parar' ? ' text-signal-deep' : '')}>
              {a.rotulo}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const REGRA_ENVIO =
  ' Não sai na hora: sai na próxima rodada do robô (até 10 min). O WhatsApp só sai das 9h às 19h59 e só com o modelo aprovado na Meta.'

export function PainelLead({ acao, lead, aoFechar, aoFeito }) {
  const base = '/api/gestao/leads/' + lead.id
  if (acao === 'parar') {
    return (
      <AcaoGestao
        iniciaAberta
        onFechar={aoFechar}
        rotulo="Parar processo"
        explicacao={'Parar o processo de ' + lead.nome + '? Ele deixa de receber e-mail e WhatsApp e fica como Encerrado (Parado pela Gestão). Não dá para desfazer por aqui.'}
        confirmar="Parar processo"
        url={base + '/parar'}
        corpo={{}}
        onFeito={() => aoFeito(lead, 'parar')}
      />
    )
  }
  const zap = acao === 'whatsapp'
  const proximo = zap ? 'WhatsApp ' + (lead.etapa_whatsapp + 1) + ' de ' + lead.total_whatsapp : 'e-mail ' + (lead.etapa_email + 1) + ' de ' + lead.total_emails
  return (
    <AcaoGestao
      iniciaAberta
      onFechar={aoFechar}
      rotulo={zap ? 'Enviar WhatsApp agora' : 'Enviar e-mail agora'}
      explicacao={'Adianta para agora o ' + proximo + ' de ' + lead.nome + '.' + (zap ? REGRA_ENVIO : ' Não sai na hora: sai na próxima rodada do robô (até 10 min).')}
      confirmar={zap ? 'Enviar WhatsApp agora' : 'Enviar e-mail agora'}
      url={base + '/enviar-agora'}
      corpo={{ canal: zap ? 'whatsapp' : 'email' }}
      onFeito={() => aoFeito(lead, acao)}
    />
  )
}
