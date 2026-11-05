import CodigoLink, { BotaoCopiar } from '../CodigoLink'
import EscadaNiveis from '../EscadaNiveis'

const PASSOS = [
  ['Copie o seu link', 'É o botão "Copiar" no painel preto abaixo. O seu código já vai dentro dele.'],
  ['Divulgue', 'Mande para quem toca em banda, igreja ou ministério: no WhatsApp, no Instagram, onde você conversa com eles.'],
  ['Acompanhe aqui', 'Cada compra feita pelo seu link aparece nesta tela, e o valor do mês cresce com as vendas.'],
]

// Afiliado novo, sem nenhuma venda: em vez de zeros, o caminho da primeira venda.
export default function InicioVazio({ d, codigo, link, primeiroNome }) {
  return (
    <div className="space-y-8">
      <section className="card-cut px-5 py-7 sm:px-8 sm:py-8" aria-labelledby="vazio-titulo">
        <h2 id="vazio-titulo" className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[32px]">
          {primeiroNome ? `Bem-vindo, ${primeiroNome}.` : 'Bem-vindo.'} Falta só a primeira venda.
        </h2>
        <p className="mt-3 max-w-text text-[16.5px] leading-[1.65] text-ink-muted">
          Sua conta está pronta. Assim que alguém comprar pelo seu link, o seu painel começa a se encher: vendas, nível do mês e quanto você já pode sacar.
        </p>
        <ol className="mt-7 space-y-5">
          {PASSOS.map(([titulo, texto], i) => (
            <li key={titulo} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="figs text-[22px] font-extrabold leading-[1.25] text-ink">{i + 1}</span>
              <div>
                <p className="text-[17px] font-bold text-ink">{titulo}</p>
                <p className="mt-0.5 text-[15.5px] leading-[1.6] text-ink-muted">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div>
        <CodigoLink codigo={codigo} link={link} />
        <div className="card-line mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
          <p className="min-w-0 flex-1 basis-60 text-[15px] leading-[1.55] text-ink">
            <strong className="font-bold">No Instagram</strong>, cole o link na bio ou no adesivo de link dos Stories. O Instagram não deixa enviar link
            direto, então a gente copia para você.
          </p>
          <BotaoCopiar texto={link} rotulo="o link para o Instagram" titulo="Copiar link" claro />
        </div>
      </div>

      <section className="card-line px-5 py-7 sm:px-8" aria-labelledby="vazio-escada">
        <h2 id="vazio-escada" className="text-d3 text-ink">
          Quanto você ganha por venda
        </h2>
        <EscadaNiveis niveis={d.niveis} comSelo className="mt-7 max-w-md" />
      </section>
    </div>
  )
}
