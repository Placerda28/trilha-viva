'use client'

import { Suspense, useState } from 'react'
import { CabecalhoPagina } from '../../Casca'
import { Aviso, Esqueleto, Vazio } from '../../Estados'
import { dataHora } from '../../formato'
import { useGestao } from '../../useGestao'
import Confirmar from '../Confirmar'
import SubAbas from '../SubAbas'
import { GRAVIDADES, resumoGravidades, urlResolver } from '../painelUtil'
import AlertaLinha from './AlertaLinha'

// Gestão > Afiliados > Alertas: o que pode estar errado agora, do mais grave
// ao menos grave. O servidor calcula na hora (não depende do período). Cada
// alerta leva ao lugar onde se resolve e pode ser marcado como resolvido,
// depois de confirmar: só vale para aquele caso (o que se repete por mês volta
// no mês seguinte).

const FALHA = 'Não consegui marcar agora. Confira a internet e tente de novo.'

async function resolver(chave) {
  try {
    const res = await fetch(urlResolver(chave), { method: 'POST', cache: 'no-store' })
    const corpo = await res.json().catch(() => null)
    if (res.ok && corpo?.ok) return { erro: '', recarregar: true }
    if (res.status === 404 && corpo?.erro) return { erro: corpo.erro, recarregar: true }
    return { erro: res.status === 404 ? 'Sua sessão acabou. Entre de novo para continuar na gestão.' : corpo?.erro || FALHA, recarregar: false }
  } catch {
    return { erro: FALHA, recarregar: false }
  }
}

function Conteudo() {
  const [tentativa, setTentativa] = useState(0)
  const [alvo, setAlvo] = useState(null)
  const { dados, erro, carregando } = useGestao('/api/gestao/afiliados/alertas', tentativa)

  const confirmar = async () => {
    const r = await resolver(alvo.chave)
    if (r.recarregar) setTentativa((n) => n + 1)
    return r.erro
  }

  if (erro) return <Aviso erro={erro} onTentar={() => setTentativa((n) => n + 1)} />
  if (!dados) return <Esqueleto linhas={4} />

  const resumo = resumoGravidades(dados.por_gravidade)
  return (
    <div className={'transition-opacity duration-150 ' + (carregando ? 'opacity-60' : '')}>
      <p className="figs mb-3 text-[13.5px] text-ink-muted">Calculado em {dataHora(dados.gerado_em)}</p>
      {dados.alertas.length === 0 ? (
        <Vazio titulo="Nenhum alerta aberto" texto="Está tudo em ordem por enquanto. Os alertas aparecem aqui quando algo precisar da sua atenção." />
      ) : (
        <>
          <p role="status" className="text-[15px] text-ink">
            <span className="figs font-bold">{dados.total}</span> {dados.total === 1 ? 'alerta aberto' : 'alertas abertos'}
            {resumo.length > 0 && <span className="text-ink-muted">: {resumo.map((g) => g.n + ' de gravidade ' + g.rotulo.toLowerCase()).join(', ')}</span>}
          </p>
          {GRAVIDADES.map((g) => {
            const lista = dados.alertas.filter((a) => a.gravidade === g.id)
            if (lista.length === 0) return null
            return (
              <section key={g.id} aria-labelledby={'grav-' + g.id} className="mt-5">
                <h2 id={'grav-' + g.id} className="text-[16px] font-bold tracking-[-0.01em] text-ink">
                  {g.titulo} <span className="figs font-semibold text-ink-muted">({lista.length})</span>
                </h2>
                <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-white">
                  {lista.map((a) => (
                    <AlertaLinha key={a.chave} alerta={a} alta={g.id === 'alta'} aoResolver={setAlvo} />
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}
      <Confirmar
        aberto={Boolean(alvo)}
        aoMudar={(v) => !v && setAlvo(null)}
        titulo="Marcar como resolvido?"
        texto={alvo ? alvo.texto : ''}
        rotulo="Marcar como resolvido"
        aoConfirmar={confirmar}
      />
    </div>
  )
}

export default function Alertas() {
  return (
    <section aria-label="Alertas dos afiliados">
      <CabecalhoPagina titulo="Alertas dos afiliados" texto="O que pode estar errado agora. Resolva no lugar indicado e marque o alerta como resolvido." />
      <Suspense fallback={null}>
        <SubAbas atual="alertas" />
      </Suspense>
      <Conteudo />
    </section>
  )
}
