import CodigoLink from './CodigoLink'
import EscadaNiveis from './EscadaNiveis'

// Tela depois do cadastro: o código e o link primeiro, a escada de metas em
// seguida. Sem estado próprio, para a página de protótipo montar com dados falsos.
export default function CadastroConcluido({ codigo, link, status, niveis }) {
  const emAnalise = status === 'pendente'
  return (
    <div role="status">
      <h1 className="text-d2 text-ink [text-wrap:balance]">
        {emAnalise ? 'Cadastro recebido.' : 'Pronto, você é afiliado.'}
      </h1>
      <p className="mt-4 max-w-text font-read text-[18px] leading-[1.7] text-ink-muted">
        {emAnalise
          ? 'Seu cadastro está em análise. Você recebe um e-mail quando for aprovado.'
          : 'Divulgue o link abaixo. Cada compra feita por ele fica registrada no seu nome.'}
      </p>

      <CodigoLink codigo={codigo} link={link} className="mt-8" />

      <section className="card-cut mt-8 bg-white px-6 py-7 sm:px-8" aria-labelledby="escada-titulo">
        <h2 id="escada-titulo" className="text-d3 text-ink">
          Quanto você ganha por venda
        </h2>
        <EscadaNiveis niveis={niveis} className="mt-6" />
      </section>
    </div>
  )
}
