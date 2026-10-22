import Link from 'next/link'
import Icone from './Icone'

// "Precisa de você": só o que tem número maior que zero e pede uma ação. Cada
// linha leva ao lugar onde se resolve.

function plural(n, um, varios) {
  return n + ' ' + (n === 1 ? um : varios)
}

// Dias que faltam até `fim` (ISO, como vem da rota) contados de `agora` (ISO), arredondando para cima.
function diasAte(fim, agora) {
  return Math.ceil((Date.parse(fim) - Date.parse(agora)) / 86400000)
}

// Transforma o JSON de /api/gestao/avisos (plano 4.1) na lista da tela.
// `agora` é o instante da leitura (ISO). A ordem é a de urgência.
export function avisosDaApi(d, agora) {
  if (!d) return []
  const lista = []
  if (d.whatsapp_esperando > 0) {
    lista.push({
      id: 'whatsapp',
      icone: 'whatsapp',
      texto: plural(d.whatsapp_esperando, 'conversa esperando resposta', 'conversas esperando resposta') + ' no WhatsApp',
      acao: 'Ver conversas',
      href: '/gestao/recuperacao/whatsapp',
    })
  }
  // estado vem de whatsapp_estado (aguardando_modelo, teste_enviado, ativo, pausado) e
  // modelo_status é o da Meta (PENDING, APPROVED, REJECTED...). Esperar a Meta
  // aprovar não pede ação do Paulo; recusa, pausa e "falta ligar" pedem.
  const robo = d.robo || {}
  const link = '/gestao/recuperacao/whatsapp'
  if (['REJECTED', 'DISABLED', 'PAUSED'].includes(String(robo.modelo_status || '').toUpperCase())) {
    lista.push({ id: 'modelo', icone: 'robo', texto: 'A Meta recusou o modelo de mensagem do robô', acao: 'Ver o robô', href: link })
  } else if (robo.estado === 'pausado') {
    lista.push({ id: 'robo', icone: 'robo', texto: 'O robô do WhatsApp está pausado', acao: 'Ver o robô', href: link })
  } else if (robo.estado === 'teste_enviado') {
    lista.push({ id: 'robo', icone: 'robo', texto: 'O teste do robô do WhatsApp foi enviado: falta ligar', acao: 'Ver o robô', href: link })
  }
  if (d.sem_senha_48h > 0) {
    lista.push({
      id: 'sem-senha',
      icone: 'clientes',
      texto: plural(d.sem_senha_48h, 'compra paga sem senha criada', 'compras pagas sem senha criada') + ' há mais de 48 h',
      acao: 'Ver clientes',
      href: '/gestao/clientes',
    })
  }
  if (d.meta_falhou_30d > 0) {
    lista.push({
      id: 'meta',
      icone: 'alerta',
      texto: plural(d.meta_falhou_30d, 'compra não chegou', 'compras não chegaram') + ' à Meta',
      acao: 'Ver vendas',
      href: '/gestao/periodo',
    })
  }
  for (const c of d.cupons_vencendo || []) {
    const dias = diasAte(c.valido_ate, agora)
    lista.push({
      id: 'vence-' + c.codigo,
      icone: 'cupons',
      texto: 'O cupom ' + c.codigo + (dias <= 0 ? ' vence hoje' : ' vence em ' + plural(dias, 'dia', 'dias')),
      acao: 'Ver cupons',
      href: '/gestao/cupons',
    })
  }
  for (const c of d.cupons_esgotando || []) {
    lista.push({
      id: 'esgota-' + c.codigo,
      icone: 'cupons',
      texto: 'O cupom ' + c.codigo + ' está quase esgotado (' + c.usos + ' de ' + c.limite + ' usos)',
      acao: 'Ver cupons',
      href: '/gestao/cupons',
    })
  }
  if (d.membros_sem_trocar > 0) {
    lista.push({
      id: 'equipe',
      icone: 'equipe',
      texto: plural(d.membros_sem_trocar, 'pessoa da equipe ainda não trocou', 'pessoas da equipe ainda não trocaram') + ' a senha',
      acao: 'Ver equipe',
      href: '/gestao/equipe',
    })
  }
  return lista
}

// `estado`: 'ok' mostra a lista; 'carregando' e 'erro' avisam por que não há lista
// (sem isso, "Nada pendente" apareceria antes de os avisos chegarem).
export default function Avisos({ avisos, estado = 'ok' }) {
  return (
    <section aria-labelledby="precisa-de-voce" className="rounded-md border border-line bg-white">
      <div className="flex items-center gap-2.5 px-4 pb-1 pt-4 sm:px-5 sm:pt-5">
        <h2 id="precisa-de-voce" className="text-[16px] font-bold tracking-[-0.01em] text-ink">
          Precisa de você
        </h2>
        {avisos.length > 0 && (
          <span className="figs grid h-[18px] min-w-[18px] place-items-center rounded-sm bg-signal px-1 text-[11px] font-bold leading-none text-white">
            {avisos.length}
          </span>
        )}
      </div>

      {estado === 'carregando' ? (
        <div aria-hidden="true" className="space-y-2.5 px-4 pb-5 pt-3 sm:px-5">
          <div className="h-4 w-3/5 rounded-sm bg-mist" />
          <div className="h-4 w-2/5 rounded-sm bg-mist/70" />
        </div>
      ) : estado === 'erro' ? (
        <p role="alert" className="px-4 pb-5 pt-2 text-[14.5px] text-ink-muted sm:px-5">
          Não consegui ver os avisos agora. Atualize a página para tentar de novo.
        </p>
      ) : avisos.length === 0 ? (
        <p className="px-4 pb-5 pt-2 text-[14.5px] text-ink-muted sm:px-5">Nada pendente.</p>
      ) : (
        <ul className="mt-2">
          {avisos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border-t border-line px-4 py-3 sm:gap-4 sm:px-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-paper text-ink">
                <Icone nome={a.icone} tamanho={18} />
              </span>
              <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">{a.texto}</p>
              <Link
                href={a.href}
                prefetch={false}
                aria-label={a.acao}
                className="btn-quiet h-11 shrink-0 !px-3 !py-0 !text-[14px] sm:!px-4"
              >
                <span className="hidden sm:inline">{a.acao}</span>
                <Icone nome="direita" tamanho={18} className="sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
