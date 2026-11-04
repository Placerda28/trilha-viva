import CodigoLink from './CodigoLink'

const STATUS = {
  ativo: { texto: 'Ativo', marca: 'bg-ink' },
  pendente: { texto: 'Em análise', marca: 'border-2 border-ink bg-transparent' },
  suspenso: { texto: 'Suspenso', marca: 'bg-signal' },
}

// Quem já é afiliado. Hoje: código, link e status. As abas da seção 6.3 (Início,
// Minhas vendas, Meus ganhos, Saques, Dados Pix, Como funciona) entram abaixo do
// cartão na Fase 5, sem mexer nesta peça: é só trocar a nota "chega em breve".
export default function AfiliadoPainel({ nome, codigo, link, status, emailSuporte }) {
  const st = STATUS[status] || STATUS.pendente
  const primeiroNome = String(nome || '').trim().split(' ')[0]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-d2 text-ink">{primeiroNome ? `Olá, ${primeiroNome}` : 'Sua conta de afiliado'}</h1>
        <p className="inline-flex items-center gap-2.5 border border-line bg-white px-3.5 py-2 text-[14px] font-semibold text-ink">
          <span className={`h-2.5 w-2.5 ${st.marca}`} aria-hidden="true" />
          <span>
            <span className="sr-only">Situação: </span>
            {st.texto}
          </span>
        </p>
      </div>

      {status === 'pendente' && (
        <p role="status" className="mt-6 rounded border border-line bg-white px-4 py-3 text-[15px] leading-[1.6] text-ink">
          Seu cadastro está em análise. Você recebe um e-mail quando for aprovado.
        </p>
      )}
      {status === 'suspenso' && (
        <p role="alert" className="mt-6 rounded border border-signal/30 bg-signal-wash px-4 py-3 text-[15px] leading-[1.6] text-ink">
          Sua conta de afiliado está suspensa.
          {emailSuporte ? (
            <>
              {' '}
              Fale com a gente em{' '}
              <a href={`mailto:${emailSuporte}`} className="link-quiet font-semibold">
                {emailSuporte}
              </a>
              .
            </>
          ) : null}
        </p>
      )}

      <CodigoLink codigo={codigo} link={link} className="mt-8" />

      <div className="card-line mt-8 px-6 py-6 sm:px-8">
        <p className="text-[17px] font-bold text-ink">Seu painel completo chega em breve.</p>
        <p className="mt-2 max-w-text text-[15px] leading-[1.65] text-ink-muted">
          Vendas, ganhos do mês e pedidos de saque vão aparecer aqui. Enquanto isso, divulgue o link: cada compra feita
          por ele fica registrada no seu nome.
        </p>
      </div>
    </div>
  )
}
