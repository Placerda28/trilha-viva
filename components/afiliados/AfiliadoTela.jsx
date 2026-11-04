import AfiliadoPainel from './AfiliadoPainel'
import CadastroAfiliado from './CadastroAfiliado'
import CriarContaAfiliado from './CriarContaAfiliado'
import EscadaNiveis from './EscadaNiveis'
import { reais } from '@/lib/afiliados-campos'

export const ENTRAR_E_VOLTAR = '/entrar?volta=%2Fminha-conta%2Fafiliado'

const PASSOS = [
  'Crie sua conta e escolha seu código de afiliado.',
  'Divulgue o seu link. Quem comprar por ele paga o preço normal, e a venda fica registrada no seu nome.',
  'Receba o que você ganhou por Pix.',
]

function Visitante({ niveis, aberto }) {
  const maior = niveis.length ? Math.max(...niveis.map((n) => n.valor_por_venda_centavos)) : 0
  return (
    <>
      <section className="bg-ink text-white">
        <div className="shell pb-16 pt-14 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
            <div>
              <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white [text-wrap:balance] sm:text-d2">
                {maior
                  ? `Indique a Trilha Viva e ganhe até ${reais(maior)} por venda.`
                  : 'Indique a Trilha Viva e ganhe por cada venda.'}
              </h1>
              <p className="mt-6 max-w-xl text-[18px] leading-[1.65] text-white/70">
                Você ganha um código de afiliado e um link. Quem comprar pelo seu link paga o preço normal, e a venda fica
                registrada no seu nome.
              </p>
              <a href={ENTRAR_E_VOLTAR} className="btn-onink mt-8 min-h-12 w-full sm:w-auto">
                Já tenho conta: entrar
              </a>
            </div>
            {aberto ? (
              <CriarContaAfiliado />
            ) : (
              <div role="status" className="bg-white p-7 text-ink sm:p-9">
                <p className="text-[22px] font-bold tracking-[-0.015em]">Cadastros encerrados no momento</p>
                <p className="mt-3 text-[15.5px] leading-[1.65] text-ink-muted">
                  O programa não está aceitando novos afiliados agora. Quem já tem conta pode entrar normalmente.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="shell grid gap-12 pt-14 lg:grid-cols-2 lg:gap-16 lg:pt-20">
        {niveis.length > 0 && (
          <section aria-labelledby="escada-titulo">
            <h2 id="escada-titulo" className="text-d3 text-ink">
              Quanto você ganha por venda
            </h2>
            <EscadaNiveis niveis={niveis} className="mt-8 max-w-md" />
          </section>
        )}
        <section aria-labelledby="como-titulo">
          <h2 id="como-titulo" className="text-d3 text-ink">
            Como funciona
          </h2>
          <ol className="mt-8 max-w-md space-y-6">
            {PASSOS.map((p, i) => (
              <li key={p} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="figs text-[22px] font-extrabold leading-[1.3] text-ink">{i + 1}</span>
                <p className="font-read text-[17.5px] leading-[1.6] text-ink-muted">{p}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}

// A tela inteira de /minha-conta/afiliado. A página só busca os dados e escolhe
// o estado; o protótipo monta esta mesma peça com dados falsos.
//   visitante: sem login   cadastro: logado, ainda não é afiliado   afiliado: já é
export default function AfiliadoTela({ estado, niveis = [], aberto = true, nome = '', afiliado = null, emailSuporte = '', painel = {} }) {
  if (estado === 'visitante') return <Visitante niveis={niveis} aberto={aberto} />
  return (
    <div className={`shell max-w-5xl pb-24 ${estado === 'afiliado' ? 'pt-10 sm:pt-14' : 'pt-14'}`}>
      {estado === 'afiliado' ? (
        <AfiliadoPainel nome={nome} {...afiliado} emailSuporte={emailSuporte} {...painel} />
      ) : (
        <CadastroAfiliado nomeInicial={nome} niveis={niveis} aberto={aberto} />
      )}
    </div>
  )
}
