import { Botao, BotaoCompra, EmBreve, Icone, MolduraAccent } from './ds'
import { LogoMark } from './Logo'
import { priceBRL, site } from '@/lib/site'
import { PALCO_PRECO_MENSAL, textoLancamento } from '@/lib/palco'

// Bloco de preço (MUDANÇAS §3 e §4): o pacote em destaque, na moldura preta com
// o traço vermelho, e o Palco como complemento ao lado ("Depois: o Palco").
// O pacote sempre vem antes do Palco.
//
//   <BlocoPreco palco={palcoEstado()} />                       // visitante (página estática)
//   <BlocoPreco usuario="com-pacote" palco="lancado" />        // quem já tem: "As 2.000 VS já são suas."
//
// Server component. `usuario` só muda o texto e o botão: páginas estáticas
// passam o padrão ('visitante'); para trocar pelo estado real use useUsuario()
// (components/usuario.js) num wrapper de cliente. `palco` e `lancamento` vêm de
// lib/palco.js (`palcoEstado()` e `textoLancamento()`).

export const INCLUSO_PADRAO = [
  'Mais de 2.000 multitracks gospel (VS)',
  'Clique e guia em canais separados',
  'Bateria, baixo, teclado, guitarra, pads, sopros e vocais isolados',
  'Arquivos em WAV e MP3, organizados por música',
  'Preparado para transposição de tom',
  'Compatível com REAPER, Ableton, Prime e tablet',
  'Acesso vitalício, com até 30 downloads por dia',
  'Novas trilhas somadas ao acervo',
  'Suporte por e-mail para configurar o seu setup',
]

const TITULO_PEQUENO = 'text-[13px] font-semibold uppercase tracking-[0.08em]'
const TITULO_GRANDE = 'font-semi-condensed font-[800] leading-none tracking-[-0.02em] tabular-nums'

export default function BlocoPreco({
  usuario = 'visitante',
  palco = 'em-breve',
  lancamento,
  incluso = INCLUSO_PADRAO,
  idComprar = 'comprar',
  className = '',
}) {
  const tem = usuario === 'com-pacote'
  const emBreve = palco !== 'lancado'

  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div className="flex flex-wrap items-stretch gap-6">
        <MolduraAccent
          id={idComprar}
          className="flex flex-[2_1_520px] flex-col gap-7 p-[clamp(20px,4cqi,40px)]"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
            <div className="flex flex-col gap-1.5">
              <p className={`${TITULO_PEQUENO} text-text-3`}>Pacote 2.000 VS</p>
              {tem ? (
                <>
                  <span className="font-semi-condensed text-[clamp(30px,5cqi,40px)] font-[750] leading-[1.05] tracking-[-0.015em]">
                    As 2.000 VS já são suas.
                  </span>
                  <span className="text-[16px] text-text-2">Acesso vitalício, até 30 downloads por dia.</span>
                </>
              ) : (
                <>
                  <span className="text-[16px] text-text-4 line-through tabular-nums">de {priceBRL(site.fullPrice)}</span>
                  <span className={`${TITULO_GRANDE} text-[clamp(48px,9cqi,72px)]`}>{priceBRL(site.price)}</span>
                  <span className="text-[16px] text-text-2">pagamento único, acesso vitalício</span>
                </>
              )}
            </div>
            <div className="flex max-w-[340px] flex-[1_1_240px] flex-col gap-2.5">
              {tem ? (
                <Botao href="/minha-conta/acervo" tamanho="lg" bloco>
                  Abrir Minhas VS
                </Botao>
              ) : (
                <>
                  <BotaoCompra bloco />
                  <p className="text-center text-[14px] leading-[1.45] text-text-3">
                    Pix ou cartão em até 12x pelo Mercado Pago. Garantia de 7 dias.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <h3 className="text-[17px] font-[650]">Está tudo incluso</h3>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-8 gap-y-2.5">
              {incluso.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-[1.45]">
                  <Icone nome="check" tamanho={18} className="mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </MolduraAccent>

        <aside className="flex flex-[1_1_260px] flex-col gap-3 bg-surface p-[clamp(20px,3cqi,28px)]">
          <div className="flex flex-wrap items-center gap-2.5">
            <LogoMark size={24} tone="ink" />
            <span className={`${TITULO_PEQUENO} text-text-3`}>Depois: o Palco</span>
            {emBreve && <EmBreve />}
          </div>
          <h3 className="font-semi-condensed text-[22px] font-bold leading-[1.15]">Toque essas VS no culto com o Palco</h3>
          <p className="text-[15px] leading-[1.5] text-text-2 [text-wrap:pretty]">
            Programa para Windows com clique e guia no fone, partes da música, pad e setlist. Funciona sem internet.
          </p>
          <p className="text-[15px] font-semibold leading-[1.5]">Tem o pacote? As 2.000 VS já aparecem no Palco.</p>
          {emBreve ? (
            <>
              <p className="text-[14px] text-text-3">{textoLancamento(lancamento)}</p>
              <Botao variante="link" href="/palco#lista-de-espera" className="self-start font-semibold">
                Entrar na lista de espera
              </Botao>
            </>
          ) : (
            <>
              <p className="text-[14px] leading-[1.5] text-text-2">
                <strong className="font-[650] text-ink tabular-nums">{PALCO_PRECO_MENSAL} por mês</strong> no cartão.{' '}
                {tem ? 'Você testa 7 dias grátis.' : 'Teste grátis de 7 dias para quem tem o pacote.'}
              </p>
              <Botao variante="link" href="/palco" className="self-start font-semibold">
                Conhecer o Palco
              </Botao>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
