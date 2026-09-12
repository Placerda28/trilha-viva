import { redirect } from 'next/navigation'
import { clienteAtual, temCompra } from '@/lib/sessao'
import { usoDeHoje, POR_DIA, quandoVolta } from '@/lib/cota'
import { b2Configurado } from '@/lib/b2'
import { acervoPronto } from '@/lib/arquivos'
import SairBotao from '@/components/SairBotao'
import AcervoLista from '@/components/AcervoLista'

export const runtime = 'nodejs'
// Lê o cookie da sessão, então é montada a cada visita. Por isso o que ela
// desenha aqui é pequeno: a lista das 720 músicas é montada no navegador.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Meu acervo',
  description: 'Sua área de downloads do acervo Trilha Viva.',
  robots: { index: false, follow: false },
}

const AVISOS = {
  cota: null, // texto montado com a hora, mais abaixo
  suspenso: 'Este acesso está suspenso. Fale com o suporte.',
  'sem-compra': 'Não encontramos uma compra nesta conta.',
  preparando: 'O acervo ainda está sendo preparado. Volte em breve.',
  'nao-encontrada': 'Não encontrei essa música. Se o link veio de algum lugar, avise o suporte.',
  'sem-arquivo': 'Essa música está sem arquivo no momento. Avise o suporte.',
  falhou: 'Não consegui abrir esse arquivo agora. Tente de novo em instantes.',
}

export default async function AcervoPage({ searchParams }) {
  const cliente = await clienteAtual()
  if (!cliente) redirect('/entrar?expirou=1')

  const comprou = await temCompra(cliente.id)
  // O acervo so aparece quando o mapa existe no balde. Antes disso a lista
  // seria uma parede de botoes que nao entregam nada.
  const pronto = comprou && b2Configurado() ? await acervoPronto() : false
  const uso = await usoDeHoje(cliente.id)
  const primeiroNome = String(cliente.nome || '').split(' ')[0]

  const params = (await searchParams) || {}
  const chave = String(params.aviso || '')
  const aviso =
    chave === 'cota'
      ? 'Você já baixou ' +
        POR_DIA +
        ' músicas hoje. O limite volta ' +
        quandoVolta() +
        '. O acervo é seu para sempre — não precisa correr.'
      : AVISOS[chave] || ''

  return (
    <div className="shell max-w-4xl pb-24 pt-14">
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

      {aviso && (
        <p
          role="alert"
          className="mt-8 rounded border-l-4 border-signal bg-signal-wash px-4 py-3 text-[14.5px] text-ink"
        >
          {aviso}
        </p>
      )}

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
      ) : !pronto ? (
        <div className="card-cut mt-10 bg-white px-6 py-7">
          <h2 className="text-[19px] font-bold text-ink">Acervo em preparação</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Seu acesso está confirmado e é vitalício. As músicas estão sendo transferidas para o
            servidor de downloads — assim que terminar, a lista completa aparece aqui. Você recebe um
            e-mail quando estiver liberado.
          </p>
        </div>
      ) : (
        <AcervoLista restam={uso.restam} limite={uso.limite} />
      )}

      <p className="mt-10 text-[13px] leading-relaxed text-ink-faint">
        São {POR_DIA} downloads por dia, renovando à meia-noite — o limite protege o acervo de cópia
        em massa, não o seu ministério. Este acesso é pessoal; compartilhar a senha pode suspender a
        conta, conforme os{' '}
        <a href="/termos" className="link-quiet font-semibold">
          termos de uso
        </a>
        .
      </p>
    </div>
  )
}
