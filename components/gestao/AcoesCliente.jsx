'use client'

import AcaoGestao from './AcaoGestao'

// Ações da aba Clientes: marcar como teste e bloquear o acesso. São coisas
// diferentes: o teste sai dos números e não recebe lembrete; o bloqueado
// continua contando como venda, só perde o acesso ao acervo.
export default function AcoesCliente({ c, onMudou }) {
  return (
    <span className="mt-0.5 flex flex-wrap gap-x-4">
      {c.teste ? (
        <AcaoGestao
          rotulo="Desmarcar teste"
          explicacao="A compra volta a contar nos números e na lista. Os lembretes que já pararam não voltam."
          confirmar="Desmarcar teste"
          url="/api/gestao/clientes/teste"
          corpo={{ id: c.id, teste: false }}
          onFeito={onMudou}
        />
      ) : (
        <AcaoGestao
          rotulo="Marcar como teste"
          explicacao="As compras deste cliente saem de todos os números, somem da lista e os lembretes do mesmo e-mail param. O acesso ao acervo continua. Isso não devolve o dinheiro: o reembolso é feito no painel do Mercado Pago."
          confirmar="Marcar como teste"
          url="/api/gestao/clientes/teste"
          corpo={{ id: c.id, teste: true }}
          onFeito={onMudou}
        />
      )}
      {c.bloqueado ? (
        <AcaoGestao
          rotulo="Liberar acesso"
          explicacao="O cliente volta a entrar e a baixar na hora."
          confirmar="Liberar acesso"
          url="/api/gestao/clientes/bloqueio"
          corpo={{ id: c.id, bloqueado: false }}
          onFeito={onMudou}
        />
      ) : (
        <AcaoGestao
          rotulo="Bloquear acesso"
          explicacao="O cliente perde a entrada e o download na hora. A venda continua contando. Dá para liberar depois."
          confirmar="Bloquear acesso"
          url="/api/gestao/clientes/bloqueio"
          corpo={{ id: c.id, bloqueado: true }}
          onFeito={onMudou}
        />
      )}
    </span>
  )
}
