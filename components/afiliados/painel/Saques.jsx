'use client'

import { reais } from '@/lib/afiliados-campos'
import { dataBr, diaMes } from '@/lib/afiliados-painel'
import Ajuda from './Ajuda'
import { useDados } from './api'
import { Carregando, Falhou } from './Carregando'
import { ROTULO_SAQUE, Selo } from './Situacao'

// O download do comprovante só existe a partir da Fase 7. Até lá `temComprovante`
// vem sempre falso e o botão fica desligado, dizendo por quê.
function Comprovante({ s }) {
  if (s.status !== 'pago') return null
  if (s.temComprovante) {
    return (
      <a href={`/api/afiliados/saques/${s.id}/comprovante`} className="btn-quiet mt-3 min-h-11 px-5 py-3 text-[14.5px]">
        Baixar comprovante
      </a>
    )
  }
  return (
    <button type="button" disabled className="btn mt-3 min-h-11 cursor-not-allowed border border-line bg-paper px-5 py-3 text-[14.5px] text-ink-muted">
      Baixar comprovante: disponível em breve
    </button>
  )
}

function Linha({ s }) {
  return (
    <li className="py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="figs text-[24px] font-extrabold leading-none text-ink">{reais(s.valor_centavos)}</p>
          <p className="mt-2 text-[14px] text-ink-muted">
            Pedido em {dataBr(s.pedido_em)}
            {s.status === 'pago' && s.pago_em ? ` · pago em ${dataBr(s.pago_em)}` : ''}
          </p>
        </div>
        <Selo chave={s.status} texto={ROTULO_SAQUE[s.status] || s.status} className="shrink-0" />
      </div>
      {s.status === 'recusado' && s.nota && (
        <p className="mt-3 rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[14.5px] leading-[1.55] text-ink">
          <strong>Motivo:</strong> {s.nota}
        </p>
      )}
      <Comprovante s={s} />
    </li>
  )
}

export default function Saques() {
  const { dados, erro, carregando, recarregar } = useDados('/api/afiliados/saques')
  if (carregando && !dados) return <Carregando />
  if (erro) return <Falhou onTentar={recarregar} />
  const proximo = dados.proximoSaqueEm
  const aberto = dados.itens.some((x) => x.status === 'solicitado')
  return (
    <div className="space-y-5">
      <div className="card-cut px-5 py-6 sm:px-8">
        <h2 className="text-[17px] font-bold text-ink">
          {aberto ? 'Você tem um saque em análise' : proximo ? `Próximo saque liberado em ${diaMes(proximo)}` : 'Você já pode pedir um saque'}{' '}
          <Ajuda titulo="Intervalo entre saques">
            <p>Para o pagamento ficar organizado, só dá para pedir um saque por vez e há um intervalo entre um pedido e o seguinte.</p>
          </Ajuda>
        </h2>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-muted">
          {aberto ? 'Você pode pedir outro depois que ele for pago.' : proximo ? 'Até lá o valor continua guardado e disponível para você.' : 'O pedido é feito na aba Início, no cartão Disponível para sacar.'}
        </p>
      </div>

      {dados.itens.length === 0 ? (
        <div className="card-line px-5 py-10 text-center">
          <p className="text-[17px] font-bold text-ink">Você ainda não pediu nenhum saque.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-[1.55] text-ink-muted">Quando pedir, o acompanhamento aparece aqui.</p>
        </div>
      ) : (
        <ul className="card-line divide-y divide-line px-5 sm:px-8" aria-label="Seus saques">
          {dados.itens.map((s) => (
            <Linha key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  )
}
