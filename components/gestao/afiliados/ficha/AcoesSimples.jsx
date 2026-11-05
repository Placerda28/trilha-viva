'use client'

import { useState } from 'react'
import { Campo, classeCampo } from '../lista/Pecas'
import GavetaAcao from './GavetaAcao'

// As ações curtas da ficha: aprovar, reativar, suspender, anotar e travar nível.
// Todas usam a GavetaAcao; cada uma só diz quais campos tem e o que mostrar depois.

const Texto = ({ children }) => <p className="text-[15px] leading-[1.55] text-ink">{children}</p>

export function Aprovar({ a, aoFechar, aoMudou }) {
  return (
    <GavetaAcao
      id={a.id}
      acao="aprovar"
      titulo="Aprovar cadastro"
      tituloFeito="Cadastro aprovado"
      descricao={`${a.nome}, código ${a.codigo}.`}
      rotulo="Aprovar cadastro"
      corpo={{}}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={(d) => (
        <Texto>
          {a.nome} agora está ativo.{' '}
          {d.email_enviado ? 'O e-mail avisando da aprovação foi enviado.' : 'O e-mail de aviso não saiu. Avise essa pessoa por outro meio.'}
        </Texto>
      )}
    >
      {() => <Texto>Ele passa a ficar ativo e recebe um e-mail avisando que o cadastro foi aprovado.</Texto>}
    </GavetaAcao>
  )
}

export function Reativar({ a, aoFechar, aoMudou }) {
  return (
    <GavetaAcao
      id={a.id}
      acao="reativar"
      titulo="Reativar afiliado"
      tituloFeito="Afiliado reativado"
      descricao={`${a.nome}, código ${a.codigo}.`}
      rotulo="Reativar"
      corpo={{}}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={() => <Texto>{a.nome} voltou a ficar ativo.</Texto>}
    >
      {() => <Texto>Ele volta de suspenso para ativo. A ação fica no histórico.</Texto>}
    </GavetaAcao>
  )
}

export function Suspender({ a, aoFechar, aoMudou }) {
  const [motivo, setMotivo] = useState('')
  const t = motivo.trim()
  const erro = t.length < 3 ? 'Escreva o motivo, com pelo menos 3 letras.' : t.length > 500 ? 'O motivo tem no máximo 500 letras.' : ''
  return (
    <GavetaAcao
      id={a.id}
      acao="suspender"
      titulo="Suspender afiliado"
      tituloFeito="Afiliado suspenso"
      descricao={`${a.nome}, código ${a.codigo}.`}
      rotulo="Suspender"
      perigo
      corpo={erro ? null : { motivo: t }}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={() => <Texto>{a.nome} está suspenso. O motivo ficou no histórico de ações.</Texto>}
    >
      {(tocou) => (
        <>
          <Texto>Não manda e-mail. Se ele já pediu saque, o pedido continua na fila de Saques para você pagar ou recusar.</Texto>
          <Campo id="suspender-motivo" rotulo="Motivo" erro={tocou ? erro : ''}>
            <textarea
              id="suspender-motivo"
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-describedby={tocou && erro ? 'suspender-motivo-erro' : undefined}
              aria-invalid={Boolean(tocou && erro)}
              className={classeCampo(tocou && erro) + ' resize-y'}
            />
          </Campo>
        </>
      )}
    </GavetaAcao>
  )
}

export function Anotar({ a, aoFechar, aoMudou }) {
  const [texto, setTexto] = useState('')
  const t = texto.trim()
  const erro = !t ? 'Escreva a anotação.' : t.length > 1000 ? 'A anotação tem no máximo 1.000 letras.' : ''
  return (
    <GavetaAcao
      id={a.id}
      acao="anotar"
      titulo="Anotar"
      tituloFeito="Anotação salva"
      descricao="Só a equipe lê. O afiliado nunca vê."
      rotulo="Salvar anotação"
      corpo={erro ? null : { texto: t }}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={() => <Texto>A anotação foi salva na ficha de {a.nome}.</Texto>}
    >
      {(tocou) => (
        <Campo id="anotar-texto" rotulo="Anotação" erro={tocou ? erro : ''}>
          <textarea
            id="anotar-texto"
            rows={4}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-invalid={Boolean(tocou && erro)}
            className={classeCampo(tocou && erro) + ' resize-y'}
          />
        </Campo>
      )}
    </GavetaAcao>
  )
}

export function TravarNivel({ a, niveis, aoFechar, aoMudou }) {
  const atual = a.nivel_travado ? String(a.nivel_travado.id) : 'sem'
  const [escolha, setEscolha] = useState(atual)
  const igual = escolha === atual
  return (
    <GavetaAcao
      id={a.id}
      acao="travar_nivel"
      titulo="Travar nível"
      tituloFeito="Nível atualizado"
      descricao={`${a.nome}, código ${a.codigo}.`}
      rotulo={escolha === 'sem' ? 'Destravar nível' : 'Travar nível'}
      corpo={igual ? null : { nivel_id: escolha === 'sem' ? null : Number(escolha) }}
      aoFechar={aoFechar}
      aoMudou={aoMudou}
      resultado={(d) => (
        <Texto>{d.nivel_travado ? `${a.nome} ficou travado no nível ${d.nivel_travado.nome}.` : `${a.nome} voltou a subir e descer de nível pelas vendas.`}</Texto>
      )}
    >
      {(tocou) => (
        <>
          <Texto>
            O nível travado vale na hora para o mês em andamento e para os próximos fechamentos, não importa quantas vendas ele faça. Só valem os níveis da tabela de hoje.
          </Texto>
          <Campo id="travar-nivel" rotulo="Nível" erro={tocou && igual ? 'Escolha um nível diferente do atual.' : ''}>
            <select id="travar-nivel" value={escolha} onChange={(e) => setEscolha(e.target.value)} className={classeCampo(tocou && igual)}>
              <option value="sem">Sem trava (nível pelas vendas)</option>
              {niveis.map((n) => (
                <option key={n.id} value={String(n.id)}>
                  {n.nome}
                </option>
              ))}
            </select>
          </Campo>
        </>
      )}
    </GavetaAcao>
  )
}
