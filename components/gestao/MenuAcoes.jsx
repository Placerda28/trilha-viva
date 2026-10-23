'use client'

import { DropdownMenu } from 'radix-ui'
import AcaoGestao from './AcaoGestao'
import CorrigirEmail from './CorrigirEmail'
import Icone from './Icone'

// O botão "Ações" do Detalhe do cliente (plano 2.6). A escolha no menu só
// avisa o Detalhe (`onEscolher`): quem confirma em dois toques é o AcaoGestao,
// que o Detalhe abre logo abaixo do topo. O menu mostra o que cabe ao estado
// do cliente: "Desmarcar teste" só para quem é teste, "Liberar acesso" só para
// quem está bloqueado.
const ITEM =
  'flex h-11 cursor-default select-none items-center rounded-sm px-3 text-[14.5px] text-ink outline-none data-[highlighted]:bg-mist'

export function acoesDoCliente(c) {
  return [
    { id: 'acesso', rotulo: 'Reenviar acesso' },
    { id: 'email', rotulo: 'Corrigir e-mail' },
    c.teste ? { id: 'sem_teste', rotulo: 'Desmarcar teste' } : { id: 'teste', rotulo: 'Marcar como teste' },
    c.bloqueado ? { id: 'liberar', rotulo: 'Liberar acesso' } : { id: 'bloquear', rotulo: 'Bloquear acesso' },
  ]
}

export default function MenuAcoes({ cliente, onEscolher, compacto = false }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={compacto ? 'Ações de ' + (cliente.nome || cliente.email) : undefined}
          onClick={(e) => e.stopPropagation()}
          className="btn-quiet h-11 min-w-11 shrink-0 !gap-1.5 !px-3 !py-0 !text-[14px]"
        >
          {compacto ? '⋯' : <>Ações <Icone nome="baixo" tamanho={16} /></>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="z-[70] min-w-[210px] rounded-md border border-line bg-white p-1"
        >
          {acoesDoCliente(cliente).map((a) => (
            <DropdownMenu.Item key={a.id} onSelect={() => onEscolher(a.id)} className={ITEM}>
              {a.rotulo}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Os painéis de confirmação de cada ação: a escolha no menu é o primeiro toque,
// o botão do painel é o segundo.
export function PainelAcao({ acao, c, aoFechar, aoFeito, aoCorrigir }) {
  const comum = { iniciaAberta: true, onFechar: aoFechar }
  const corpoTeste = (teste) => ({ id: c.id, teste })
  if (acao === 'acesso') {
    return (
      <AcaoGestao
        {...comum}
        rotulo="Reenviar acesso"
        explicacao={'Manda para ' + c.email + ' o e-mail de criar a senha (ou de redefinir, se a pessoa já criou). Só reenvie se ela pediu ou não recebeu.'}
        confirmar="Reenviar acesso"
        url="/api/gestao/clientes/acesso"
        corpo={{ id: c.id }}
        onFeito={(r) => aoFeito('Acesso enviado para ' + r.para + '.')}
      />
    )
  }
  if (acao === 'email') {
    return <CorrigirEmail iniciaAberto onFechar={aoFechar} c={{ id: c.id, email: c.email }} onMudou={aoCorrigir} />
  }
  if (acao === 'teste') {
    return (
      <AcaoGestao
        {...comum}
        rotulo="Marcar como teste"
        explicacao="As compras deste cliente saem de todos os números, somem da lista e os lembretes do mesmo e-mail param. O acesso ao acervo continua. Isso não devolve o dinheiro: o reembolso é feito no painel do Mercado Pago."
        confirmar="Marcar como teste"
        url="/api/gestao/clientes/teste"
        corpo={corpoTeste(true)}
        onFeito={() => aoFeito('Cliente marcado como teste.', true)}
      />
    )
  }
  if (acao === 'sem_teste') {
    return (
      <AcaoGestao
        {...comum}
        rotulo="Desmarcar teste"
        explicacao="A compra volta a contar nos números e na lista. Os lembretes que já pararam não voltam."
        confirmar="Desmarcar teste"
        url="/api/gestao/clientes/teste"
        corpo={corpoTeste(false)}
        onFeito={() => aoFeito('Teste desmarcado.', true)}
      />
    )
  }
  if (acao === 'bloquear') {
    return (
      <AcaoGestao
        {...comum}
        rotulo="Bloquear acesso"
        explicacao="O cliente perde a entrada e o download na hora. A venda continua contando. Dá para liberar depois."
        confirmar="Bloquear acesso"
        url="/api/gestao/clientes/bloqueio"
        corpo={{ id: c.id, bloqueado: true }}
        onFeito={() => aoFeito('Acesso bloqueado.', true)}
      />
    )
  }
  return (
    <AcaoGestao
      {...comum}
      rotulo="Liberar acesso"
      explicacao="O cliente volta a entrar e a baixar na hora."
      confirmar="Liberar acesso"
      url="/api/gestao/clientes/bloqueio"
      corpo={{ id: c.id, bloqueado: false }}
      onFeito={() => aoFeito('Acesso liberado.', true)}
    />
  )
}

