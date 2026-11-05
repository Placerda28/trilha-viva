'use client'

import { useState } from 'react'
import { moeda } from '../../formato'
import { Campo, classeCampo } from '../lista/Pecas'
import { AJUSTE_MAX, reaisParaCentavos } from '../afiliadosUtil'
import GavetaAcao from './GavetaAcao'

// Lançar ajuste manual: soma ou desconta do saldo. O sinal vem de dois botões
// (somar / descontar) e o valor é sempre positivo no campo; o servidor recebe
// o número com sinal. O motivo é obrigatório e vai para o histórico.

function Sentido({ valor, aoMudar }) {
  const opcoes = [
    ['soma', 'Somar ao saldo'],
    ['desconto', 'Descontar do saldo'],
  ]
  return (
    <div role="radiogroup" aria-label="Tipo de ajuste" className="grid grid-cols-2 gap-2">
      {opcoes.map(([id, rotulo]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={valor === id}
          onClick={() => aoMudar(id)}
          className={
            'min-h-11 rounded border px-3 py-2 text-[14.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ' +
            (valor === id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink')
          }
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

export default function Ajuste({ a, disponivel, aoFechar, aoMudou }) {
  const [sentido, setSentido] = useState('soma')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const centavos = reaisParaCentavos(valor)
  const t = motivo.trim()
  const erroValor =
    centavos === null || centavos === 0
      ? 'Digite um valor em reais, como 25 ou 25,50.'
      : centavos > AJUSTE_MAX
        ? 'O limite de um ajuste é R$ 100.000,00.'
        : ''
  const erroMotivo = t.length < 3 ? 'Escreva o motivo, com pelo menos 3 letras.' : t.length > 300 ? 'O motivo tem no máximo 300 letras.' : ''
  const negativo = sentido === 'desconto'
  const passaDoSaldo = negativo && !erroValor && Number.isFinite(disponivel) && centavos > disponivel

  return (
    <GavetaAcao
      id={a.id}
      acao="ajuste"
      titulo="Lançar ajuste manual"
      tituloFeito="Ajuste lançado"
      descricao={`${a.nome}, código ${a.codigo}.`}
      rotulo="Lançar ajuste"
      perigo={negativo}
      corpo={erroValor || erroMotivo ? null : { valor_centavos: negativo ? -centavos : centavos, motivo: t }}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={(d) => (
        <p className="text-[15px] leading-[1.55] text-ink">
          O ajuste foi lançado. O disponível de {a.nome} agora é <strong className="figs">{moeda(d.disponivel_centavos)}</strong>.
        </p>
      )}
    >
      {(tocou) => (
        <>
          <p className="text-[15px] leading-[1.55] text-ink">
            Corrige o saldo à mão, por exemplo depois de um erro de pagamento. O ajuste não conta como venda e não muda o nível.
            {Number.isFinite(disponivel) && (
              <>
                {' '}
                Disponível agora: <strong className="figs">{moeda(disponivel)}</strong>.
              </>
            )}
          </p>
          <Sentido valor={sentido} aoMudar={setSentido} />
          <Campo id="ajuste-valor" rotulo="Valor em reais" erro={tocou ? erroValor : ''}>
            <input
              id="ajuste-valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-invalid={Boolean(tocou && erroValor)}
              className={classeCampo(tocou && erroValor) + ' figs'}
            />
          </Campo>
          {negativo && (
            <p role="note" className="border-l-2 border-signal pl-3 text-[14.5px] leading-[1.55] text-ink">
              <strong>Ajuste negativo pode deixar o disponível negativo.</strong> Enquanto o saldo não voltar a ser positivo, o afiliado não consegue sacar.
              {passaDoSaldo && <> Esse valor é maior que o disponível de hoje, então o saldo vai ficar negativo.</>}
            </p>
          )}
          <Campo id="ajuste-motivo" rotulo="Motivo" ajuda="Fica no histórico de ações." erro={tocou ? erroMotivo : ''}>
            <textarea
              id="ajuste-motivo"
              rows={3}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(tocou && erroMotivo)}
              className={classeCampo(tocou && erroMotivo) + ' resize-y'}
            />
          </Campo>
        </>
      )}
    </GavetaAcao>
  )
}
