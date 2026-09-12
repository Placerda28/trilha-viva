import { redirect } from 'next/navigation'
import { clienteAtual, temCompra } from '@/lib/sessao'
import { usoDeHoje, POR_DIA } from '@/lib/cota'
import SairBotao from '@/components/SairBotao'

export const runtime = 'nodejs'
// Lê o cookie da sessão, então é montada a cada visita. Por isso ela é
// propositalmente pequena: nenhuma lista grande é desenhada aqui.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Meu acervo',
  description: 'Sua área de downloads do acervo Trilha Viva.',
  robots: { index: false, follow: false },
}

export default async function AcervoPage() {
  const cliente = await clienteAtual()
  if (!cliente) redirect('/entrar?expirou=1')

  const comprou = await temCompra(cliente.id)
  const uso = await usoDeHoje(cliente.id)
  const primeiroNome = String(cliente.nome || '').split(' ')[0]

  return (
    <div className="shell max-w-3xl pb-24 pt-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Sua conta
          </p>
          <h1 className="mt-3 font-bold text-[32px] leading-[1.12] text-ink sm:text-[38px]">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Meu acervo'}
          </h1>
          <p className="mt-2 text-[14px] text-ink-muted">{cliente.email}</p>
        </div>
        <SairBotao />
      </div>

      {!comprou ? (
        <div className="card-cut mt-10 bg-white px-6 py-7">
          <h2 className="text-[19px] font-bold text-ink">Não encontramos uma compra nesta conta</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Se você acabou de pagar, a confirmação pode levar alguns instantes — atualize esta
            página. Se pagou com outro e-mail, entre com aquele endereço.
          </p>
          <a href="/assinar" className="btn-signal mt-6 inline-block">
            Ver o acervo completo
          </a>
        </div>
      ) : (
        <>
          <div className="card-cut mt-10 bg-white px-6 py-7">
            <h2 className="text-[19px] font-bold text-ink">Acervo em preparação</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Seu acesso está confirmado e é vitalício. As músicas estão sendo transferidas para o
              servidor de downloads agora — assim que terminar, a lista completa aparece aqui, com
              um botão de baixar em cada faixa.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              Você vai receber um e-mail assim que estiver liberado. Não precisa fazer nada.
            </p>
          </div>

          <div className="card-line mt-6 px-6 py-5">
            <p className="text-[13px] font-semibold text-ink">Seu limite diário</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              São <strong className="text-ink">{POR_DIA} músicas por dia</strong>, renovando à
              meia-noite. Hoje você usou {uso.usados} de {uso.limite}. O limite existe para proteger
              o acervo de cópia em massa — não para limitar o seu ministério.
            </p>
          </div>
        </>
      )}

      <p className="mt-8 text-[13px] leading-relaxed text-ink-faint">
        Este acesso é pessoal, para você e sua equipe de louvor. Compartilhar a senha pode suspender
        a conta, conforme os{' '}
        <a href="/termos" className="link-quiet font-semibold">
          termos de uso
        </a>
        .
      </p>
    </div>
  )
}
